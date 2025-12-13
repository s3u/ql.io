const Engine = require('../lib/engine');

describe('delete test Tests', () => {
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

    test('delete from object', async () => {
        const script = `obj = {
                            "a" : "A",
                            "b" : "B",
                            "c" : "C"
                        };
                        return delete from obj where a = "A";`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Delete object test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.headers).toBeDefined();
                        expect(result.headers['content-type']).toBe('application/json');
                        expect(result.body).toBeDefined();
                        expect(result.body.a).toBeUndefined();
                        expect(result.body.b).toBe('B');
                        expect(result.body.c).toBe('C');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Delete object error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);

    test('delete from array with AND condition', async () => {
        const script = `arr = [
                            {"key" : 1, "color": "red"},
                            {"key" : 2, "color": "green"},
                            {"key" : 3, "color": "red"},
                            {"key" : 4}
                        ];
                        narr = delete from arr where key = 1 and color = "red";
                        return narr;`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Delete array AND test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.headers).toBeDefined();
                        expect(result.headers['content-type']).toBe('application/json');
                        expect(result.body).toBeDefined();
                        expect(result.body.length).toBe(3);
                        expect(result.body).toEqual([
                            {"key": 2, "color": "green"},
                            {"key": 3, "color": "red"},
                            {"key": 4}
                        ]);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Delete array AND error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);

    test('delete from array with multi-value condition', async () => {
        const script = `colors = ["red", "green"];
                        arr = [
                            {"key" : 1, "color": "red"},
                            {"key" : 2, "color": "green"},
                            {"key" : 3, "color": "red"},
                            {"key" : 4}
                        ];
                        narr = delete from arr where key = 1 and color = "{colors}";
                        return narr;`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Delete multi-value test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.headers).toBeDefined();
                        expect(result.headers['content-type']).toBe('application/json');
                        expect(result.body).toBeDefined();
                        expect(result.body.length).toBe(3);
                        expect(result.body).toEqual([
                            {"key": 2, "color": "green"},
                            {"key": 3, "color": "red"},
                            {"key": 4}
                        ]);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Delete multi-value error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});