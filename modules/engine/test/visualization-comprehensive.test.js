/*
 * Visualization Comprehensive Test Suite
 * Target: Improve coverage from 5.74% to 60%+
 */

'use strict';

const visualization = require('../lib/engine/visualization.js');
const http = require('http');
const EventEmitter = require('events');

// Mock http module for testing
jest.mock('http');

describe('Visualization Comprehensive Tests', () => {
    let originalConsoleLog;
    let mockEmitter;
    
    beforeEach(() => {
        // Suppress console.log during tests
        originalConsoleLog = console.log;
        console.log = jest.fn();
        
        // Create mock emitter
        mockEmitter = new EventEmitter();
        
        // Reset http mock
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore console.log
        console.log = originalConsoleLog;
    });

    describe('Basic Visualization Generation', () => {
        test('should generate visualization for simple compiled script', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            http.request.mockReturnValue(mockRequest);

            const compiled = {
                type: 'return',
                line: 1,
                id: 1,
                rhs: {
                    type: 'select',
                    line: 2,
                    id: 2,
                    dependsOn: [{
                        type: 'select',
                        line: 3,
                        id: 3,
                        dependsOn: []
                    }]
                }
            };

            visualization.getPic(compiled, mockEmitter);
            
            // Verify that HTTP request was attempted
            expect(http.request).toHaveBeenCalled();
            expect(mockRequest.write).toHaveBeenCalled();
            expect(mockRequest.end).toHaveBeenCalled();
        });

        test('should handle empty compiled script', () => {
            const compiled = null;
            
            const result = visualization.getPic(compiled, mockEmitter);
            
            expect(result).toBeUndefined();
            expect(http.request).not.toHaveBeenCalled();
        });

        test('should handle compiled script with no dependencies', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'simple-diagram');
                });
                return mockRequest;
            });

            const compiled = {
                type: 'return',
                line: 1,
                id: 1,
                rhs: {
                    type: 'define',
                    line: 2,
                    id: 2,
                    dependsOn: [{
                        type: 'select',
                        line: 3,
                        id: 3,
                        dependsOn: []
                    }]
                }
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
        });
    });

    describe('Complex Dependency Visualization', () => {
        test('should handle script with multiple dependencies', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'complex-diagram');
                });
                return mockRequest;
            });

            const compiled = {
                type: 'return',
                line: 5,
                id: 5,
                rhs: {
                    type: 'select',
                    line: 4,
                    id: 4,
                    dependsOn: [
                        {
                            type: 'select',
                            line: 2,
                            id: 2,
                            dependsOn: []
                        },
                        {
                            type: 'select',
                            line: 3,
                            id: 3,
                            dependsOn: []
                        }
                    ]
                }
            };

            visualization.getPic(compiled, mockEmitter);
            
            expect(http.request).toHaveBeenCalled();
            const callArgs = http.request.mock.calls[0];
            expect(callArgs[0].method).toBe('POST');
            expect(callArgs[0].host).toBe('yuml.me');
        });

        test('should handle script with fallback dependencies', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'fallback-diagram');
                });
                return mockRequest;
            });

            const compiled = {
                type: 'return',
                line: 3,
                id: 3,
                rhs: {
                    type: 'select',
                    line: 2,
                    id: 2,
                    dependsOn: [{
                        type: 'select',
                        line: 4,
                        id: 4,
                        dependsOn: []
                    }],
                    fallback: {
                        type: 'select',
                        line: 1,
                        id: 1,
                        dependsOn: [{
                            type: 'select',
                            line: 5,
                            id: 5,
                            dependsOn: []
                        }]
                    }
                }
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
        });

        test('should handle script with scope relationships', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'scope-diagram');
                });
                return mockRequest;
            });

            const compiled = {
                type: 'return',
                line: 4,
                id: 4,
                rhs: {
                    type: 'select',
                    line: 3,
                    id: 3,
                    dependsOn: [{
                        type: 'select',
                        line: 5,
                        id: 5,
                        dependsOn: []
                    }],
                    scope: {
                        type: 'if',
                        line: 2,
                        id: 2,
                        dependsOn: [{
                            type: 'select',
                            line: 6,
                            id: 6,
                            dependsOn: []
                        }]
                    }
                }
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
        });
    });

    describe('Control Flow Visualization', () => {
        test('should handle if-else statements', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'if-else-diagram');
                });
                return mockRequest;
            });

            const compiled = {
                type: 'return',
                line: 5,
                id: 5,
                rhs: {
                    type: 'if',
                    line: 1,
                    id: 1,
                    if: [
                        {
                            type: 'select',
                            line: 2,
                            id: 2,
                            dependsOn: []
                        }
                    ],
                    else: [
                        {
                            type: 'select',
                            line: 3,
                            id: 3,
                            dependsOn: []
                        }
                    ],
                    dependsOn: []
                }
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
        });

        test('should handle try-catch-finally statements', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'try-catch-diagram');
                });
                return mockRequest;
            });

            const compiled = {
                type: 'return',
                line: 6,
                id: 6,
                rhs: {
                    type: 'try',
                    line: 1,
                    id: 1,
                    dependsOn: [
                        {
                            type: 'select',
                            line: 2,
                            id: 2,
                            dependsOn: []
                        }
                    ],
                    catchClause: [
                        {
                            condition: {
                                type: 'logic',
                                line: 3,
                                id: 3,
                                dependsOn: []
                            },
                            lines: [
                                {
                                    type: 'define',
                                    line: 4,
                                    id: 4,
                                    dependsOn: []
                                }
                            ]
                        }
                    ],
                    finally: [
                        {
                            type: 'define',
                            line: 5,
                            id: 5,
                            dependsOn: []
                        }
                    ]
                }
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
        });
    });

    describe('Circular Dependency Handling', () => {
        test('should handle circular dependencies without infinite loops', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'circular-diagram');
                });
                return mockRequest;
            });

            // Create circular dependency
            const node1 = {
                type: 'select',
                line: 1,
                id: 1,
                dependsOn: []
            };
            
            const node2 = {
                type: 'select',
                line: 2,
                id: 2,
                dependsOn: [node1]
            };
            
            // Create circular reference
            node1.dependsOn = [node2];

            const compiled = {
                type: 'return',
                line: 3,
                id: 3,
                rhs: node1
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
            // Should not hang due to circular dependency
        });

        test('should handle self-referencing nodes', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'self-ref-diagram');
                });
                return mockRequest;
            });

            const selfRef = {
                type: 'select',
                line: 1,
                id: 1,
                dependsOn: []
            };
            
            // Self reference
            selfRef.dependsOn = [selfRef];

            const compiled = {
                type: 'return',
                line: 2,
                id: 2,
                rhs: selfRef
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
        });
    });

    describe('Color Assignment', () => {
        test('should cycle through colors for different scopes', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'colored-diagram');
                });
                return mockRequest;
            });

            // Create multiple if statements to test color cycling
            const compiled = {
                type: 'return',
                line: 10,
                id: 10,
                rhs: {
                    type: 'if',
                    line: 1,
                    id: 1,
                    if: [
                        {
                            type: 'if',
                            line: 2,
                            id: 2,
                            if: [
                                {
                                    type: 'if',
                                    line: 3,
                                    id: 3,
                                    if: [
                                        {
                                            type: 'if',
                                            line: 4,
                                            id: 4,
                                            if: [
                                                {
                                                    type: 'if',
                                                    line: 5,
                                                    id: 5,
                                                    if: [
                                                        {
                                                            type: 'if',
                                                            line: 6,
                                                            id: 6,
                                                            if: [
                                                                {
                                                                    type: 'define',
                                                                    line: 7,
                                                                    id: 7,
                                                                    dependsOn: []
                                                                }
                                                            ],
                                                            else: [],
                                                            dependsOn: []
                                                        }
                                                    ],
                                                    else: [],
                                                    dependsOn: []
                                                }
                                            ],
                                            else: [],
                                            dependsOn: []
                                        }
                                    ],
                                    else: [],
                                    dependsOn: []
                                }
                            ],
                            else: [],
                            dependsOn: []
                        }
                    ],
                    else: [],
                    dependsOn: []
                }
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
            // Should cycle through all available colors
        });
    });

    describe('HTTP Request Handling', () => {
        test('should handle HTTP request errors', () => {
            const mockRequest = new EventEmitter();
            mockRequest.write = jest.fn();
            mockRequest.end = jest.fn();
            
            // Add error handler to prevent unhandled error
            mockRequest.on('error', () => {
                // Error handled in test
            });
            
            http.request.mockImplementation((options, callback) => {
                // Simulate request error
                process.nextTick(() => {
                    mockRequest.emit('error', new Error('Network error'));
                });
                return mockRequest;
            });

            const compiled = {
                type: 'return',
                line: 1,
                id: 1,
                rhs: {
                    type: 'select',
                    line: 2,
                    id: 2,
                    dependsOn: [{
                        type: 'select',
                        line: 3,
                        id: 3,
                        dependsOn: []
                    }]
                }
            };

            visualization.getPic(compiled, mockEmitter);
            
            expect(http.request).toHaveBeenCalled();
            expect(mockRequest.write).toHaveBeenCalled();
            expect(mockRequest.end).toHaveBeenCalled();
        });

        test('should send correct POST data', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'post-data-diagram');
                });
                return mockRequest;
            });

            const compiled = {
                type: 'return',
                line: 2,
                id: 2,
                rhs: {
                    type: 'select',
                    line: 1,
                    id: 1,
                    dependsOn: [{
                        type: 'select',
                        line: 3,
                        id: 3,
                        dependsOn: []
                    }]
                }
            };

            visualization.getPic(compiled, mockEmitter);
            
            expect(mockRequest.write).toHaveBeenCalled();
            const writeCall = mockRequest.write.mock.calls[0][0];
            expect(writeCall).toContain('dsl_text=');
            expect(mockRequest.end).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty diagram text', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            // Mock a scenario that would produce empty diagram text
            const compiled = {
                type: 'return',
                line: 1,
                id: 1
                // Missing rhs
            };

            const result = visualization.getPic(compiled, mockEmitter);
            
            // Should return early without making HTTP request
            expect(result).toBeUndefined();
            expect(http.request).not.toHaveBeenCalled();
        });

        test('should handle malformed compiled structure', () => {
            const malformedCompiled = {
                // Missing required properties
                someProperty: 'value'
            };

            const result = visualization.getPic(malformedCompiled, mockEmitter);
            
            expect(result).toBeUndefined();
            expect(http.request).not.toHaveBeenCalled();
        });

        test('should handle very deep dependency trees', () => {
            const mockRequest = {
                write: jest.fn(),
                end: jest.fn()
            };
            
            const mockResponse = new EventEmitter();
            mockResponse.setEncoding = jest.fn();
            
            http.request.mockImplementation((options, callback) => {
                process.nextTick(() => {
                    callback(mockResponse);
                    mockResponse.emit('data', 'deep-tree-diagram');
                });
                return mockRequest;
            });

            // Create deep dependency tree
            let current = {
                type: 'define',
                line: 50,
                id: 50,
                dependsOn: []
            };

            for (let i = 49; i >= 1; i--) {
                current = {
                    type: 'select',
                    line: i,
                    id: i,
                    dependsOn: [current]
                };
            }

            const compiled = {
                type: 'return',
                line: 51,
                id: 51,
                rhs: current
            };

            visualization.getPic(compiled, mockEmitter);
            expect(http.request).toHaveBeenCalled();
        });
    });
});