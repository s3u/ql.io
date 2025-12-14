/*
 * Callback Protection Test
 * Tests the fix for double callback invocation
 */

'use strict';

describe('Callback Protection Test', () => {
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

    test('should prevent double callback with text/plain content type', (done) => {
        const response = require('../lib/engine/http/response.js');
        const EventEmitter = require('events').EventEmitter;
        
        let callbackCount = 0;
        let successCallbackCount = 0;
        let errorCallbackCount = 0;
        
        const mockArgs = {
            table: 'test.table',
            resource: {
                parseResponse: jest.fn().mockReturnValue({
                    type: 'text/plain',
                    content: '{"test": "data"}'  // Valid JSON in text/plain
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
                cb: function(error, result) {
                    callbackCount++;
                    if (error) {
                        errorCallbackCount++;
                    } else {
                        successCallbackCount++;
                    }
                }
            },
            xformers: {
                json: {
                    toJson: function(data, respCb, errorCb) {
                        try {
                            const parsed = JSON.parse(data);
                            // This will succeed and call respCb
                            return respCb(parsed);
                        } catch (error) {
                            return errorCb(error);
                        }
                    }
                },
                xml: {
                    toJson: function(data, respCb, errorCb) {
                        // This should NOT be called if JSON succeeds
                        // But if it is called, it should not cause double callback
                        return respCb({ xml: 'parsed' });
                    }
                }
            }
        };

        const mockRes = {
            statusCode: 200,
            headers: {
                'content-type': 'text/plain'  // This triggers the problematic code path
            }
        };

        const timings = { receive: 100 };
        const reqStart = Date.now();
        const uniqueId = 'test-123';
        const start = Date.now();
        const result = {
            type: 'text/plain',
            content: '{"test": "data"}'
        };

        // Execute the response handler
        response.exec(timings, reqStart, mockArgs, uniqueId, mockRes, start, result, {});

        // Check for proper callback handling after a delay
        setTimeout(() => {
            expect(callbackCount).toBe(1);
            expect(successCallbackCount).toBe(1);
            expect(errorCallbackCount).toBe(0);
            done();
        }, 100);
    });

    test('should handle text/plain with invalid JSON that falls back to XML', (done) => {
        const response = require('../lib/engine/http/response.js');
        const EventEmitter = require('events').EventEmitter;
        
        let callbackCount = 0;
        
        const mockArgs = {
            table: 'test.table',
            resource: {
                parseResponse: jest.fn().mockReturnValue({
                    type: 'text/plain',
                    content: '<root><item>test</item></root>'  // Valid XML, invalid JSON
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
                }
            },
            xformers: {
                json: {
                    toJson: function(data, respCb, errorCb) {
                        try {
                            const parsed = JSON.parse(data);
                            return respCb(parsed);
                        } catch (error) {
                            return errorCb(error);  // This will fail for XML data
                        }
                    }
                },
                xml: {
                    toJson: function(data, respCb, errorCb) {
                        // This should be called after JSON fails
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
            content: '<root><item>test</item></root>'
        };

        // Execute the response handler
        response.exec(timings, reqStart, mockArgs, uniqueId, mockRes, start, result, {});

        // Check for proper callback handling after a delay
        setTimeout(() => {
            expect(callbackCount).toBe(1);
            done();
        }, 100);
    });

    test('should handle both JSON and XML failing gracefully', (done) => {
        const response = require('../lib/engine/http/response.js');
        const EventEmitter = require('events').EventEmitter;
        
        let callbackCount = 0;
        let errorCallbackCount = 0;
        
        const mockArgs = {
            table: 'test.table',
            resource: {
                parseResponse: jest.fn().mockReturnValue({
                    type: 'text/plain',
                    content: 'invalid data that is neither JSON nor XML'
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
                cb: function(error) {
                    callbackCount++;
                    if (error) {
                        errorCallbackCount++;
                    }
                }
            },
            xformers: {
                json: {
                    toJson: function(data, respCb, errorCb) {
                        try {
                            const parsed = JSON.parse(data);
                            return respCb(parsed);
                        } catch (error) {
                            return errorCb(error);  // This will fail
                        }
                    }
                },
                xml: {
                    toJson: function(data, respCb, errorCb) {
                        // This will also fail
                        return errorCb(new Error('Invalid XML'));
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
            content: 'invalid data that is neither JSON nor XML'
        };

        // Execute the response handler
        response.exec(timings, reqStart, mockArgs, uniqueId, mockRes, start, result, {});

        // Check for proper error handling after a delay
        setTimeout(() => {
            expect(callbackCount).toBe(1);
            expect(errorCallbackCount).toBe(1);
            done();
        }, 100);
    });
});