const Engine = require('../lib/engine');
const http = require('http');

describe('patch logger test Tests', () => {
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

    test('should patch logger functionality', async () => {
        // Create mock server that logs request details
        server = http.createServer(function(req, res) {
            let body = '';
            req.on('data', function(chunk) {
                body += chunk.toString();
            });
            req.on('end', function() {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    body: body,
                    logged: true
                }));
            });
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table logtest 
                on select get from 'http://localhost:3000/test-endpoint'
            
            select * from logtest
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
                        if (err) {
                            reject(new Error('Logger patch test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.logged).toBe(true);
                        expect(result.body.method).toBe('GET');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Logger patch error: ' + err.message));
                });
            });
        });
    });
});