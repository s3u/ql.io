/*
 * HTTP Response Callback Test
 * Tests for callback handling in response processing
 */

'use strict';

const response = require('../lib/engine/http/response.js');
const EventEmitter = require('events').EventEmitter;

describe('HTTP Response Callback Tests', () => {
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

    describe('Double Callback Prevention', () => {
        test('should not call callback twice for text/plain with valid JSON', (done) => {
            const mockArgs = {
                table: 'test.table',
                resource: {
                    parseResponse: jest.fn().mockReturnValue({
                        type: 'text/plain',
                        content: '{"valid": "json"}'
                    }),
                    patchStatus: jest.fn().mockReturnValue(200),
                    patchResponse: jest.fn().mockImplementation((status, headers, data) => data),
                    patchMediaType: jest.fn().mockReturnValue(null),
                    resultSet: null
                },
                statement: { line: 1 },
                emitter: new EventEmitter(),
                requestId: 'test-request-id',
                headers: { 'test-request-id': 'test-123' },
                context: {},
                httpReqTx: {
                    cb: jest.fn()
                },
                xformers: {
                    json: {
                        toJson: function(data, respCb, errorCb) {
                            try {
                                const parsed = JSON.parse(data);
                                return respCb(parsed);
                            } catch (error) {
                                return errorCb(error);
                            }
                        }
                    },
                    xml: {
                        toJson: function(data, respCb, errorCb) {
                            // This should not be called if JSON succeeds
                            return respCb({ xml: 'parsed' });
                        }
                    }
                }
            };

            const mockRes = {
                statusCode: 200,
                headers: {
                    'content-type': 'text/plain'
                }
            };

            const timings = { receive: 100 };
            const reqStart = Date.now();
            const uniqueId = 'test-123';
            const start = Date.now();
            const result = {
                type: 'text/plain',
                content: '{"valid": "json"}'
            };

            // Execute the response handler
            response.exec(timings, reqStart, mockArgs, uniqueId, mockRes, start, result, {});

            // Wait a bit to ensure no double callbacks
            setTimeout(() => {
                expect(mockArgs.httpReqTx.cb).toHaveBeenCalledTimes(1);
                done();
            }, 50);
        });

        test('should handle text/plain with invalid JSON gracefully', (done) => {
            const mockArgs = {
                table: 'test.table',
                resource: {
                    parseResponse: jest.fn().mockReturnValue({
                        type: 'text/plain',
                        content: 'invalid json content'
                    }),
                    patchStatus: jest.fn().mockReturnValue(200),
                    patchResponse: jest.fn().mockImplementation((status, headers, data) => data),
                    patchMediaType: jest.fn().mockReturnValue(null),
                    resultSet: null
                },
                statement: { line: 1 },
                emitter: new EventEmitter(),
                requestId: 'test-request-id',
                headers: { 'test-request-id': 'test-123' },
                context: {},
                httpReqTx: {
                    cb: jest.fn()
                },
                xformers: {
                    json: {
                        toJson: function(data, respCb, errorCb) {
                            try {
                                const parsed = JSON.parse(data);
                                return respCb(parsed);
                            } catch (error) {
                                return errorCb(error);
                            }
                        }
                    },
                    xml: {
                        toJson: function(data, respCb, errorCb) {
                            // Simulate XML parsing failure
                            return errorCb(new Error('Not valid XML'));
                        }
                    }
                }
            };

            const mockRes = {
                statusCode: 200,
                headers: {
                    'content-type': 'text/plain'
                }
            };

            const timings = { receive: 100 };
            const reqStart = Date.now();
            const uniqueId = 'test-123';
            const start = Date.now();
            const result = {
                type: 'text/plain',
                content: 'invalid json content'
            };

            // Execute the response handler
            response.exec(timings, reqStart, mockArgs, uniqueId, mockRes, start, result, {});

            // Wait a bit to ensure callback is called once
            setTimeout(() => {
                expect(mockArgs.httpReqTx.cb).toHaveBeenCalledTimes(1);
                // Should be called with error since both JSON and XML parsing failed
                expect(mockArgs.httpReqTx.cb).toHaveBeenCalledWith(expect.objectContaining({
                    body: 'invalid json content'
                }));
                done();
            }, 50);
        });

        test('should handle text/plain with valid XML after JSON fails', (done) => {
            const xmlContent = '<root><item>test</item></root>';
            let callbackCount = 0;
            
            const mockArgs = {
                table: 'test.table',
                resource: {
                    parseResponse: jest.fn().mockReturnValue({
                        type: 'text/plain',
                        content: xmlContent
                    }),
                    patchStatus: jest.fn().mockReturnValue(200),
                    patchResponse: jest.fn().mockImplementation((status, headers, data) => data),
                    patchMediaType: jest.fn().mockReturnValue(null),
                    resultSet: null
                },
                statement: { line: 1 },
                emitter: new EventEmitter(),
                requestId: 'test-request-id',
                headers: { 'test-request-id': 'test-123' },
                context: {},
                httpReqTx: {
                    cb: function() {
                        callbackCount++;
                        // Ensure callback is only called once
                        expect(callbackCount).toBe(1);
                    }
                },
                xformers: {
                    json: {
                        toJson: function(data, respCb, errorCb) {
                            try {
                                const parsed = JSON.parse(data);
                                return respCb(parsed);
                            } catch (error) {
                                return errorCb(error);
                            }
                        }
                    },
                    xml: {
                        toJson: function(data, respCb, errorCb) {
                            // Simulate successful XML parsing
                            return respCb({ root: { item: 'test' } });
                        }
                    }
                }
            };

            const mockRes = {
                statusCode: 200,
                headers: {
                    'content-type': 'text/plain'
                }
            };

            const timings = { receive: 100 };
            const reqStart = Date.now();
            const uniqueId = 'test-123';
            const start = Date.now();
            const result = {
                type: 'text/plain',
                content: xmlContent
            };

            // Execute the response handler
            response.exec(timings, reqStart, mockArgs, uniqueId, mockRes, start, result, {});

            // Wait a bit to ensure callback is called once
            setTimeout(() => {
                expect(callbackCount).toBe(1);
                done();
            }, 50);
        });

        test('should handle empty response data', (done) => {
            const mockArgs = {
                table: 'test.table',
                resource: {
                    parseResponse: jest.fn().mockReturnValue({
                        type: 'application/json',
                        content: ''
                    }),
                    patchStatus: jest.fn().mockReturnValue(200),
                    patchResponse: jest.fn().mockImplementation((status, headers, data) => data),
                    patchMediaType: jest.fn().mockReturnValue(null),
                    resultSet: null
                },
                statement: { line: 1 },
                emitter: new EventEmitter(),
                requestId: 'test-request-id',
                headers: { 'test-request-id': 'test-123' },
                context: {},
                httpReqTx: {
                    cb: jest.fn()
                },
                xformers: {
                    json: {
                        toJson: function(data, respCb, errorCb) {
                            try {
                                const parsed = JSON.parse(data);
                                return respCb(parsed);
                            } catch (error) {
                                return errorCb(error);
                            }
                        }
                    }
                }
            };

            const mockRes = {
                statusCode: 200,
                headers: {
                    'content-type': 'application/json'
                }
            };

            const timings = { receive: 100 };
            const reqStart = Date.now();
            const uniqueId = 'test-123';
            const start = Date.now();
            const result = {
                type: 'application/json',
                content: ''
            };

            // Execute the response handler
            response.exec(timings, reqStart, mockArgs, uniqueId, mockRes, start, result, {});

            // Wait a bit to ensure callback is called once
            setTimeout(() => {
                expect(mockArgs.httpReqTx.cb).toHaveBeenCalledTimes(1);
                done();
            }, 50);
        });
    });

    describe('Media Type Handling', () => {
        test('should handle application/json correctly', (done) => {
            const jsonContent = '{"test": "data"}';
            
            const mockArgs = {
                table: 'test.table',
                resource: {
                    parseResponse: jest.fn().mockReturnValue({
                        type: 'application/json',
                        content: jsonContent
                    }),
                    patchStatus: jest.fn().mockReturnValue(200),
                    patchResponse: jest.fn().mockImplementation((status, headers, data) => data),
                    patchMediaType: jest.fn().mockReturnValue(null),
                    resultSet: null
                },
                statement: { line: 1 },
                emitter: new EventEmitter(),
                requestId: 'test-request-id',
                headers: { 'test-request-id': 'test-123' },
                context: {},
                httpReqTx: {
                    cb: jest.fn()
                },
                xformers: {
                    json: {
                        toJson: function(data, respCb, errorCb) {
                            try {
                                const parsed = JSON.parse(data);
                                return respCb(parsed);
                            } catch (error) {
                                return errorCb(error);
                            }
                        }
                    }
                }
            };

            const mockRes = {
                statusCode: 200,
                headers: {
                    'content-type': 'application/json'
                }
            };

            const timings = { receive: 100 };
            const reqStart = Date.now();
            const uniqueId = 'test-123';
            const start = Date.now();
            const result = {
                type: 'application/json',
                content: jsonContent
            };

            // Execute the response handler
            response.exec(timings, reqStart, mockArgs, uniqueId, mockRes, start, result, {});

            setTimeout(() => {
                expect(mockArgs.httpReqTx.cb).toHaveBeenCalledTimes(1);
                expect(mockArgs.httpReqTx.cb).toHaveBeenCalledWith(
                    undefined,
                    expect.objectContaining({
                        headers: { 'content-type': 'application/json' },
                        body: { test: 'data' }
                    }),
                    expect.any(String)
                );
                done();
            }, 50);
        });
    });
});