const Engine = require('../lib/engine');
const _ = require('underscore');
describe('loader ext test Tests', () => {
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

    test('show tables', async () => {
        const script = 'show tables';
        
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
                            reject(new Error('Show tables test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        // The tables directory should contain .ql files only
                        expect(result.body.length).toBeGreaterThan(0);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Show tables error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});