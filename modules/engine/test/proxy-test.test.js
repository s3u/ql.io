const Engine = require('../lib/engine');
const fs = require('fs');
const http = require('http');

describe('proxy test Tests', () => {
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

    test('should work with proxy server', async () => {
        const URL = require('url');
        
        // Create target server that serves the actual response
        const targetServer = http.createServer(function(req, res) {
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
        
        // Create proxy server that forwards requests to target server
        const proxyServer = http.createServer(function(req, res) {
            const url = URL.parse(req.url, false);
            const options = {
                host: 'localhost',
                port: 3000,
                path: url.pathname,
                method: req.method,
                headers: req.headers
            };
            
            const proxyRequest = http.request(options, function(proxyResponse) {
                res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
                proxyResponse.on('data', function(chunk) {
                    res.write(chunk);
                });
                proxyResponse.on('end', function() {
                    res.end();
                });
            });
            
            req.on('data', function(chunk) {
                proxyRequest.write(chunk);
            });
            req.on('end', function() {
                proxyRequest.end();
            });
            
            proxyRequest.on('error', function(err) {
                res.writeHead(500);
                res.end('Proxy error: ' + err.message);
            });
        });
        
        // Start servers
        await new Promise((resolve) => {
            targetServer.listen(3000, resolve);
        });
        servers.push(targetServer);
        
        await new Promise((resolve) => {
            proxyServer.listen(3003, resolve);
        });
        servers.push(proxyServer);
        
        const testEngine = new Engine({
            tables: __dirname + '/tables',
            config: __dirname + '/config/proxy.json'
        });
        
        // Use a script that targets localhost to trigger the proxy config
        const script = `
            create table proxy
              on select get from "http://localhost:3000/proxy-response.json"

            response = select * from proxy;

            return response;
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
                            reject(new Error('Proxy test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.id).toBe("1");
                        expect(result.body.title).toBe("Proxy Response");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Proxy error: ' + err.message));
                });
            });
        });
    });
    test('should work with wildcard proxy configuration', async () => {
        const URL = require('url');
        
        // Create target server that serves the actual response
        const targetServer = http.createServer(function(req, res) {
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
        
        // Create wildcard proxy server (port 3004 as per config)
        const wildcardProxyServer = http.createServer(function(req, res) {
            const url = URL.parse(req.url, false);
            const options = {
                host: 'localhost',
                port: 3000,
                path: url.pathname,
                method: req.method,
                headers: req.headers
            };
            
            const proxyRequest = http.request(options, function(proxyResponse) {
                res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
                proxyResponse.on('data', function(chunk) {
                    res.write(chunk);
                });
                proxyResponse.on('end', function() {
                    res.end();
                });
            });
            
            req.on('data', function(chunk) {
                proxyRequest.write(chunk);
            });
            req.on('end', function() {
                proxyRequest.end();
            });
            
            proxyRequest.on('error', function(err) {
                res.writeHead(500);
                res.end('Proxy error: ' + err.message);
            });
        });
        
        // Start servers
        await new Promise((resolve) => {
            targetServer.listen(3000, resolve);
        });
        servers.push(targetServer);
        
        await new Promise((resolve) => {
            wildcardProxyServer.listen(3004, resolve);
        });
        servers.push(wildcardProxyServer);
        
        const testEngine = new Engine({
            tables: __dirname + '/tables',
            config: __dirname + '/config/proxy.json'
        });
        
        // Create a script that uses a different host to trigger wildcard proxy
        const script = `
            create table proxy
              on select get from "http://example.com:3000/proxy-response.json"

            response = select * from proxy;

            return response;
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
                            reject(new Error('Wildcard proxy test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.id).toBe("1");
                        expect(result.body.title).toBe("Proxy Response");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Wildcard proxy error: ' + err.message));
                });
            });
        });
    });
});