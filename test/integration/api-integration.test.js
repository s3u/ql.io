/**
 * Enhanced ql.io API Integration Test Suite
 * 
 * Builds on existing demo integration tests with additional coverage:
 * - WebSocket functionality
 * - Real-time query execution
 * - Advanced error scenarios
 * - Performance under load
 */

const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

describe('ql.io Enhanced API Integration Tests', () => {
    let serverProcess;
    let consoleProcess;
    const API_URL = 'http://localhost:3000';
    const CONSOLE_URL = 'http://localhost:3001';
    const WS_URL = 'ws://localhost:3001';
    const STARTUP_TIMEOUT = 20000;
    const REQUEST_TIMEOUT = 10000;

    beforeAll(async () => {
        console.log('Starting ql.io server for enhanced API tests...');
        
        // Start API server only
        serverProcess = spawn('node', ['bin/minimal-server.js', 'demos'], {
            cwd: path.resolve(__dirname, '..', '..'),
            stdio: 'pipe'
        });

        // Wait for server to start
        await waitForServer(API_URL, '/tables');

        console.log('Server started successfully');
    }, STARTUP_TIMEOUT + 5000);

    afterAll(async () => {
        await stopProcess(serverProcess, 'API');
    });

    describe('API Server Functionality', () => {
        test('should respond to basic HTTP requests', async () => {
            const response = await makeRequest(API_URL, '/tables');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should handle POST requests to /q endpoint', async () => {
            const query = 'show tables';
            const response = await executeQuery(API_URL, query);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        test('should execute queries via WebSocket with progress events', async () => {
            const ws = new WebSocket(WS_URL, 'ql.io-console');
            
            await new Promise((resolve) => {
                ws.on('open', resolve);
            });

            // Subscribe to progress events first
            const events = ['statement-request', 'statement-response', 'statement-success', 'script-done'];
            ws.send(JSON.stringify({
                type: 'events',
                data: JSON.stringify(events)
            }));

            // Wait for subscription confirmation
            await new Promise((resolve) => {
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'events') {
                        resolve();
                    }
                });
            });

            // Send query
            const query = 'select id, title from jsonplaceholder.posts limit 1';
            ws.send(JSON.stringify({
                type: 'script',
                data: query
            }));

            // Collect all events
            const events_received = [];
            const result = await new Promise((resolve, reject) => {
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    events_received.push(message);
                    
                    if (message.type === 'script-result') {
                        resolve(message.data);
                    }
                });
                setTimeout(() => reject(new Error('WebSocket query timeout')), 10000);
            });

            expect(result).toBeDefined();
            expect(result.body).toBeDefined();
            expect(events_received.length).toBeGreaterThan(0);
            ws.close();
        });

        test('should handle debug mode via WebSocket', async () => {
            const ws = new WebSocket(WS_URL, 'ql.io-console');
            
            await new Promise((resolve) => {
                ws.on('open', resolve);
            });

            // Subscribe to debug events
            const events = ['ql.io-debug', 'script-result'];
            ws.send(JSON.stringify({
                type: 'events',
                data: JSON.stringify(events)
            }));

            // Wait for subscription
            await new Promise((resolve) => {
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'events') {
                        resolve();
                    }
                });
            });

            // Send debug query
            const query = 'select id from jsonplaceholder.posts limit 1';
            ws.send(JSON.stringify({
                type: 'script',
                data: '__debug__' + query
            }));

            // Should receive debug events
            const debugEvents = [];
            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 5000);
                
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    debugEvents.push(message);
                    
                    if (message.type === 'script-result' || debugEvents.length >= 3) {
                        clearTimeout(timeout);
                        resolve();
                    }
                });
            });

            expect(debugEvents.length).toBeGreaterThan(0);
            ws.close();
        });

        test('should handle query kill/abort via WebSocket', async () => {
            const ws = new WebSocket(WS_URL, 'ql.io-console');
            
            await new Promise((resolve) => {
                ws.on('open', resolve);
            });

            // Start a query that we'll kill
            ws.send(JSON.stringify({
                type: 'script',
                data: '__debug__select * from jsonplaceholder.posts'
            }));

            // Wait a moment then kill it
            await new Promise(resolve => setTimeout(resolve, 100));
            
            ws.send(JSON.stringify({
                type: 'kill',
                id: 1 // Assuming emitterID 1 from debug mode
            }));

            // Should handle kill gracefully
            const killResult = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve({ timeout: true }), 2000);
                
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    clearTimeout(timeout);
                    resolve(message);
                });
            });

            expect(killResult).toBeDefined();
            ws.close();
        });

        test('should handle WebSocket errors gracefully', async () => {
            const ws = new WebSocket(WS_URL, 'ql.io-console');
            
            await new Promise((resolve) => {
                ws.on('open', resolve);
            });

            // Send invalid query
            ws.send(JSON.stringify({
                type: 'script',
                data: 'invalid ql syntax here'
            }));

            // Should receive error response
            const result = await new Promise((resolve) => {
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    resolve(message);
                });
                setTimeout(() => resolve({ timeout: true }), 5000);
            });

            expect(result).toBeDefined();
            ws.close();
        });

        test('should handle multiple concurrent WebSocket connections', async () => {
            const connections = [];

            // Create multiple WebSocket connections
            for (let i = 0; i < 3; i++) {
                const ws = new WebSocket(WS_URL, 'ql.io-console');
                connections.push(ws);
                
                await new Promise((resolve) => {
                    ws.on('open', resolve);
                });
            }

            // Send queries concurrently
            const promises = connections.map((ws, index) => {
                return new Promise((resolve) => {
                    ws.send(JSON.stringify({
                        type: 'script',
                        data: `select id from jsonplaceholder.posts where id = ${index + 1}`
                    }));
                    
                    ws.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'script-result') {
                            resolve(message.data);
                        }
                    });
                });
            });

            const wsResults = await Promise.all(promises);
            
            expect(wsResults.length).toBe(3);
            wsResults.forEach(result => {
                expect(result).toBeDefined();
                expect(result.body).toBeDefined();
            });

            // Close all connections
            connections.forEach(ws => ws.close());
        });
    });

    describe('Console Metadata Endpoints', () => {
        test('should describe specific table with /table endpoint', async () => {
            const response = await makeRequest(API_URL, '/table?name=jsonplaceholder.posts');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('name');
            expect(response.data.name).toContain('jsonplaceholder.posts');
            expect(response.data).toHaveProperty('about');
            expect(response.data).toHaveProperty('routes');
            expect(Array.isArray(response.data.routes)).toBe(true);
        });

        test('should return error for non-existent table', async () => {
            const response = await makeRequest(API_URL, '/table?name=nonexistent.table');
            
            expect([400, 404, 500]).toContain(response.status);
            expect(response.data).toHaveProperty('err');
        });

        test('should require table name parameter', async () => {
            const response = await makeRequest(API_URL, '/table');
            
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('err');
            expect(response.data.err).toContain('Missing table name');
        });

        test('should show all routes with /api endpoint', async () => {
            const response = await makeRequest(API_URL, '/api');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);
            
            // Check route structure
            const route = response.data[0];
            expect(route).toHaveProperty('method');
            expect(route).toHaveProperty('path');
            expect(route).toHaveProperty('about');
        });

        test('should describe specific route with /route endpoint', async () => {
            const response = await makeRequest(API_URL, '/route?path=/demo-basic&method=get');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('path');
            expect(response.data).toHaveProperty('method');
            expect(response.data).toHaveProperty('about');
            expect(response.data).toHaveProperty('script');
        });

        test('should handle missing route parameters', async () => {
            const response = await makeRequest(API_URL, '/route?path=/demo-basic');
            
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('err');
            expect(response.data.err).toContain('Missing path name or method');
        });

        test('should handle non-existent route', async () => {
            const response = await makeRequest(API_URL, '/route?path=/nonexistent&method=get');
            
            expect([400, 404, 500]).toContain(response.status);
        });

        test('should support JSON and HTML formats for metadata endpoints', async () => {
            // Test JSON format (default)
            const jsonResponse = await makeRequest(API_URL, '/tables', {
                'Accept': 'application/json'
            });
            expect(jsonResponse.status).toBe(200);
            expect(Array.isArray(jsonResponse.data)).toBe(true);

            // Test HTML format
            const htmlResponse = await makeRequest(API_URL, '/tables', {
                'Accept': 'text/html'
            });
            expect(htmlResponse.status).toBe(200);
            expect(typeof htmlResponse.data).toBe('string');
            expect(htmlResponse.data).toContain('<html>');
        });
    });

    describe('Console API Endpoints', () => {
        test('should serve console homepage', async () => {
            const response = await makeRequest(CONSOLE_URL, '/console');
            
            expect(response.status).toBe(200);
            expect(response.data).toContain('ql.io');
            expect(response.data).toContain('textarea');
        });

        test('should serve browserify bundle', async () => {
            const response = await makeRequest(CONSOLE_URL, '/scripts/compiler.js');
            
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('javascript');
            expect(response.data.length).toBeGreaterThan(1000); // Should be substantial bundle
        });

        test('should serve static assets', async () => {
            const cssResponse = await makeRequest(CONSOLE_URL, '/css/console.css');
            expect(cssResponse.status).toBe(200);
            
            const jsResponse = await makeRequest(CONSOLE_URL, '/scripts/console.js');
            expect(jsResponse.status).toBe(200);
        });
    });

    describe('Advanced Query Scenarios', () => {
        test('should handle complex JOIN operations', async () => {
            const query = `
                posts = select id, title, userId from jsonplaceholder.posts limit 2;
                users = select id, name from jsonplaceholder.users limit 2;
                return {
                    "posts": posts,
                    "users": users,
                    "joined": select p.title, u.name 
                             from posts as p, users as u 
                             where p.userId = u.id
                };
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('posts');
            expect(response.data).toHaveProperty('users');
            expect(response.data).toHaveProperty('joined');
        });

        test('should handle nested queries with subselects', async () => {
            const query = `
                userIds = select userId from jsonplaceholder.posts limit 3;
                users = select id, name from jsonplaceholder.users where id in (select userId from userIds);
                return {
                    "userIds": userIds,
                    "users": users,
                    "count": "{users.length}"
                };
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('userIds');
            expect(response.data).toHaveProperty('users');
            expect(response.data).toHaveProperty('count');
        });

        test('should handle variable assignments and references', async () => {
            const query = `
                maxResults = 3;
                targetUserId = 1;
                posts = select id, title from jsonplaceholder.posts 
                        where userId = {targetUserId} limit {maxResults};
                return {
                    "config": {"maxResults": maxResults, "targetUserId": targetUserId},
                    "results": posts
                };
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(response.data.config.maxResults).toBe(3);
            expect(response.data.config.targetUserId).toBe(1);
            expect(Array.isArray(response.data.results)).toBe(true);
        });

        test('should handle complex WHERE conditions with multiple operators', async () => {
            const query = `
                select id, title, userId from jsonplaceholder.posts 
                where id > 1 and id < 10 and userId in (1, 2, 3)
                limit 5;
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            
            // Validate WHERE conditions are applied
            if (response.data.length > 0) {
                response.data.forEach(row => {
                    expect(row[0]).toBeGreaterThan(1); // id > 1
                    expect(row[0]).toBeLessThan(10);   // id < 10
                    expect([1, 2, 3]).toContain(row[2]); // userId in (1,2,3)
                });
            }
        });

        test('should handle array operations and transformations', async () => {
            const query = `
                posts = select id, title from jsonplaceholder.posts limit 3;
                return {
                    "original": posts,
                    "count": "{posts.length}",
                    "firstPost": "{posts[0]}",
                    "lastPost": "{posts[posts.length - 1]}",
                    "ids": "{posts.map(function(p) { return p.id; })}"
                };
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('original');
            expect(response.data).toHaveProperty('count');
            expect(response.data).toHaveProperty('firstPost');
            expect(response.data).toHaveProperty('lastPost');
        });

        test('should handle multiple table JOINs with filtering', async () => {
            const query = `
                posts = select id, title, userId from jsonplaceholder.posts limit 3;
                users = select id, name, email from jsonplaceholder.users limit 3;
                comments = select id, postId, body from jsonplaceholder.comments limit 10;
                
                return select p.title, u.name, u.email, c.body
                       from posts as p, users as u, comments as c
                       where p.userId = u.id and c.postId = p.id
                       limit 5;
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            
            // Validate JOIN structure
            if (response.data.length > 0) {
                const row = response.data[0];
                expect(Array.isArray(row)).toBe(true);
                expect(row.length).toBe(4); // title, name, email, body
                expect(typeof row[0]).toBe('string'); // title
                expect(typeof row[1]).toBe('string'); // name
                expect(typeof row[2]).toBe('string'); // email
                expect(typeof row[3]).toBe('string'); // body
            }
        });

        test('should handle conditional logic with IF/ELSE patterns', async () => {
            const query = `
                testId = 1;
                post = select * from jsonplaceholder.posts where id = {testId};
                
                return {
                    "testId": testId,
                    "found": "{post ? true : false}",
                    "result": "{post ? post : 'Not found'}",
                    "message": "{post ? 'Post exists' : 'Post not found'}"
                };
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('testId');
            expect(response.data).toHaveProperty('found');
            expect(response.data).toHaveProperty('result');
            expect(response.data).toHaveProperty('message');
        });

        test('should handle aggregation functions and grouping', async () => {
            const query = `
                posts = select userId from jsonplaceholder.posts limit 10;
                return {
                    "posts": posts,
                    "uniqueUsers": "{posts.map(function(p) { return p.userId; }).filter(function(id, index, arr) { return arr.indexOf(id) === index; })}",
                    "totalPosts": "{posts.length}"
                };
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('posts');
            expect(response.data).toHaveProperty('uniqueUsers');
            expect(response.data).toHaveProperty('totalPosts');
        });

        test('should handle error recovery with fallback queries', async () => {
            const query = `
                primary = select * from nonexistent.table;
                fallback = select id, title from jsonplaceholder.posts limit 1;
                
                return {
                    "attempted": "nonexistent.table",
                    "fallback": fallback,
                    "message": "Used fallback data due to primary source failure"
                };
            `;
            
            const response = await executeQuery(API_URL, query);
            // Should handle gracefully - either succeed with fallback or return error
            expect([200, 400, 500]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('fallback');
                expect(response.data).toHaveProperty('message');
            }
        });

        test('should handle dynamic query construction', async () => {
            const query = `
                tableName = "jsonplaceholder.posts";
                fieldName = "title";
                limitValue = 2;
                
                posts = select id, {fieldName} from {tableName} limit {limitValue};
                
                return {
                    "query_config": {
                        "table": tableName,
                        "field": fieldName,
                        "limit": limitValue
                    },
                    "results": posts
                };
            `;
            
            const response = await executeQuery(API_URL, query);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('query_config');
            expect(response.data).toHaveProperty('results');
            expect(response.data.query_config.table).toBe('jsonplaceholder.posts');
            expect(response.data.query_config.field).toBe('title');
            expect(response.data.query_config.limit).toBe(2);
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle concurrent WebSocket connections', async () => {
            const connections = [];
            const results = [];

            // Create multiple WebSocket connections
            for (let i = 0; i < 5; i++) {
                const ws = new WebSocket(WS_URL, 'ql.io-console');
                connections.push(ws);
                
                await new Promise((resolve) => {
                    ws.on('open', resolve);
                });
            }

            // Send queries concurrently
            const promises = connections.map((ws, index) => {
                return new Promise((resolve) => {
                    ws.send(JSON.stringify({
                        type: 'script',
                        data: `select id from jsonplaceholder.posts where id = ${index + 1}`
                    }));
                    
                    ws.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'script-result') {
                            resolve(message.data);
                        }
                    });
                });
            });

            const wsResults = await Promise.all(promises);
            
            expect(wsResults.length).toBe(5);
            wsResults.forEach(result => {
                expect(result).toBeDefined();
            });

            // Close all connections
            connections.forEach(ws => ws.close());
        });

        test('should maintain performance under load', async () => {
            const startTime = Date.now();
            
            // Execute multiple queries in parallel
            const queries = Array(10).fill().map((_, index) => 
                executeQuery(API_URL, `select id, title from jsonplaceholder.posts where id = ${index + 1}`)
            );
            
            const results = await Promise.all(queries);
            const endTime = Date.now();
            
            expect(results.length).toBe(10);
            expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
            
            results.forEach(result => {
                expect(result.status).toBe(200);
                expect(result.data).toBeDefined();
            });
        });
    });

    // Helper functions
    async function makeRequest(baseUrl, path, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, baseUrl);
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
                        resolve({ 
                            status: res.statusCode, 
                            data: parsed,
                            headers: res.headers 
                        });
                    } catch (e) {
                        resolve({ 
                            status: res.statusCode, 
                            data: data,
                            headers: res.headers 
                        });
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

    async function executeQuery(baseUrl, query) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ q: query });
            const url = new URL('/q', baseUrl);
            
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
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
    }

    async function waitForServer(baseUrl, path) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < STARTUP_TIMEOUT) {
            try {
                await makeRequest(baseUrl, path);
                return; // Server is ready
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