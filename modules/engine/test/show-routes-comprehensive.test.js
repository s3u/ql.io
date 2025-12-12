/*
 * Show Routes Comprehensive Test Suite
 * Target: Improve coverage from 15% to 60%+
 */

'use strict';

const showRoutes = require('../lib/engine/show-routes.js');

describe('Show Routes Comprehensive Tests', () => {
    let originalConsoleLog;
    
    beforeEach(() => {
        // Suppress console.log during tests
        originalConsoleLog = console.log;
        console.log = jest.fn();
    });

    afterEach(() => {
        // Restore console.log
        console.log = originalConsoleLog;
    });

    describe('Basic Show Routes Functionality', () => {
        test('should execute show routes with valid routes', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/users': {
                        routeInfo: {
                            path: { value: '/api/users' },
                            method: 'get'
                        },
                        info: 'Get all users'
                    },
                    'post:/api/users': {
                        routeInfo: {
                            path: { value: '/api/users' },
                            method: 'post'
                        },
                        info: 'Create a new user'
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                expect(result.headers).toBeDefined();
                expect(result.headers['content-type']).toBe('application/json');
                expect(result.body).toBeDefined();
                expect(Array.isArray(result.body)).toBe(true);
                expect(result.body.length).toBe(2);
                done();
            });
        });

        test('should handle empty routes', (done) => {
            const mockRoutes = {
                simpleMap: {}
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                expect(result.body).toBeDefined();
                expect(Array.isArray(result.body)).toBe(true);
                expect(result.body.length).toBe(0);
                done();
            });
        });

        test('should assign routes to context when statement has assign', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/test': {
                        routeInfo: {
                            path: { value: '/api/test' },
                            method: 'get'
                        },
                        info: 'Test route'
                    }
                }
            };

            const context = {};
            const opts = {
                routes: mockRoutes,
                context: context
            };

            const statement = {
                assign: 'allRoutes'
            };

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                expect(context.allRoutes).toBeDefined();
                expect(context.allRoutes).toBe(mockRoutes);
                done();
            });
        });
    });

    describe('Route Information Processing', () => {
        test('should format route information correctly', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/users/{id}': {
                        routeInfo: {
                            path: { value: '/api/users/{id}' },
                            method: 'get'
                        },
                        info: '<p>Get user by ID</p>'
                    },
                    'delete:/api/users/{id}': {
                        routeInfo: {
                            path: { value: '/api/users/{id}' },
                            method: 'delete'
                        },
                        info: '<p>Delete user by ID</p>'
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(2);
                
                const route1 = result.body[0];
                expect(route1.path).toBe('/api/users/{id}');
                expect(route1.method).toBe('get'); // First route alphabetically
                expect(route1.about).toContain('/route?path=');
                expect(route1.about).toContain('method=get');
                expect(route1.info).toBe('<p>Get user by ID</p>');
                
                const route2 = result.body[1];
                expect(route2.path).toBe('/api/users/{id}');
                expect(route2.method).toBe('delete');
                expect(route2.about).toContain('/route?path=');
                expect(route2.about).toContain('method=delete');
                expect(route2.info).toBe('<p>Delete user by ID</p>');
                
                done();
            });
        });

        test('should handle routes with special characters in path', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/search?q={query}&limit={limit}': {
                        routeInfo: {
                            path: { value: '/api/search?q={query}&limit={limit}' },
                            method: 'get'
                        },
                        info: 'Search with query parameters'
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(1);
                
                const route = result.body[0];
                expect(route.path).toBe('/api/search?q={query}&limit={limit}');
                expect(route.about).toContain(encodeURIComponent('/api/search?q={query}&limit={limit}'));
                
                done();
            });
        });

        test('should handle routes with no info', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/minimal': {
                        routeInfo: {
                            path: { value: '/api/minimal' },
                            method: 'get'
                        }
                        // No info property
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(1);
                
                const route = result.body[0];
                expect(route.path).toBe('/api/minimal');
                expect(route.method).toBe('get');
                expect(route.info).toBeUndefined();
                
                done();
            });
        });
    });

    describe('Route Sorting', () => {
        test('should sort routes alphabetically by path', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/zebra': {
                        routeInfo: {
                            path: { value: '/api/zebra' },
                            method: 'get'
                        },
                        info: 'Zebra route'
                    },
                    'get:/api/alpha': {
                        routeInfo: {
                            path: { value: '/api/alpha' },
                            method: 'get'
                        },
                        info: 'Alpha route'
                    },
                    'get:/api/beta': {
                        routeInfo: {
                            path: { value: '/api/beta' },
                            method: 'get'
                        },
                        info: 'Beta route'
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(3);
                
                // Should be sorted alphabetically
                expect(result.body[0].path).toBe('/api/alpha');
                expect(result.body[1].path).toBe('/api/beta');
                expect(result.body[2].path).toBe('/api/zebra');
                
                done();
            });
        });

        test('should handle case-insensitive sorting', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/UPPER': {
                        routeInfo: {
                            path: { value: '/api/UPPER' },
                            method: 'get'
                        },
                        info: 'Upper case route'
                    },
                    'get:/api/lower': {
                        routeInfo: {
                            path: { value: '/api/lower' },
                            method: 'get'
                        },
                        info: 'Lower case route'
                    },
                    'get:/api/Mixed': {
                        routeInfo: {
                            path: { value: '/api/Mixed' },
                            method: 'get'
                        },
                        info: 'Mixed case route'
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(3);
                
                // Should be sorted case-insensitively
                expect(result.body[0].path).toBe('/api/lower');
                expect(result.body[1].path).toBe('/api/Mixed');
                expect(result.body[2].path).toBe('/api/UPPER');
                
                done();
            });
        });
    });

    describe('Error Handling', () => {
        test('should throw error when routes is undefined', () => {
            const opts = {
                routes: undefined,
                context: {}
            };

            const statement = {};

            expect(() => {
                showRoutes.exec(opts, statement, null, () => {});
            }).toThrow('Argument routes can not be undefined');
        });

        test('should throw error when statement is undefined', () => {
            const opts = {
                routes: { simpleMap: {} },
                context: {}
            };

            expect(() => {
                showRoutes.exec(opts, undefined, null, () => {});
            }).toThrow('Argument statement can not be undefined');
        });

        test('should throw error when callback is undefined', () => {
            const opts = {
                routes: { simpleMap: {} },
                context: {}
            };

            const statement = {};

            expect(() => {
                showRoutes.exec(opts, statement, null, undefined);
            }).toThrow('Argument cb can not be undefined');
        });
    });

    describe('Complex Route Scenarios', () => {
        test('should handle large number of routes', (done) => {
            const mockRoutes = {
                simpleMap: {}
            };

            // Generate 100 routes
            for (let i = 0; i < 100; i++) {
                const key = `get:/api/route${i.toString().padStart(3, '0')}`;
                mockRoutes.simpleMap[key] = {
                    routeInfo: {
                        path: { value: `/api/route${i.toString().padStart(3, '0')}` },
                        method: 'get'
                    },
                    info: `Route number ${i}`
                };
            }

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            const startTime = Date.now();
            showRoutes.exec(opts, statement, null, (err, result) => {
                const endTime = Date.now();
                
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(100);
                expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
                
                // Verify sorting
                for (let i = 1; i < result.body.length; i++) {
                    expect(result.body[i].path.toLowerCase() >= result.body[i-1].path.toLowerCase()).toBe(true);
                }
                
                done();
            });
        });

        test('should handle routes with identical paths but different methods', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/resource': {
                        routeInfo: {
                            path: { value: '/api/resource' },
                            method: 'get'
                        },
                        info: 'Get resource'
                    },
                    'post:/api/resource': {
                        routeInfo: {
                            path: { value: '/api/resource' },
                            method: 'post'
                        },
                        info: 'Create resource'
                    },
                    'put:/api/resource': {
                        routeInfo: {
                            path: { value: '/api/resource' },
                            method: 'put'
                        },
                        info: 'Update resource'
                    },
                    'delete:/api/resource': {
                        routeInfo: {
                            path: { value: '/api/resource' },
                            method: 'delete'
                        },
                        info: 'Delete resource'
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(4);
                
                // All should have the same path but different methods
                result.body.forEach(route => {
                    expect(route.path).toBe('/api/resource');
                });
                
                const methods = result.body.map(route => route.method);
                expect(methods).toContain('get');
                expect(methods).toContain('post');
                expect(methods).toContain('put');
                expect(methods).toContain('delete');
                
                done();
            });
        });

        test('should handle routes with complex info containing HTML', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/complex': {
                        routeInfo: {
                            path: { value: '/api/complex' },
                            method: 'get'
                        },
                        info: '<h1>Complex Route</h1><p>This route has <strong>HTML</strong> content.</p><ul><li>Feature 1</li><li>Feature 2</li></ul>'
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(1);
                
                const route = result.body[0];
                expect(route.info).toContain('<h1>Complex Route</h1>');
                expect(route.info).toContain('<strong>HTML</strong>');
                expect(route.info).toContain('<ul><li>Feature 1</li>');
                
                done();
            });
        });
    });

    describe('URL Encoding', () => {
        test('should properly encode special characters in about URLs', (done) => {
            const mockRoutes = {
                simpleMap: {
                    'get:/api/search?q={query}&tags={tags}': {
                        routeInfo: {
                            path: { value: '/api/search?q={query}&tags={tags}' },
                            method: 'get'
                        },
                        info: 'Search with special characters'
                    }
                }
            };

            const opts = {
                routes: mockRoutes,
                context: {}
            };

            const statement = {};

            showRoutes.exec(opts, statement, null, (err, result) => {
                expect(err).toBeNull();
                expect(result.body).toBeDefined();
                expect(result.body.length).toBe(1);
                
                const route = result.body[0];
                expect(route.about).toContain(encodeURIComponent('/api/search?q={query}&tags={tags}'));
                expect(route.about).toContain('method=get');
                
                done();
            });
        });
    });
});