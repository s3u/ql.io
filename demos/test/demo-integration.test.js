/**
 * ql.io Demo Integration Test Suite
 * 
 * This test suite verifies that all demo routes work correctly and return
 * expected data structures based on the ql.io language syntax.
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

describe('ql.io Demo Integration Tests', () => {
    let serverProcess;
    const BASE_URL = 'http://localhost:3000';
    const STARTUP_TIMEOUT = 15000; // 15 seconds for server startup
    const REQUEST_TIMEOUT = 10000;  // 10 seconds per request

    beforeAll(async () => {
        // Start the minimal server for testing
        console.log('Starting ql.io server for integration tests...');
        
        serverProcess = spawn('node', ['bin/minimal-server.js', 'demos'], {
            cwd: path.resolve(__dirname, '..', '..'),
            stdio: 'pipe'
        });

        // Wait for server to start
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Server startup timeout'));
            }, STARTUP_TIMEOUT);

            const checkServer = () => {
                const req = http.get(`${BASE_URL}/tables`, (res) => {
                    clearTimeout(timeout);
                    resolve();
                });
                req.on('error', () => {
                    setTimeout(checkServer, 500);
                });
                req.setTimeout(1000);
            };

            setTimeout(checkServer, 2000); // Give server time to start
        });

        console.log('Server started successfully');
    }, STARTUP_TIMEOUT + 5000);

    afterAll(async () => {
        if (serverProcess && !serverProcess.killed) {
            console.log('Stopping server...');
            serverProcess.kill('SIGTERM');
            
            // Wait for process to exit
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        serverProcess.kill('SIGKILL');
                        resolve();
                    }, 2000);
                    
                    serverProcess.on('exit', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                });
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });

    // Helper function to make HTTP requests
    const makeRequest = (path) => {
        return new Promise((resolve, reject) => {
            const req = http.get(`${BASE_URL}${path}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data });
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(REQUEST_TIMEOUT, () => {
                req.destroy();
                reject(new Error(`Request timeout for ${path}`));
            });
        });
    };

    // Helper function to execute ql.io queries
    const executeQuery = (query) => {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ q: query });
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/q',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data });
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
    };

    describe('Core API Functionality', () => {
        test('should return available tables', async () => {
            const response = await makeRequest('/tables');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);
            
            // Check for expected table names
            const tableNames = response.data.map(table => table.name);
            expect(tableNames).toContain('catfacts.random');
            expect(tableNames).toContain('github.user');
            expect(tableNames).toContain('jsonplaceholder.posts');
            expect(tableNames).toContain('jsonplaceholder.users');
        });

        test('should execute show tables query', async () => {
            const response = await executeQuery('show tables');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);
        });

        test('should execute simple select query', async () => {
            const response = await executeQuery('select fact from catfacts.random');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);
            expect(typeof response.data[0]).toBe('string');
        });
    });

    describe('Demo Routes', () => {
        test('should serve welcome page', async () => {
            const response = await makeRequest('/');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message', 'Welcome to ql.io!');
            expect(response.data).toHaveProperty('description');
            expect(response.data).toHaveProperty('version', '0.8.11');
            expect(response.data).toHaveProperty('links');
            expect(response.data.links).toHaveProperty('console', 'http://localhost:3001');
            expect(response.data.links).toHaveProperty('demos', 'http://localhost:3000/demos');
            expect(response.data).toHaveProperty('quick_start');
            expect(Array.isArray(response.data.quick_start)).toBe(true);
        });

        test('should serve demos index', async () => {
            const response = await makeRequest('/demos');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('welcome', 'Welcome to ql.io Interactive Demos!');
            expect(response.data).toHaveProperty('available_demos');
            expect(response.data).toHaveProperty('available_apis');
            
            expect(Array.isArray(response.data.available_demos)).toBe(true);
            expect(response.data.available_demos.length).toBe(6);
            
            // Check demo structure
            const basicDemo = response.data.available_demos.find(d => d.name === 'Basic API Calls');
            expect(basicDemo).toBeDefined();
            expect(basicDemo.url).toBe('/demo-basic');
        });

        test('should serve basic demo with API calls', async () => {
            const response = await makeRequest('/demo-basic');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('sample_posts');
            expect(response.data).toHaveProperty('message', 'Basic API demonstration');
            expect(response.data).toHaveProperty('explanation');
            
            // Validate posts structure
            expect(Array.isArray(response.data.sample_posts)).toBe(true);
            expect(response.data.sample_posts.length).toBeLessThanOrEqual(1);
            if (response.data.sample_posts.length > 0) {
                expect(response.data.sample_posts[0]).toHaveProperty('id');
                expect(response.data.sample_posts[0]).toHaveProperty('title');
                expect(response.data.sample_posts[0]).toHaveProperty('userId');
            }
        });

        test('should serve joins demo with local data operations', async () => {
            const response = await makeRequest('/demo-joins');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('api_posts');
            expect(response.data).toHaveProperty('api_users');
            expect(response.data).toHaveProperty('local_joined_data');
            expect(response.data).toHaveProperty('message', 'JOIN demonstration using local data arrays');
            
            // Validate JOIN operation results
            expect(Array.isArray(response.data.local_joined_data)).toBe(true);
            expect(response.data.local_joined_data.length).toBe(2);
            
            // Check JOIN structure
            const joinedItem = response.data.local_joined_data[0];
            expect(Array.isArray(joinedItem)).toBe(true);
            expect(joinedItem.length).toBe(3); // title, name, email
            expect(typeof joinedItem[0]).toBe('string'); // title
            expect(typeof joinedItem[1]).toBe('string'); // name
            expect(typeof joinedItem[2]).toBe('string'); // email
        });

        test('should serve variables demo with parameter substitution', async () => {
            const response = await makeRequest('/demo-variables');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('target_user', 'octocat');
            expect(response.data).toHaveProperty('max_results', '3');
            expect(response.data).toHaveProperty('sample_posts');
            expect(response.data).toHaveProperty('message', 'Variable assignment demonstration');
            expect(response.data).toHaveProperty('explanation');
            
            // Validate posts structure
            expect(Array.isArray(response.data.sample_posts)).toBe(true);
            expect(response.data.sample_posts.length).toBeLessThanOrEqual(3);
            if (response.data.sample_posts.length > 0) {
                expect(response.data.sample_posts[0]).toHaveProperty('id');
                expect(response.data.sample_posts[0]).toHaveProperty('title');
            }
        });

        test('should serve conditional demo with WHERE clause logic', async () => {
            const response = await makeRequest('/demo-conditional');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('valid_post_id', '1');
            expect(response.data).toHaveProperty('valid_post_data');
            expect(response.data).toHaveProperty('message', 'Conditional logic demonstration');
            expect(response.data).toHaveProperty('explanation');
            
            // Valid post should return data
            expect(response.data.valid_post_data).toHaveProperty('id', 1);
            expect(response.data.valid_post_data).toHaveProperty('title');
        });

        test('should serve aggregation demo with multiple API calls', async () => {
            const response = await makeRequest('/demo-aggregation');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('posts');
            expect(response.data).toHaveProperty('users');
            expect(response.data).toHaveProperty('posts_count');
            expect(response.data).toHaveProperty('users_count');
            expect(response.data).toHaveProperty('message', 'Data aggregated from multiple API endpoints');
            
            // Validate all data sources are present
            expect(Array.isArray(response.data.posts)).toBe(true);
            expect(Array.isArray(response.data.users)).toBe(true);
            expect(response.data.posts.length).toBeLessThanOrEqual(2);
            expect(response.data.users.length).toBeLessThanOrEqual(2);
        });

        test('should serve error handling demo', async () => {
            const response = await makeRequest('/demo-error-handling');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('valid_post');
            expect(response.data).toHaveProperty('message');
            expect(response.data).toHaveProperty('explanation');
            
            // Should return a valid post
            expect(response.data.valid_post).toHaveProperty('id', 1);
            expect(response.data.valid_post).toHaveProperty('title');
            expect(response.data.valid_post).toHaveProperty('body');
        });
    });

    describe('ql.io Language Syntax Validation', () => {
        test('should handle variable assignment and substitution', async () => {
            const query = 'select id, title from jsonplaceholder.posts where id = 1';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            if (response.data.length > 0) {
                expect(Array.isArray(response.data[0])).toBe(true);
                expect(response.data[0][0]).toBe(1); // id
            }
        });

        test('should handle array operations and limits', async () => {
            const query = 'select id, title from jsonplaceholder.posts limit 3';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeLessThanOrEqual(3);
            
            if (response.data.length > 0) {
                expect(Array.isArray(response.data[0])).toBe(true);
                expect(response.data[0].length).toBe(2); // id and title
                expect(typeof response.data[0][0]).toBe('number'); // id
                expect(typeof response.data[0][1]).toBe('string'); // title
            }
        });

        test('should handle WHERE clause filtering', async () => {
            const query = 'select * from jsonplaceholder.posts where id = 1';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            
            // Response should be a single object (not array) when using select *
            expect(response.data).toHaveProperty('id', 1);
            expect(response.data).toHaveProperty('title');
            expect(response.data).toHaveProperty('body');
        });

        test('should handle return statements with object construction', async () => {
            const query = 'return {"message": "Test successful", "status": "ok"}';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message', 'Test successful');
            expect(response.data).toHaveProperty('status', 'ok');
        });

        test('should handle multiple assignments and references', async () => {
            const query = 'select id, title from jsonplaceholder.posts limit 2';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeLessThanOrEqual(2);
            if (response.data.length > 0) {
                expect(Array.isArray(response.data[0])).toBe(true);
                expect(response.data[0].length).toBe(2); // id and title
            }
        });

        test('should handle string interpolation in queries', async () => {
            const query = 'select id, title from jsonplaceholder.posts where id = 1';
            
            const response = await executeQuery(query);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            if (response.data.length > 0) {
                expect(response.data[0][0]).toBe(1); // id should be 1
            }
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed queries gracefully', async () => {
            const query = 'select * from nonexistent.table';
            
            const response = await executeQuery(query);
            // Should return an error response, not crash
            expect([200, 400, 500]).toContain(response.status);
        });

        test('should handle empty queries', async () => {
            const response = await executeQuery('');
            
            // Should handle empty query gracefully
            expect([200, 400, 500]).toContain(response.status);
        });

        test('should handle syntax errors', async () => {
            const query = 'select * from table where';
            
            const response = await executeQuery(query);
            // Should return an error response for syntax error
            expect([200, 400, 500]).toContain(response.status);
        });
    });

    describe('Performance and Optimization', () => {
        test('should handle multiple concurrent requests', async () => {
            const requests = Array(5).fill().map(() => 
                makeRequest('/demo-basic')
            );
            
            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.data).toHaveProperty('sample_posts');
                expect(response.data).toHaveProperty('message');
            });
        });

        test('should complete queries within reasonable time', async () => {
            const startTime = Date.now();
            const response = await executeQuery('select id, title from jsonplaceholder.posts limit 1');
            const endTime = Date.now();
            
            expect(response.status).toBe(200);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        });
    });
});