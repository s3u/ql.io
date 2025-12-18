/**
 * Comprehensive ql.io API Test Suite
 * 
 * Tests all API endpoints and advanced features not covered by basic tests
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

describe('Comprehensive ql.io API Tests', () => {
    let serverProcess;
    const BASE_URL = 'http://localhost:3000';
    const STARTUP_TIMEOUT = 15000;
    const REQUEST_TIMEOUT = 10000;

    beforeAll(async () => {
        serverProcess = spawn('node', ['bin/minimal-server.js', 'demos'], {
            cwd: path.resolve(__dirname, '..', '..'),
            stdio: 'pipe'
        });

        await waitForServer(BASE_URL, '/tables', STARTUP_TIMEOUT);
    }, STARTUP_TIMEOUT + 5000);

    afterAll(async () => {
        await stopProcess(serverProcess);
    });

    describe('Core API Endpoints', () => {
        test('should list available tables', async () => {
            const response = await makeRequest('/tables');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should handle tables endpoint with different accept headers', async () => {
            const jsonResponse = await makeRequest('/tables', {
                'Accept': 'application/json'
            });
            expect(jsonResponse.status).toBe(200);
            expect(Array.isArray(jsonResponse.data)).toBe(true);
        });

        test('should execute queries via POST /q', async () => {
            const query = 'show tables';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should handle GET /q with query parameter', async () => {
            const query = 'show tables';
            const response = await makeRequest(`/q?s=${encodeURIComponent(query)}`);
            
            expect([200, 404]).toContain(response.status); // 404 if GET /q not supported
        });

        test('should return 404 for non-existent endpoints', async () => {
            const response = await makeRequest('/nonexistent');
            
            expect(response.status).toBe(404);
        });
    });

    describe('Advanced Query Execution', () => {
        test('should handle POST method on /q', async () => {
            const query = 'return {"method": "POST", "status": "ok"}';
            const response = await executeQuery(query, 'POST');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('method', 'POST');
        });

        test('should handle basic return statements', async () => {
            const query = 'return {"message": "test", "timestamp": 123456}';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message', 'test');
            expect(response.data).toHaveProperty('timestamp', 123456);
        });

        test('should handle show tables query', async () => {
            const query = 'show tables';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should handle simple select queries', async () => {
            const query = 'select id, title from jsonplaceholder.posts limit 2';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should handle variable assignments', async () => {
            const query = 'posts = select id, title from jsonplaceholder.posts limit 1; return posts';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
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

    describe('Query Parameters and Headers', () => {
        test('should handle POST requests with JSON body', async () => {
            const query = 'return {"status": "ok", "method": "POST"}';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('status', 'ok');
        });

        test('should handle custom headers in requests', async () => {
            const query = 'return {"message": "header test"}';
            const response = await executeQueryWithHeaders(query, {
                'X-Custom-Header': 'test-value'
            });
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message', 'header test');
        });

        test('should handle content-type application/json', async () => {
            const query = 'return {"content": "json"}';
            const response = await executeQueryWithHeaders(query, {
                'Accept': 'application/json'
            });
            
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('json');
        });
    });

    describe('Error Scenarios and Edge Cases', () => {
        test('should handle very long queries', async () => {
            const longQuery = 'select id from jsonplaceholder.posts where ' + 
                Array(100).fill('id > 0').join(' and ');
            
            const response = await executeQuery(longQuery);
            expect([200, 400, 500]).toContain(response.status);
        });

        test('should handle queries with special characters', async () => {
            const query = 'return {"message": "Test with \\"quotes\\" and \'apostrophes\'"}';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
        });

        test('should handle concurrent identical queries', async () => {
            const query = 'select id from jsonplaceholder.posts limit 1';
            const requests = Array(10).fill().map(() => executeQuery(query));
            
            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        test('should handle timeout scenarios', async () => {
            // Query that might take longer
            const query = 'select * from jsonplaceholder.posts';
            
            const response = await executeQuery(query);
            expect([200, 408, 500]).toContain(response.status);
        });

        test('should handle malformed JSON in POST body', async () => {
            const response = await makePostRequest('/q', 'not valid json');
            
            expect([400, 500]).toContain(response.status);
        });
    });

    describe('Content Type Handling', () => {
        test('should return JSON for application/json accept header', async () => {
            const query = 'show tables';
            const response = await executeQueryWithHeaders(query, {
                'Accept': 'application/json'
            });
            
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('json');
        });

        test('should handle different content types', async () => {
            const query = 'return "<html><body>Test</body></html>"';
            const response = await executeQuery(query);
            
            expect(response.status).toBe(200);
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle rapid sequential queries', async () => {
            const queries = Array(20).fill().map((_, i) => 
                `select id from jsonplaceholder.posts where id = ${i + 1}`
            );
            
            const startTime = Date.now();
            
            for (const query of queries) {
                await executeQuery(query);
            }
            
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / queries.length;
            
            expect(avgTime).toBeLessThan(1000); // Average < 1 second per query
        });

        test('should handle large result sets', async () => {
            const query = 'select * from jsonplaceholder.posts';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            
            if (Array.isArray(response.data)) {
                expect(response.data.length).toBeGreaterThan(0);
            }
        });

        test('should maintain performance under concurrent load', async () => {
            const startTime = Date.now();
            
            const requests = Array(50).fill().map((_, i) => 
                executeQuery(`select id from jsonplaceholder.posts where id = ${(i % 10) + 1}`)
            );
            
            const responses = await Promise.all(requests);
            const endTime = Date.now();
            
            expect(responses.length).toBe(50);
            expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
            
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBeGreaterThan(40); // At least 80% success rate
        });
    });

    // Helper functions
    async function makeRequest(path, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, BASE_URL);
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

    async function waitForServer(baseUrl, path, timeout) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                await makeRequest(path);
                return;
            } catch (e) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        throw new Error(`Server at ${baseUrl} did not start within ${timeout}ms`);
    }

    async function stopProcess(process) {
        if (process && !process.killed) {
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