const Engine = require('../lib/engine');
const _ = require('underscore');

describe('where join udf test Tests', () => {
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

    test('join baseline without UDF', async () => {
        const script = `u = require("./test/udfs/upper.js");
                       a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},
                             {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},
                             {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];
                       a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},
                             {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];
                       return select a2.details as details from a1 as a1, a2 as a2 where a1.name = a2.name`;
        
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
                            reject(new Error('Join baseline test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(results).toBeDefined();
                        expect(results.body).toBeDefined();
                        expect(Array.isArray(results.body)).toBe(true);
                        expect(results.body.length).toBe(2);
                        
                        // Check the joined results
                        expect(results.body[0]).toBeDefined();
                        expect(results.body[0].details).toEqual([
                            { name: 'G3', count: 32 }, 
                            { name: 'G5', count: 18 }
                        ]);
                        expect(results.body[1]).toBeDefined();
                        expect(results.body[1].details).toEqual([
                            { name: 'G3', count: 32 }, 
                            { name: 'G5', count: 18 }
                        ]);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Join baseline error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});