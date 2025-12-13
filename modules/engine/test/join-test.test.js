const Engine = require('../lib/engine');
const http = require('http');
const path = require('path');

describe('JOIN Operations Tests', () => {
    let engine;
    let mockServer1;
    let mockServer2;
    let port1 = 3501;
    let port2 = 3502;

    beforeEach(async () => {
        // Create engine with test tables
        engine = new Engine({
            tables: path.join(__dirname, 'tables'),
            config: path.join(__dirname, 'config/dev.json')
        });

        // Set up mock servers for JOIN testing
        await setupMockServers();
    });

    afterEach(async () => {
        // Clean up mock servers
        if (mockServer1 && mockServer1.listening) {
            await new Promise((resolve) => {
                mockServer1.close(() => {
                    mockServer1 = null;
                    setTimeout(resolve, 100);
                });
            });
        }
        if (mockServer2 && mockServer2.listening) {
            await new Promise((resolve) => {
                mockServer2.close(() => {
                    mockServer2 = null;
                    setTimeout(resolve, 100);
                });
            });
        }
    });

    async function setupMockServers() {
        // Mock Server 1: Users API
        mockServer1 = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            
            if (req.url === '/users') {
                res.end(JSON.stringify([
                    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', department_id: "10" },
                    { id: 2, name: 'Bob Smith', email: 'bob@example.com', department_id: "20" },
                    { id: 3, name: 'Carol Davis', email: 'carol@example.com', department_id: "10" }
                ]));
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        // Mock Server 2: Departments API
        mockServer2 = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            
            if (req.url === '/departments') {
                res.end(JSON.stringify([
                    { id: "10", name: 'Engineering', location: 'Building A' },
                    { id: "20", name: 'Marketing', location: 'Building B' },
                    { id: "30", name: 'Sales', location: 'Building C' }
                ]));
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        // Start servers
        await new Promise((resolve) => {
            mockServer1.listen(port1, resolve);
        });
        await new Promise((resolve) => {
            mockServer2.listen(port2, resolve);
        });
    }

    test('should perform basic JOIN between two API endpoints', async () => {
        const script = `
            create table users 
                on select get from 'http://localhost:${port1}/users'
            
            create table departments 
                on select get from 'http://localhost:${port2}/departments'
            
            users_data = select * from users;
            departments_data = select * from departments;
            
            select u.name as user_name, u.email as user_email, d.name as department_name, d.location as department_location 
            from users_data as u, departments_data as d 
            where u.department_id = d.id
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('JOIN execution failed: ' + err.message));
                        return;
                    }

                    try {
                        // Verify JOIN results
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        

                        expect(result.body.length).toBe(3); // 3 users with matching departments
                        
                        // Verify first result structure (should be objects with aliases as keys)
                        const firstResult = result.body[0];
                        expect(typeof firstResult).toBe('object');
                        expect(firstResult.user_name).toBeDefined();
                        expect(firstResult.user_email).toBeDefined();
                        expect(firstResult.department_name).toBeDefined();
                        expect(firstResult.department_location).toBeDefined();
                        
                        // Verify specific JOIN results
                        const results = result.body;
                        
                        // Alice should be in Engineering
                        const aliceResult = results.find(r => r.user_name === 'Alice Johnson');
                        expect(aliceResult).toBeDefined();
                        expect(aliceResult.department_name).toBe('Engineering');
                        expect(aliceResult.department_location).toBe('Building A');
                        
                        // Bob should be in Marketing
                        const bobResult = results.find(r => r.user_name === 'Bob Smith');
                        expect(bobResult).toBeDefined();
                        expect(bobResult.department_name).toBe('Marketing');
                        expect(bobResult.department_location).toBe('Building B');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('JOIN execution error: ' + err.message));
                });
            });
        });
    }, 20000);

    test('should handle JOIN with WHERE conditions', async () => {
        const script = `
            create table users 
                on select get from 'http://localhost:${port1}/users'
            
            create table departments 
                on select get from 'http://localhost:${port2}/departments'
            
            users_data = select * from users;
            departments_data = select * from departments;
            
            select u.name as user_name, d.name as department_name 
            from users_data as u, departments_data as d 
            where u.department_id = d.id and d.name = 'Engineering'
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('JOIN with WHERE failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        
                        // Should only return users in Engineering department
                        expect(result.body.length).toBe(2); // Alice and Carol
                        
                        // Verify all results are from Engineering
                        result.body.forEach(row => {
                            expect(row.department_name).toBe('Engineering');
                        });
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('JOIN with WHERE error: ' + err.message));
                });
            });
        });
    }, 20000);

    test('should perform JOIN with local data arrays', async () => {
        const script = `
            users = [
                {"id": 1, "name": "Alice", "dept_id": 10},
                {"id": 2, "name": "Bob", "dept_id": 20}
            ];
            
            departments = [
                {"id": 10, "name": "Engineering"},
                {"id": 20, "name": "Marketing"}
            ];
            
            select u.name as user_name, d.name as dept_name 
            from users as u, departments as d 
            where u.dept_id = d.id
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('Local JOIN failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(2);
                        
                        // Verify JOIN results
                        const aliceRow = result.body.find(row => row.user_name === 'Alice');
                        expect(aliceRow).toBeDefined();
                        expect(aliceRow.dept_name).toBe('Engineering');
                        
                        const bobRow = result.body.find(row => row.user_name === 'Bob');
                        expect(bobRow).toBeDefined();
                        expect(bobRow.dept_name).toBe('Marketing');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Local JOIN error: ' + err.message));
                });
            });
        });
    }, 15000);

    test('should handle JOIN with column aliases', async () => {
        const script = `
            users = [
                {"id": 1, "name": "Alice", "dept_id": 10},
                {"id": 2, "name": "Bob", "dept_id": 20}
            ];
            
            departments = [
                {"id": 10, "name": "Engineering", "budget": 100000},
                {"id": 20, "name": "Marketing", "budget": 75000}
            ];
            
            select u.name as employee_name, d.name as department_name, d.budget as dept_budget
            from users as u, departments as d 
            where u.dept_id = d.id
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('JOIN with aliases failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(2);
                        
                        // Verify structure with aliases
                        result.body.forEach(row => {
                            expect(typeof row).toBe('object'); // Should be object with alias keys
                            expect(typeof row.employee_name).toBe('string'); // employee name
                            expect(typeof row.department_name).toBe('string'); // department name
                            expect(typeof row.dept_budget).toBe('number'); // budget
                        });
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('JOIN with aliases error: ' + err.message));
                });
            });
        });
    }, 15000);

    test('should handle empty JOIN results gracefully', async () => {
        const script = `
            users = [
                {"id": 1, "name": "Alice", "dept_id": 99}
            ];
            
            departments = [
                {"id": 10, "name": "Engineering"}
            ];
            
            select u.name as user_name, d.name as dept_name 
            from users as u, departments as d 
            where u.dept_id = d.id
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('Empty JOIN test failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(0); // No matching records
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Empty JOIN error: ' + err.message));
                });
            });
        });
    }, 15000);
});