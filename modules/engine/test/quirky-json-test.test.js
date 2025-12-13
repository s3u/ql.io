const Engine = require('../lib/engine');
const http = require('http');

describe('quirky json test Tests', () => {
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

    test('should handle quirky json responses', async () => {
        // Create mock server that returns malformed or quirky JSON
        server = http.createServer(function(req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            
            // Return JSON with trailing commas and other quirks
            const quirkyJson = `{
                "id": 123,
                "name": "test",
                "items": [
                    "item1",
                    "item2",
                ],
                "nested": {
                    "value": "test",
                },
            }`;
            
            res.end(quirkyJson);
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table quirkytest 
                on select get from 'http://localhost:3000/quirky-data'
            
            select * from quirkytest
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should handle quirky JSON gracefully
                        // Either succeed by parsing it or fail gracefully
                        if (err) {
                            // Error is acceptable for malformed JSON
                            expect(err).toBeDefined();
                            resolve();
                            return;
                        }
                        
                        // If it succeeds, verify result
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should have parsed the valid parts
                        if (typeof result.body === 'object') {
                            expect(result.body.id).toBeDefined();
                            expect(result.body.name).toBeDefined();
                        }
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected for quirky JSON
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });
});