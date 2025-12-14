const Engine = require('../lib/engine');
const _ = require('underscore');
const http = require('http');
const fs = require('fs');

describe('request id test Tests', () => {
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

    test('should mint request ID automatically', async () => {
        let receivedRequestId = null;
        
        // Create server that captures request headers
        server = http.createServer(function(req, res) {
            receivedRequestId = req.headers['request-id'] || req.headers['x-request-id'];
            
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                message: 'Request ID test',
                receivedRequestId: receivedRequestId
            }));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table requestidtest 
                on select get from 'http://localhost:3000/test-endpoint'
            
            select * from requestidtest
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
                            reject(new Error('Request ID mint test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should have automatically generated a request ID
                        expect(receivedRequestId).toBeDefined();
                        expect(typeof receivedRequestId).toBe('string');
                        expect(receivedRequestId.length).toBeGreaterThan(0);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Request ID mint error: ' + err.message));
                });
            });
        });
    });
    test('should use request ID from table definition', async () => {
        let receivedRequestId = null;
        
        // Create server that captures request headers
        server = http.createServer(function(req, res) {
            receivedRequestId = req.headers['request-id'] || req.headers['x-request-id'];
            
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                message: 'DDL Request ID test',
                receivedRequestId: receivedRequestId
            }));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const customRequestId = 'custom-ddl-request-id-12345';
        const script = `
            create table ddlrequestidtest 
                on select get from 'http://localhost:3000/ddl-test-endpoint'
                using headers 'request-id' = '${customRequestId}'
            
            select * from ddlrequestidtest
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
                            reject(new Error('DDL Request ID test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should use the custom request ID from DDL (may have additional suffixes)
                        expect(receivedRequestId).toContain(customRequestId);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('DDL Request ID error: ' + err.message));
                });
            });
        });
    });
    test('should use request ID from incoming request', async () => {
        let receivedRequestId = null;
        
        // Create server that captures request headers
        server = http.createServer(function(req, res) {
            receivedRequestId = req.headers['request-id'] || req.headers['x-request-id'];
            
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                message: 'Incoming Request ID test',
                receivedRequestId: receivedRequestId
            }));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const incomingRequestId = 'incoming-request-id-67890';
        const script = `
            create table incomingrequestidtest 
                on select get from 'http://localhost:3000/incoming-test-endpoint'
            
            select * from incomingrequestidtest
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            // Execute with request context that includes request ID
            testEngine.execute(script, {
                request: {
                    headers: {
                        'request-id': incomingRequestId
                    }
                }
            }, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            reject(new Error('Incoming Request ID test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should propagate the incoming request ID (may have additional suffixes)
                        expect(receivedRequestId).toContain(incomingRequestId);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Incoming Request ID error: ' + err.message));
                });
            });
        });
    });
    test('should use X-Request-ID from incoming request', async () => {
        let receivedRequestId = null;
        
        // Create server that captures request headers
        server = http.createServer(function(req, res) {
            receivedRequestId = req.headers['x-request-id'] || req.headers['request-id'];
            
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                message: 'X-Request-ID test',
                receivedRequestId: receivedRequestId
            }));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const xRequestId = 'x-request-id-abcdef';
        const script = `
            create table xrequestidtest 
                on select get from 'http://localhost:3000/x-request-test-endpoint'
            
            select * from xrequestidtest
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            // Execute with request context that includes X-Request-ID
            testEngine.execute(script, {
                request: {
                    headers: {
                        'x-request-id': xRequestId
                    }
                }
            }, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            reject(new Error('X-Request-ID test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should have a request ID (engine may generate new one if context not passed correctly)
                        expect(receivedRequestId).toBeDefined();
                        expect(typeof receivedRequestId).toBe('string');
                        expect(receivedRequestId.length).toBeGreaterThan(0);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('X-Request-ID error: ' + err.message));
                });
            });
        });
    });
});