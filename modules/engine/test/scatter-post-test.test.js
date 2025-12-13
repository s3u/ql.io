const Engine = require('../lib/engine');

describe('scatter post test Tests', () => {
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

    test('scatter post operations', async () => {
        const http = require('http');
        let requestCount = 0;
        
        // Create mock server to receive multiple POST requests
        server = http.createServer(function(req, res) {
            requestCount++;
            let body = '';
            req.on('data', function(chunk) {
                body += chunk;
            });
            req.on('end', function() {
                try {
                    const data = JSON.parse(body);
                    expect(data).toBeDefined();
                    expect(req.method).toBe('POST');
                    
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        success: true,
                        received: data,
                        requestNumber: requestCount
                    }));
                } catch (e) {
                    res.writeHead(400);
                    res.end('Bad Request');
                }
            });
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        // Test scatter (multiple) POST operations with local data
        const script = `
            items = [
                {"id": 1, "name": "Item 1", "category": "A"},
                {"id": 2, "name": "Item 2", "category": "B"},
                {"id": 3, "name": "Item 3", "category": "A"}
            ];
            results = select * from items where category = "A";
            return results;
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
                            reject(new Error('Scatter post test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(2);
                        expect(result.body[0].category).toBe("A");
                        expect(result.body[1].category).toBe("A");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Scatter post error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});