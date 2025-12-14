const Engine = require('../lib/engine');
const fs = require('fs');
const http = require('http');

describe('redirect test Tests', () => {
    let engine;
    let servers = [];

    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });

    afterEach(async () => {
        // Close all servers
        for (const server of servers) {
            if (server && server.listening) {
                await new Promise((resolve) => {
                    server.close(() => {
                        setTimeout(resolve, 100);
                    });
                });
            }
        }
        servers = [];
    });

    test('should follow redirects successfully', async () => {
        // Create redirect server that redirects to final server
        const redirectServer = http.createServer(function(req, res) {
            res.writeHead(302, {
                'Location': 'http://127.0.0.1:8301/redirect-response.json'
            });
            res.end();
        });
        
        // Create final server that serves the actual response
        const finalServer = http.createServer(function(req, res) {
            const file = __dirname + '/mock' + req.url;
            try {
                const data = fs.readFileSync(file, 'UTF-8');
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(data);
            } catch (e) {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        // Start servers
        await new Promise((resolve) => {
            redirectServer.listen(8300, resolve);
        });
        servers.push(redirectServer);
        
        await new Promise((resolve) => {
            finalServer.listen(8301, resolve);
        });
        servers.push(finalServer);
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = fs.readFileSync(__dirname + '/mock/redirect.ql', 'UTF-8');
        
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
                            reject(new Error('Redirect test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.id).toBe("42");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Redirect error: ' + err.message));
                });
            });
        });
    });
    test('should fail when exceeding max redirects', async () => {
        // Create servers that redirect in a loop to exceed max redirects
        const server1 = http.createServer(function(req, res) {
            res.writeHead(302, {
                'Location': 'http://127.0.0.1:8301/redirect-response.json'
            });
            res.end();
        });
        
        const server2 = http.createServer(function(req, res) {
            res.writeHead(302, {
                'Location': 'http://127.0.0.1:8300/redirect-response.json'
            });
            res.end();
        });
        
        // Start servers
        await new Promise((resolve) => {
            server1.listen(8300, resolve);
        });
        servers.push(server1);
        
        await new Promise((resolve) => {
            server2.listen(8301, resolve);
        });
        servers.push(server2);
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = fs.readFileSync(__dirname + '/mock/redirect.ql', 'UTF-8');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should get an error about exceeding max redirects
                        expect(err).toBeDefined();
                        expect(err.message).toContain('redirect');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected for too many redirects
                    expect(err).toBeDefined();
                    expect(err.message).toContain('redirect');
                    resolve();
                });
            });
        });
    });
    test('should handle relative location headers', async () => {
        // Create server that redirects with relative location header
        const server = http.createServer(function(req, res) {
            if (req.url.indexOf('/rel') === 0) {
                // Redirect with relative location
                res.writeHead(302, {
                    'Location': '/redirect-response.json'
                });
                res.end();
            } else {
                // Serve the actual response
                const file = __dirname + '/mock' + req.url;
                try {
                    const data = fs.readFileSync(file, 'UTF-8');
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(data);
                } catch (e) {
                    res.writeHead(404);
                    res.end('Not found');
                }
            }
        });
        
        // Start server
        await new Promise((resolve) => {
            server.listen(8300, resolve);
        });
        servers.push(server);
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = fs.readFileSync(__dirname + '/mock/redirect-rel.ql', 'UTF-8');
        
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
                            reject(new Error('Relative redirect test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.id).toBe("42");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Relative redirect error: ' + err.message));
                });
            });
        });
    });
    test('should handle bad location header gracefully', async () => {
        // Create server that sends redirect with malformed location header
        const server = http.createServer(function(req, res) {
            res.writeHead(302, {
                'Location': 'not-a-valid-url'
            });
            res.end();
        });
        
        // Start server
        await new Promise((resolve) => {
            server.listen(8300, resolve);
        });
        servers.push(server);
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = fs.readFileSync(__dirname + '/mock/redirect.ql', 'UTF-8');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should get an error for bad location header
                        expect(err).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected for bad location header
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });
    test('should handle missing location header', async () => {
        // Create server that sends redirect without location header
        const server = http.createServer(function(req, res) {
            res.writeHead(302, {
                'Content-Type': 'text/plain'
                // No Location header
            });
            res.end('Redirect without location');
        });
        
        // Start server
        await new Promise((resolve) => {
            server.listen(8300, resolve);
        });
        servers.push(server);
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = fs.readFileSync(__dirname + '/mock/redirect.ql', 'UTF-8');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should get an error for missing location header
                        expect(err).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected for missing location header
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });
    test('should handle status 305 (Use Proxy) error', async () => {
        // Create server that returns status 305
        const server = http.createServer(function(req, res) {
            res.writeHead(305, {
                'Location': 'http://proxy.example.com:8080'
            });
            res.end('Use Proxy');
        });
        
        // Start server
        await new Promise((resolve) => {
            server.listen(8300, resolve);
        });
        servers.push(server);
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = fs.readFileSync(__dirname + '/mock/redirect.ql', 'UTF-8');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should get an error for status 305
                        expect(err).toBeDefined();
                        expect(err.message).toContain('305');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected for status 305
                    expect(err).toBeDefined();
                    expect(err.message).toContain('305');
                    resolve();
                });
            });
        });
    });
});