/**
 * Simplified ql.io API Integration Test Suite
 * 
 * Tests core API functionality with the minimal server:
 * - Basic query execution
 * - Error handling
 * - Performance under load
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

describe('ql.io API Integration Tests', () => {
    let serverProcess;
    const API_URL = 'http://localhost:3000';
    const STARTUP_TIMEOUT = 15000;
    const REQUEST_TIMEOUT = 10000;

    beforeAll(async () => {
        console.log('Starting ql.io server for API tests...');
        
        serverProcess = spawn('node', ['bin/minimal-server.js', 'demos'], {
            cwd: path.resolve(__dirname, '..', '..'),
            stdio: 'pipe'
        });

        await waitForServer(API_URL, '/tables');
        console.log('Server started successfully');
    }, STARTUP_TIMEOUT + 5000);

    afterAll(async () => {
        await stopProcess(serverProcess, 'API');
    });

    describe('Core API Functionality', () => {
        test('should list available tables', async () => {
            const response = await makeRequest('/tables');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should execute show tables query', async () => {
            const query = 'show tables';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should execute simple select query', async () => {
            const query = 'select id, title from jsonplaceholder.posts limit 2';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should handle return statements', async () => {
            const query = 'return {"message": "test", "status": "ok"}';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message', 'test');
            expect(response.data).toHaveProperty('status', 'ok');
        });

        test('should handle WHERE conditions', async () => {
            const query = 'select id, title from jsonplaceholder.posts where id = 1';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should handle LIMIT clauses', async () => {
            const query = 'select id from jsonplaceholder.posts limit 3';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            if (response.data.length > 0) {
                expect(response.data.length).toBeLessThanOrEqual(3);
            }
        });
    });

    describe('Variable Assignments', () => {
        test('should handle simple variable assignment', async () => {
            const query = 'posts = select id from jsonplaceholder.posts limit 1; return posts';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should handle multiple assignments', async () => {
            const query = 'count = 2; posts = select id from jsonplaceholder.posts limit 2; return posts';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed queries', async () => {
            const query = 'invalid ql syntax here';
            const response = await executeQuery(query);
            
            expect([400, 500]).toContain(response.status);
        });

        test('should handle empty queries', async () => {
            const query = '';
            const response = await executeQuery(query);
            
            expect([400, 500]).toContain(response.status);
        });

        test('should handle queries with syntax errors', async () => {
            const query = 'select * from';
            const response = await executeQuery(query);
            
            expect([400, 500]).toContain(response.status);
        });

        test('should handle non-existent tables gracefully', async () => {
            const query = 'select * from nonexistent.table';
            const response = await executeQuery(query);
            
            expect([400, 500]).toContain(response.status);
        });
    });

    describe('HTTP Methods and Headers', () => {
        test('should handle POST requests with JSON body', async () => {
            const query = 'return {"method": "POST"}';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('method', 'POST');
        });

        test('should handle custom headers', async () => {
            const query = 'return {"header_test": "ok"}';
            const response = await executeQueryWithHeaders(query, {
                'X-Custom-Header': 'test-value'
            });
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('header_test', 'ok');
        });

        test('should return appropriate content-type', async () => {
            const query = 'return {"content": "json"}';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('json');
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle concurrent requests', async () => {
            const queries = Array(10).fill().map((_, i) => 
                executeQuery(`select id from jsonplaceholder.posts where id = ${i + 1}`)
            );
            
            const responses = await Promise.all(queries);
            
            expect(responses.length).toBe(10);
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        test('should handle rapid sequential requests', async () => {
            const startTime = Date.now();
            
            for (let i = 0; i < 5; i++) {
                const response = await executeQuery(`select id from jsonplaceholder.posts where id = ${i + 1}`);
                expect(response.status).toBe(200);
            }
            
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
        });

        test('should handle large result sets', async () => {
            const query = 'select * from jsonplaceholder.posts';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            if (Array.isArray(response.data)) {
                expect(response.data.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Edge Cases', () => {
        test('should handle very long queries', async () => {
            const longQuery = 'select id from jsonplaceholder.posts where ' + 
                Array(50).fill('id > 0').join(' and ');
            
            const response = await executeQuery(longQuery);
            expect([200, 400, 500]).toContain(response.status);
        });

        test('should handle queries with special characters', async () => {
            const query = 'return {"message": "Test with \\"quotes\\" and \'apostrophes\'"}';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
        });

        test('should handle malformed JSON in POST body', async () => {
            const response = await makePostRequest('/q', 'not valid json');
            expect([400, 500]).toContain(response.status);
        });
    });

    // Helper functions
    async function makeRequest(path, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, API_URL);
            const options = {
                headers: {
                    'Accept': 'application/json',
                    ...headers
                }
            };
            
            const req = http.get(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data, headers: res.headers });
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(REQUEST_TIMEOUT, () => {
                req.destroy();
                reject(new Error(`Request timeout for ${path}`));
            });
        });
    }

    async function executeQuery(query, method = 'POST') {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ q: query });
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/q',
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Accept': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data, headers: res.headers });
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(REQUEST_TIMEOUT, () => {
                req.destroy();
                reject(new Error('Query timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    async function executeQueryWithHeaders(query, customHeaders) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ q: query });
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/q',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    ...customHeaders
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data, headers: res.headers });
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(REQUEST_TIMEOUT, () => {
                req.destroy();
                reject(new Error('Query timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    async function makePostRequest(path, body) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                });
            });

            req.on('error', reject);
            req.setTimeout(REQUEST_TIMEOUT, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(body);
            req.end();
        });
    }

    async function waitForServer(baseUrl, path) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < STARTUP_TIMEOUT) {
            try {
                await makeRequest(path);
                return;
            } catch (e) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        throw new Error(`Server at ${baseUrl} did not start within ${STARTUP_TIMEOUT}ms`);
    }

    async function stopProcess(process, name) {
        if (process && !process.killed) {
            console.log(`Stopping ${name} server...`);
            process.kill('SIGTERM');
            
            try {
                await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        process.kill('SIGKILL');
                        resolve();
                    }, 2000);
                    
                    process.on('exit', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                });
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }
});