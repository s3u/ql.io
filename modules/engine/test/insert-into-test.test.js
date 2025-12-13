const Engine = require('../lib/engine');
describe('insert into test Tests', () => {
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

    test('insert into table with HTTP endpoint', async () => {
        const http = require('http');
        
        // Create mock server to receive INSERT requests
        server = http.createServer(function(req, res) {
            let body = '';
            req.on('data', function(chunk) {
                body += chunk;
            });
            req.on('end', function() {
                try {
                    const data = JSON.parse(body);
                    expect(data).toBeDefined();
                    expect(data.name).toBeDefined();
                    
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        success: true,
                        inserted: data
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
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            insert into insert.into (name) values ("test user")
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Insert test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should have successful insert response
                        expect(result.body.success).toBe(true);
                        expect(result.body.inserted).toBeDefined();
                        expect(result.body.inserted.name).toBe('test user');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Insert error: ' + err.message));
                });
            });
        });
    }, 15000);
    test('insert json data into context variable', async () => {
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            user = {"id": 1, "name": "John Doe"};
            updated = insert into user (email, status) values ("john@example.com", "active");
            return updated;
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Insert JSON test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should have original data plus inserted fields
                        expect(result.body.id).toBe(1);
                        expect(result.body.name).toBe('John Doe');
                        expect(result.body.email).toBe('john@example.com');
                        expect(result.body.status).toBe('active');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Insert JSON error: ' + err.message));
                });
            });
        });
    }, 15000);
});