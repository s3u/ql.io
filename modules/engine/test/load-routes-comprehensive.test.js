/*
 * Load Routes Comprehensive Test Suite
 * Target: Improve coverage from 14.63% to 60%+
 */

'use strict';

const loadRoutes = require('../lib/engine/load-routes.js');
const fs = require('fs');
const path = require('path');

describe('Load Routes Comprehensive Tests', () => {
    let originalConsoleLog;
    let mockLogEmitter;
    let testRoutesDir;
    
    beforeEach(() => {
        // Suppress console.log during tests
        originalConsoleLog = console.log;
        console.log = jest.fn();
        
        // Mock log emitter
        mockLogEmitter = {
            emitEvent: jest.fn(),
            emitError: jest.fn(),
            emitWarning: jest.fn()
        };
        
        // Create test routes directory
        testRoutesDir = path.join(__dirname, 'test-routes');
        if (!fs.existsSync(testRoutesDir)) {
            fs.mkdirSync(testRoutesDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Restore console.log
        console.log = originalConsoleLog;
        
        // Cleanup test routes directory
        if (fs.existsSync(testRoutesDir)) {
            fs.rmSync(testRoutesDir, { recursive: true, force: true });
        }
    });

    describe('Basic Route Loading', () => {
        test('should load routes from valid directory', () => {
            // Create a test route file
            const routeContent = `
                // Test route for users
                users = select * from users;
                return users route "/api/users";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'users.ql'), routeContent);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toBeDefined();
            expect(result.simpleMap).toBeDefined();
            expect(result.verbMap).toBeDefined();
            expect(mockLogEmitter.emitEvent).toHaveBeenCalled();
        });

        test('should return empty object when no routes directory provided', () => {
            const opts = {
                routes: null,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toEqual({});
        });

        test('should handle non-existent routes directory', () => {
            const opts = {
                routes: '/non/existent/path',
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toBeDefined();
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Unable to load routes from')
            );
        });
    });

    describe('Route File Processing', () => {
        test('should process valid QL route files', () => {
            const routeContent = `
                // Get user by ID
                user = select * from users where id = "{id}";
                return user route "/api/users/{id}";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'user-by-id.ql'), routeContent);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {
                    users: { routes: [] }
                }
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result.verbMap).toBeDefined();
            expect(result.simpleMap).toBeDefined();
            expect(Object.keys(result.verbMap)).toContain('/api/users/:id');
        });

        test('should handle route files with query parameters', () => {
            const routeContent = `
                // Search users with pagination
                users = select * from users where active = true;
                return users route "/api/users?limit={limit}&offset={offset}";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'users-search.ql'), routeContent);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result.verbMap).toBeDefined();
            expect(Object.keys(result.verbMap)).toContain('/api/users');
        });

        test('should handle different HTTP methods', () => {
            const getRoute = `
                users = select * from users;
                return users route get "/api/users";
            `;
            
            const postRoute = `
                result = insert into users values ("{userData}");
                return result route post "/api/users";
            `;
            
            const deleteRoute = `
                result = delete from users where id = "{id}";
                return result route delete "/api/users/{id}";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'users-get.ql'), getRoute);
            fs.writeFileSync(path.join(testRoutesDir, 'users-post.ql'), postRoute);
            fs.writeFileSync(path.join(testRoutesDir, 'users-delete.ql'), deleteRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result.verbMap['/api/users']).toBeDefined();
            expect(result.verbMap['/api/users'].get).toBeDefined();
            expect(result.verbMap['/api/users'].post).toBeDefined();
            expect(result.verbMap['/api/users/:id']).toBeDefined();
            expect(result.verbMap['/api/users/:id'].del).toBeDefined(); // delete becomes del
        });
    });

    describe('Route Compilation and Validation', () => {
        test('should handle compilation errors gracefully', () => {
            const invalidRoute = `
                // Invalid QL syntax
                invalid syntax here;
                return something route "/api/invalid";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'invalid.ql'), invalidRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toBeDefined();
            expect(mockLogEmitter.emitWarning).toHaveBeenCalledWith(
                expect.stringContaining('Error loading route')
            );
        });

        test('should handle routes without return statements', () => {
            const noReturnRoute = `
                // Route without return
                users = select * from users;
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'no-return.ql'), noReturnRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toBeDefined();
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining("Script doesn't contain route information")
            );
        });

        test('should handle routes without route information', () => {
            const noRouteInfo = `
                users = select * from users;
                return users;
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'no-route-info.ql'), noRouteInfo);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toBeDefined();
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining("Script doesn't contain route information")
            );
        });
    });

    describe('Nested Directory Processing', () => {
        test('should process routes in nested directories', () => {
            const nestedDir = path.join(testRoutesDir, 'v1', 'admin');
            fs.mkdirSync(nestedDir, { recursive: true });
            
            const nestedRoute = `
                // Admin users route
                adminUsers = select * from users where role = "admin";
                return adminUsers route "/api/v1/admin/users";
            `;
            
            fs.writeFileSync(path.join(nestedDir, 'admin-users.ql'), nestedRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result.verbMap).toBeDefined();
            expect(Object.keys(result.verbMap)).toContain('/api/v1/admin/users');
        });

        test('should skip non-QL files', () => {
            fs.writeFileSync(path.join(testRoutesDir, 'readme.txt'), 'This is not a QL file');
            fs.writeFileSync(path.join(testRoutesDir, 'config.json'), '{"test": true}');
            
            const validRoute = `
                users = select * from users;
                return users route "/api/users";
            `;
            fs.writeFileSync(path.join(testRoutesDir, 'users.ql'), validRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result.verbMap).toBeDefined();
            expect(Object.keys(result.verbMap)).toContain('/api/users');
            // Should only process .ql files
        });
    });

    describe('Route Information Extraction', () => {
        test('should extract route comments as info', () => {
            const commentedRoute = `
                // This route gets all active users
                // It supports pagination via limit and offset
                // Returns user data in JSON format
                users = select * from users where active = true;
                return users route "/api/users";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'commented.ql'), commentedRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result.verbMap['/api/users']).toBeDefined();
            expect(result.verbMap['/api/users'].get[0].info).toBeDefined();
            expect(result.verbMap['/api/users'].get[0].info).toContain('active users');
        });

        test('should extract table dependencies', () => {
            const multiTableRoute = `
                // Route using multiple tables
                users = select * from users;
                posts = select * from posts where user_id in (select id from users);
                return posts route "/api/user-posts";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'multi-table.ql'), multiTableRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {
                    users: { routes: [] },
                    posts: { routes: [] }
                }
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result.verbMap['/api/user-posts']).toBeDefined();
            expect(result.verbMap['/api/user-posts'].get[0].tables).toBeDefined();
            expect(result.verbMap['/api/user-posts'].get[0].tables).toContain('users');
            expect(result.verbMap['/api/user-posts'].get[0].tables).toContain('posts');
        });
    });

    describe('Query Parameter Processing', () => {
        test('should handle valid query parameters with braces', () => {
            const queryRoute = `
                users = select * from users;
                return users route "/api/users?limit={limit}&sort={sort}";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'query-params.ql'), queryRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result.verbMap['/api/users']).toBeDefined();
            expect(result.verbMap['/api/users'].get[0].query).toBeDefined();
            expect(result.verbMap['/api/users'].get[0].query.limit).toBe('limit');
            expect(result.verbMap['/api/users'].get[0].query.sort).toBe('sort');
        });

        test('should handle invalid query parameters without braces', () => {
            const invalidQueryRoute = `
                users = select * from users;
                return users route "/api/users?limit=invalid&sort={sort}";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'invalid-query.ql'), invalidQueryRoute);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Invalid query string, {} missing')
            );
        });
    });

    describe('Duplicate Route Handling', () => {
        test('should detect and report duplicate routes', () => {
            const route1 = `
                users = select * from users;
                return users route "/api/users";
            `;
            
            const route2 = `
                allUsers = select * from users;
                return allUsers route "/api/users";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'users1.ql'), route1);
            fs.writeFileSync(path.join(testRoutesDir, 'users2.ql'), route2);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Route already defined')
            );
        });
    });

    describe('Table Route Association', () => {
        test('should associate routes with table definitions', () => {
            const tableRoute = `
                users = select * from users;
                return users route "/api/users";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'table-assoc.ql'), tableRoute);
            
            const mockTable = { routes: [] };
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {
                    users: mockTable
                }
            };
            
            const result = loadRoutes.load(opts);
            
            expect(mockTable.routes).toBeDefined();
            expect(mockTable.routes.length).toBeGreaterThan(0);
            expect(mockTable.routes[0]).toContain('/route?path=');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle empty route files', () => {
            fs.writeFileSync(path.join(testRoutesDir, 'empty.ql'), '');
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toBeDefined();
            expect(mockLogEmitter.emitWarning).toHaveBeenCalled();
        });

        test('should handle files with only comments', () => {
            const commentOnlyFile = `
                // This file only has comments
                /* No actual QL code here */
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'comments-only.ql'), commentOnlyFile);
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toBeDefined();
            expect(mockLogEmitter.emitWarning).toHaveBeenCalled();
        });

        test('should handle permission errors gracefully', () => {
            // This test simulates permission errors by mocking fs.readdirSync
            const originalReaddirSync = fs.readdirSync;
            fs.readdirSync = jest.fn().mockImplementation(() => {
                throw new Error('Permission denied');
            });
            
            const opts = {
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            };
            
            const result = loadRoutes.load(opts);
            
            expect(result).toBeDefined();
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Unable to load routes from')
            );
            
            // Restore original function
            fs.readdirSync = originalReaddirSync;
        });
    });
});