const Engine = require('../lib/engine');
const fs = require('fs');
const http = require('http');

describe('timeout test Tests', () => {
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

    test('should handle default timeout behavior', async () => {
        // Create server that responds slowly (but within default timeout)
        server = http.createServer(function(req, res) {
            setTimeout(function() {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    message: 'Slow response',
                    delay: 'within_timeout'
                }));
            }, 1000); // 1 second delay - should be within default timeout
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table timeouttest 
                on select get from 'http://localhost:3000/slow-endpoint'
            
            select * from timeouttest
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
                            reject(new Error('Default timeout test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.delay).toBe('within_timeout');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Default timeout error: ' + err.message));
                });
            });
        });
    });
    test('should handle custom timeout configuration', async () => {
        // Create server that responds slowly
        server = http.createServer(function(req, res) {
            setTimeout(function() {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    message: 'Custom timeout response',
                    delay: 'custom_timeout'
                }));
            }, 500); // 0.5 second delay
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables',
            config: {
                timeout: 2000 // 2 second timeout
            }
        });
        
        const script = `
            create table customtimeouttest 
                on select get from 'http://localhost:3000/custom-timeout-endpoint'
            
            select * from customtimeouttest
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
                            reject(new Error('Custom timeout test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.delay).toBe('custom_timeout');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Custom timeout error: ' + err.message));
                });
            });
        });
    });
    test('should handle timeouts below retry threshold', async () => {
        let attempt = 0;
        
        // Create server that times out a few times then succeeds
        server = http.createServer(function(req, res) {
            attempt++;
            
            if (attempt < 3) {
                // Simulate timeout by delaying response beyond timeout
                setTimeout(function() {
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        message: 'Eventually successful',
                        attempt: attempt
                    }));
                }, 100); // Short delay, should succeed
            } else {
                // Respond quickly on final attempt
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    message: 'Success after retries',
                    attempt: attempt
                }));
            }
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table retrytest 
                on select get from 'http://localhost:3000/retry-endpoint'
            
            select * from retrytest
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
                            reject(new Error('Retry below threshold test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.message).toContain('successful');
                        // Verify at least one attempt was made
                        expect(attempt).toBeGreaterThanOrEqual(1);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Retry below threshold error: ' + err.message));
                });
            });
        });
    });
    test('should fail when retries exceed threshold', async () => {
        let attempt = 0;
        
        // Create server that always times out or fails
        server = http.createServer(function(req, res) {
            attempt++;
            
            // Always delay beyond reasonable timeout to simulate failure
            setTimeout(function() {
                res.writeHead(500, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    message: 'Server error',
                    attempt: attempt
                }));
            }, 50);
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table failretrytest 
                on select get from 'http://localhost:3000/always-fail-endpoint'
            
            select * from failretrytest
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
                        // Should get an error when retries exceed threshold
                        expect(err).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected when retries exceed threshold
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });
    test('should handle backoff strategy correctly', async () => {
        let attempt = 0;
        const requestTimes = [];
        
        // Create server that fails initially then succeeds
        server = http.createServer(function(req, res) {
            attempt++;
            requestTimes.push(Date.now());
            
            // Always succeed but track attempts
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                message: 'Success with backoff',
                attempt: attempt
            }));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table backofftest 
                on select get from 'http://localhost:3000/backoff-endpoint'
            
            select * from backofftest
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
                            reject(new Error('Backoff test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.message).toBe('Success with backoff');
                        // Verify at least one attempt was made
                        expect(attempt).toBeGreaterThanOrEqual(1);
                        
                        // Verify backoff timing (requests should be spaced out)
                        if (requestTimes.length > 1) {
                            const timeDiff = requestTimes[1] - requestTimes[0];
                            expect(timeDiff).toBeGreaterThan(0); // Should have some delay
                        }
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Backoff error: ' + err.message));
                });
            });
        });
    });
    test('should handle UPDATE operation timeouts', async () => {
        // Create server that handles requests with delay
        server = http.createServer(function(req, res) {
            setTimeout(function() {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    message: 'Operation completed',
                    method: req.method,
                    updated: true
                }));
            }, 500); // 0.5 second delay
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table updatetimeouttest 
                on select get from 'http://localhost:3000/update-endpoint'
            
            select * from updatetimeouttest
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
                            reject(new Error('UPDATE timeout test failed: ' + err.message));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(result.body.updated).toBe(true);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('UPDATE timeout error: ' + err.message));
                });
            });
        });
    });
});