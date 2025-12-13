const Engine = require('../lib/engine');
const _ = require('underscore');

describe('offset limit test Tests', () => {
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

    test('limit-1', async () => {
        const script = `bar = [{"w":"ab","f":"ab","l":1},{"w":"ba","f":"ba","l":2},{"w":"cab","f":"cab","l":3}];
                       return select * from bar limit 1`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, results) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Limit-1 test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(results).toBeDefined();
                        expect(results.body).toBeDefined();
                        expect(results.body.length).toBe(1);
                        expect(results.body[0]).toEqual({
                            "w": "ab",
                            "f": "ab", 
                            "l": 1
                        });
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Limit-1 error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);

    test('limit-2', async () => {
        const script = `bar = [{"w":"ab","f":"ab","l":1},{"w":"ba","f":"ba","l":2},{"w":"cab","f":"cab","l":3}];
                       return select * from bar limit 2`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, results) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Limit-2 test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(results).toBeDefined();
                        expect(results.body).toBeDefined();
                        expect(results.body.length).toBe(2);
                        expect(results.body[0]).toEqual({
                            "w": "ab",
                            "f": "ab", 
                            "l": 1
                        });
                        expect(results.body[1]).toEqual({
                            "w": "ba",
                            "f": "ba", 
                            "l": 2
                        });
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Limit-2 error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);

    test('limit-2-offset-1', async () => {
        const script = `bar = [{"w":"ab","f":"ab","l":1},{"w":"ba","f":"ba","l":2},{"w":"cab","f":"cab","l":3}];
                       return select * from bar limit 2 offset 1`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, results) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Limit-2-offset-1 test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(results).toBeDefined();
                        expect(results.body).toBeDefined();
                        expect(results.body.length).toBe(2);
                        expect(results.body[0]).toEqual({
                            "w": "ba",
                            "f": "ba", 
                            "l": 2
                        });
                        expect(results.body[1]).toEqual({
                            "w": "cab",
                            "f": "cab", 
                            "l": 3
                        });
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Limit-2-offset-1 error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});