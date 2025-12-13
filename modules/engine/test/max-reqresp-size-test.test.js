const Engine = require('../lib/engine');

describe('max reqresp size test Tests', () => {
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

    test('max request response size handling', async () => {
        const http = require('http');
        
        // Create mock server that serves large responses
        server = http.createServer(function(req, res) {
            // Create a large JSON response
            const largeData = {
                message: 'This is a large response',
                data: new Array(1000).fill(0).map((_, i) => ({
                    id: i,
                    name: `Item ${i}`,
                    description: `This is item number ${i} with some additional text to make it larger`,
                    metadata: {
                        created: new Date().toISOString(),
                        tags: [`tag${i}`, `category${i % 10}`, 'large-data']
                    }
                }))
            };
            
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(largeData));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        // Test handling of large responses with local data processing
        const script = `
            items = [
                {"id": 1, "size": "small", "data": "short"},
                {"id": 2, "size": "medium", "data": "medium length data"},
                {"id": 3, "size": "large", "data": "this is a much longer piece of data that simulates a large response"}
            ];
            largeItems = select * from items where size = "large";
            return largeItems;
        `;
        
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
                            reject(new Error('Max reqresp size test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(1);
                        expect(result.body[0].size).toBe("large");
                        expect(result.body[0].data.length).toBeGreaterThan(50);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Max reqresp size error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});