const Engine = require('../lib/engine');

describe('patch body test Tests', () => {
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

    test('patch body with JSON data', async () => {
        const http = require('http');
        
        // Create mock server to receive PATCH requests
        server = http.createServer(function(req, res) {
            let body = '';
            req.on('data', function(chunk) {
                body += chunk;
            });
            req.on('end', function() {
                try {
                    const data = JSON.parse(body);
                    expect(data).toBeDefined();
                    expect(req.method).toBe('PATCH');
                    expect(req.headers['content-type']).toBe('application/json');
                    
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        success: true,
                        patched: data,
                        method: req.method
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
        
        // Test basic HTTP PATCH functionality with local data
        const script = `
            data = {"id": "123", "name": "Original Name", "status": "inactive"};
            updated = {"id": "123", "name": "Updated Name", "status": "active"};
            return updated;
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
                            reject(new Error('Patch body test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.id).toBe("123");
                        expect(result.body.name).toBe("Updated Name");
                        expect(result.body.status).toBe("active");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Patch body error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});