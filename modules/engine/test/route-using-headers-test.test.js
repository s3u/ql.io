const Engine = require('../lib/engine');
const http = require('http');
const path = require('path');

describe('Route Using Headers Tests', () => {
    let engine;
    let server;
    const port = 3530;

    beforeEach(() => {
        engine = new Engine({
            tables: path.join(__dirname, 'tables'),
            config: path.join(__dirname, 'config/dev.json')
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

    test('should use custom headers in HTTP requests', async () => {
        // Create mock server that checks for custom headers
        server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            
            const responseData = {
                received_headers: {
                    'user-agent': req.headers['user-agent'],
                    'x-custom-header': req.headers['x-custom-header'],
                    'authorization': req.headers['authorization'],
                    'accept': req.headers['accept']
                },
                url: req.url,
                method: req.method
            };
            
            res.end(JSON.stringify(responseData));
        });

        await new Promise((resolve) => {
            server.listen(port, resolve);
        });

        const script = `
            create table headertest 
                on select get from 'http://localhost:${port}/api/test'
                using headers 'User-Agent' = 'QL.io-Test-Agent',
                              'X-Custom-Header' = 'test-value',
                              'Authorization' = 'Bearer test-token'
            
            select * from headertest
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);

                    if (err) {
                        reject(new Error('Headers test failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Handle both array and object responses
                        let data;
                        if (Array.isArray(result.body)) {
                            data = result.body[0];
                        } else {
                            data = result.body;
                        }
                        
                        expect(data.received_headers).toBeDefined();
                        expect(data.received_headers['user-agent']).toBe('QL.io-Test-Agent');
                        expect(data.received_headers['x-custom-header']).toBe('test-value');
                        expect(data.received_headers['authorization']).toBe('Bearer test-token');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Headers error: ' + err.message));
                });
            });
        });
    });

    test('should use dynamic headers with variable substitution', async () => {
        // Create mock server that echoes headers
        server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            
            const responseData = {
                auth_header: req.headers['authorization'],
                session_header: req.headers['x-session-id'],
                content_type: req.headers['content-type']
            };
            
            res.end(JSON.stringify(responseData));
        });

        await new Promise((resolve) => {
            server.listen(port, resolve);
        });

        const script = `
            -- Define variables for dynamic headers
            auth_token = "dynamic-token-123";
            session_id = "session-456";
            
            create table dynamicheadertest 
                on select get from 'http://localhost:${port}/api/dynamic'
                using headers 'Authorization' = 'Bearer {auth_token}',
                              'X-Session-Id' = '{session_id}',
                              'Content-Type' = 'application/json'
            
            select * from dynamicheadertest
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);

                    if (err) {
                        reject(new Error('Dynamic headers test failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Handle both array and object responses
                        let data;
                        if (Array.isArray(result.body)) {
                            data = result.body[0];
                        } else {
                            data = result.body;
                        }
                        
                        expect(data.auth_header).toBe('Bearer dynamic-token-123');
                        expect(data.session_header).toBe('session-456');
                        expect(data.content_type).toBe('application/json');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Dynamic headers error: ' + err.message));
                });
            });
        });
    });

    test('should handle conditional headers based on request parameters', async () => {
        // Create mock server that responds differently based on headers
        server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            
            const apiKey = req.headers['x-api-key'];
            const userType = req.headers['x-user-type'];
            
            let responseData;
            if (apiKey === 'admin-key' && userType === 'admin') {
                responseData = { access: 'admin', data: 'sensitive-admin-data' };
            } else if (apiKey === 'user-key' && userType === 'user') {
                responseData = { access: 'user', data: 'user-data' };
            } else {
                responseData = { access: 'denied', data: null };
            }
            
            res.end(JSON.stringify(responseData));
        });

        await new Promise((resolve) => {
            server.listen(port, resolve);
        });

        const script = `
            -- Test admin access
            create table adminapi 
                on select get from 'http://localhost:${port}/api/secure'
                using headers 'X-API-Key' = 'admin-key',
                              'X-User-Type' = 'admin'
            
            -- Test user access
            create table userapi 
                on select get from 'http://localhost:${port}/api/secure'
                using headers 'X-API-Key' = 'user-key',
                              'X-User-Type' = 'user'
            
            admin_result = select * from adminapi;
            user_result = select * from userapi;
            
            return {
                "admin": "{admin_result}",
                "user": "{user_result}"
            }
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);

                    if (err) {
                        reject(new Error('Conditional headers test failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(typeof result.body).toBe('object');
                        
                        // Handle the results - they might already be objects, not JSON strings
                        let adminData, userData;
                        if (typeof result.body.admin === 'string') {
                            adminData = JSON.parse(result.body.admin);
                            userData = JSON.parse(result.body.user);
                        } else {
                            adminData = result.body.admin;
                            userData = result.body.user;
                        }
                        
                        // The data is already objects, not arrays
                        expect(adminData.access).toBe('admin');
                        expect(adminData.data).toBe('sensitive-admin-data');
                        
                        expect(userData.access).toBe('user');
                        expect(userData.data).toBe('user-data');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Conditional headers error: ' + err.message));
                });
            });
        });
    });
});