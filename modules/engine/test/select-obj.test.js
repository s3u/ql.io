const Engine = require('../lib/engine');

describe('select obj test Tests', () => {
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

    test('should select all fields from object', async () => {
        const script = `
            foo = {
                "name": "test-object",
                "id": 123,
                "active": true
            };
            
            return select * from foo;
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
                            reject(new Error('Select star from object test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.name).toBe('test-object');
                        expect(result.body.id).toBe(123);
                        expect(result.body.active).toBe(true);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Select star from object error: ' + err.message));
                });
            });
        });
    });
    test('should select specific fields from object', async () => {
        const script = `
            foo = {
                "name": "test-object",
                "id": 123,
                "active": true,
                "description": "This is a test object"
            };
            
            return select name, id from foo;
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
                            reject(new Error('Select some from object test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // When selecting specific fields, result is returned as array
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body).toEqual([['test-object', 123]]);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Select some from object error: ' + err.message));
                });
            });
        });
    });
    test('should select one field from joined arrays', async () => {
        const script = `
            a1 = [{
                "name": "Name-A",
                "ns": "n1"
            }, {
                "name": "Name-B",
                "ns": "n2"
            }, {
                "name": "Name-C",
                "ns": "n3"
            }];
            
            a2 = [{
                "name": "Name-A",
                "ns": "n1"
            }, {
                "name": "Name-C",
                "ns": "n2"
            }];
            
            return select a1.name from a1 as a1, a2 as a2 where a1.name = a2.name;
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
                            reject(new Error('Select join one field test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body).toEqual([['Name-A'], ['Name-C']]);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Select join one field error: ' + err.message));
                });
            });
        });
    });
    test('should handle indexed references in select', async () => {
        const script = `
            a = {
                "items": ["item1", "item2", "item3"],
                "metadata": {
                    "count": 3,
                    "type": "array"
                }
            };
            
            return select a.items[0], a.metadata.count from a as a;
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
                            reject(new Error('Select indexed ref test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should access indexed and nested properties (returns as array)
                        expect(result.body).toEqual([['item1', 3]]);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Select indexed ref error: ' + err.message));
                });
            });
        });
    });
});