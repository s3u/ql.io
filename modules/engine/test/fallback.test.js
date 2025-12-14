const Engine = require('../lib/engine');
describe('fallback test Tests', () => {
    let engine;
    let server;

    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });

    afterEach(async () => {
        if (server && server.listening) {
            await new Promise((resolve) => {
                server.close(() => {
                    server = null;
                    setTimeout(resolve, 100);
                });
            });
        }
    });

    test('should use numeric fallback when table fails', async () => {
        const script = "return select * from foo || 10";
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            reject(new Error('Fallback number test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBe(10);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Fallback number error: ' + err.message));
                });
            });
        });
    });
    test('should use object fallback when table fails', async () => {
        const script = `return select * from foo || {
            "id": 1,
            "name": "fallback-object",
            "status": "default"
        }`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            reject(new Error('Fallback object test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.id).toBe(1);
                        expect(result.body.name).toBe("fallback-object");
                        expect(result.body.status).toBe("default");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Fallback object error: ' + err.message));
                });
            });
        });
    });
    test('should use variable reference as fallback', async () => {
        const script = `
            a = {
                "id": 42,
                "name": "reference-fallback",
                "type": "variable"
            };
            
            return select * from foo || a;
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            reject(new Error('Fallback reference test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.id).toBe(42);
                        expect(result.body.name).toBe("reference-fallback");
                        expect(result.body.type).toBe("variable");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Fallback reference error: ' + err.message));
                });
            });
        });
    });
    test('should handle fallback with dependencies', async () => {
        // Test fallback mechanism when main query depends on multiple variables
        const script = `
            data = [{
                "id": 1,
                "name": "item1"
            }, {
                "id": 2,
                "name": "item2"
            }];
            
            a = {"fallback": "value-a"};
            b = {"fallback": "value-b"};
            
            return select * from foo || data;
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            reject(new Error('Fallback dependency test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        // Should use the fallback data array
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(2);
                        expect(result.body[0].id).toBe(1);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Fallback dependency error: ' + err.message));
                });
            });
        });
    });
});