const Engine = require('../lib/engine');
describe('jsonpath expr test Tests', () => {
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

    test('jsonpath expression with filter', async () => {
        const script = `obj = {
                            "prop" : [
                                {"name": "A", "price": "1.95"},
                                {"name": "B", "price": "2.95"},
                                {"name": "C", "price": "3.95"}
                            ]
                        };
                        return "{obj.prop[?(@.price > 2)]}";`;
        
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
                            reject(new Error('JSONPath expression test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.length).toBe(2);
                        expect(result.body[0]).toBeDefined();
                        expect(result.body[0].name).toBe('B');
                        expect(result.body[0].price).toBe('2.95');
                        expect(result.body[1]).toBeDefined();
                        expect(result.body[1].name).toBe('C');
                        expect(result.body[1].price).toBe('3.95');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('JSONPath expression error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});