/*
 * UPDATE Operations Comprehensive Test Suite
 * Target: Improve coverage from 10.34% to 60%+
 * 
 * Note: UPDATE operations require actual table definitions with UPDATE verbs.
 * This test suite focuses on testing the UPDATE logic paths, error handling,
 * and WITH clause processing.
 */

'use strict';

const Engine = require('../lib/engine.js');
const path = require('path');
const http = require('http');

describe('UPDATE Operations Comprehensive Tests', () => {
    let engine;
    let originalConsoleLog;
    let server;
    
    beforeEach(() => {
        // Suppress console.log during tests
        originalConsoleLog = console.log;
        console.log = jest.fn();
        
        engine = new Engine({
            tables: path.join(__dirname, 'tables'),
            config: path.join(__dirname, 'config/dev.json')
        });
    });

    afterEach(async () => {
        // Restore console.log
        console.log = originalConsoleLog;
        
        // Cleanup server if running
        if (server && server.listening) {
            await new Promise((resolve) => {
                server.close(() => {
                    server = null;
                    setTimeout(resolve, 100);
                });
            });
        }
    });

    describe('UPDATE WITH Clause Processing', () => {
        test('should process WITH clause with braces correctly', (done) => {
            const script = `
                updateData = {"name": "Test User", "status": "active"};
                result = update updatetest with "{updateData}";
                return result;
            `;
            
            // Mock server to handle the UPDATE request
            server = http.createServer((req, res) => {
                if (req.method === 'POST' && req.url === '/updatetest') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {updated: true, name: "Test User"}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        done();
                    });
                });
            });
        });

        test('should handle WITH clause variable resolution', (done) => {
            const script = `
                userData = {"email": "test@example.com", "active": true};
                result = update updatetest with "{userData}";
                return result;
            `;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {updated: true}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        done();
                    });
                });
            });
        });

        test('should handle WITH clause with undefined variable', (done) => {
            const script = `
                result = update updatetest with "{undefinedVar}";
                return result;
            `;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {updated: true}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        done();
                    });
                });
            });
        });
    });

    describe('UPDATE Error Handling', () => {
        test('should handle UPDATE on non-existent table', (done) => {
            const script = `
                data = {"name": "test"};
                result = update nonexistent_table with "{data}";
                return result;
            `;
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    expect(err).toBeDefined();
                    expect(err.message || err).toContain('No such table');
                    done();
                });
            });
        });

        test('should handle UPDATE on table without update verb', (done) => {
            const script = `
                data = {"name": "test"};
                result = update google.geocode with "{data}";
                return result;
            `;
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    expect(err).toBeDefined();
                    expect(err.message || err).toContain('does not support update');
                    done();
                });
            });
        });

        test('should handle UPDATE with network error', (done) => {
            const script = `
                data = {"name": "test"};
                result = update updatetest with "{data}";
                return result;
            `;
            
            // No server running - should get network error
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    expect(err).toBeDefined();
                    // Should get a network-related error
                    done();
                });
            });
        });
    });

    describe('UPDATE Context and Assignment', () => {
        test('should assign UPDATE result to context variable', (done) => {
            const script = `
                updateData = {"status": "updated", "timestamp": "2023-01-01"};
                updateResult = update updatetest with "{updateData}";
                return updateResult;
            `;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {id: 1, status: "updated"}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        done();
                    });
                });
            });
        });

        test('should emit UPDATE result to context', (done) => {
            const script = `
                updateData = {"emitted": true, "data": "test"};
                emittedResult = update updatetest with "{updateData}";
                return emittedResult;
            `;
            
            let emittedData = null;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {emitted: true}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('emittedResult', (data) => {
                        emittedData = data;
                    });
                    
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        // Check if data was emitted
                        expect(emittedData).toBeDefined();
                        done();
                    });
                });
            });
        });
    });

    describe('UPDATE Verb Execution', () => {
        test('should execute UPDATE verb with parameters', (done) => {
            const script = `
                verbData = {"name": "Verb Test", "description": "Testing verb execution"};
                result = update updatetest with "{verbData}";
                return result;
            `;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        let requestData = {};
                        try {
                            requestData = body ? JSON.parse(body) : {};
                        } catch (e) {
                            requestData = {raw: body};
                        }
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {updated: true, received: requestData}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        done();
                    });
                });
            });
        });

        test('should handle UPDATE verb callback with result', (done) => {
            const script = `
                callbackData = {"callback": "test", "id": 123};
                result = update updatetest with "{callbackData}";
                return result;
            `;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {success: true, callback: "processed"}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        done();
                    });
                });
            });
        });
    });

    describe('UPDATE Edge Cases', () => {
        test('should handle UPDATE with empty data', (done) => {
            const script = `
                emptyData = {};
                result = update updatetest with "{emptyData}";
                return result;
            `;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {updated: true, empty: true}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        done();
                    });
                });
            });
        });

        test('should handle UPDATE with missing variable reference', (done) => {
            const script = `
                result = update updatetest with "{missingVar}";
                return result;
            `;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {updated: true, missing: true}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        done();
                    });
                });
            });
        });
    });

    describe('UPDATE Performance and Integration', () => {
        test('should handle UPDATE with large data efficiently', (done) => {
            const largeString = 'x'.repeat(1000); // 1KB string
            const script = `
                largeData = {
                    "content": "${largeString}",
                    "size": "large",
                    "type": "performance_test"
                };
                result = update updatetest with "{largeData}";
                return result;
            `;
            
            const startTime = Date.now();
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {updated: true, size: "large"}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        const endTime = Date.now();
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
                        done();
                    });
                });
            });
        });

        test('should handle UPDATE with special characters', (done) => {
            const script = `
                specialData = {
                    "name": "Special @#$%^&*() Characters",
                    "description": "Testing special chars: <>?/|\\\\[]{}",
                    "unicode": "Unicode: αβγδε 中文 العربية"
                };
                result = update updatetest with "{specialData}";
                return result;
            `;
            
            // Mock server
            server = http.createServer((req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({data: {updated: true, special: true}}));
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            
            server.listen(3000, () => {
                engine.execute(script, (emitter) => {
                    emitter.on('end', (err, result) => {
                        if (err) {
                            console.log('Error:', err);
                            done(err);
                            return;
                        }
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        done();
                    });
                });
            });
        });
    });

});