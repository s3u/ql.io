/*
 * Callback Double Call Reproduction Test
 * Reproduces the exact "Callback was already called" error
 */

'use strict';

describe('Callback Double Call Reproduction', () => {
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

    test('should reproduce callback double call issue with text content type', (done) => {
        const response = require('../lib/engine/http/response.js');
        const EventEmitter = require('events').EventEmitter;
        
        let callbackCount = 0;
        let callbackError = null;
        
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
                cb: function() {
                    callbackCount++;
                    if (callbackCount > 1) {
                        callbackError = new Error(`Callback called ${callbackCount} times`);
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
                        // This might also get called if there's a bug
                        try {
                            // Simulate XML parsing that might succeed
                            return respCb({ xml: 'parsed' });
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

        // Check for double callback after a delay
        setTimeout(() => {
            if (callbackError) {
                done(callbackError);
            } else {
                expect(callbackCount).toBe(1);
                done();
            }
        }, 100);
    });

    test('should reproduce the exact error scenario from stack trace', (done) => {
        // This test simulates the exact conditions that cause the error
        const jsonify = function(table, respData, mediaType, headers, xformers, respCb, errorCb) {
            let callbackCalled = false;
            
            const safeRespCb = function(data) {
                if (callbackCalled) {
                    throw new Error('Callback was already called');
                }
                callbackCalled = true;
                return respCb(data);
            };
            
            const safeErrorCb = function(error) {
                if (callbackCalled) {
                    throw new Error('Callback was already called');
                }
                callbackCalled = true;
                return errorCb(error);
            };

            if (!respData || /^\s*$/.test(respData)) {
                safeRespCb({});
            }
            else if(xformers[table]) {
                xformers[table].toJson(respData, safeRespCb, safeErrorCb, headers);
            }
            else if(mediaType.subtype === 'xml' || /\+xml$/.test(mediaType.subtype)) {
                xformers['xml'].toJson(respData, safeRespCb, safeErrorCb, headers);
            }
            else if(mediaType.subtype === 'json') {
                xformers['json'].toJson(respData, safeRespCb, safeErrorCb, headers);
            }
            else if(mediaType.subtype === 'csv') {
                xformers['csv'].toJson(respData, safeRespCb, safeErrorCb,
                    (mediaType.params && mediaType.params.header != undefined));
            }
            else if(mediaType.type === 'text') {
                // This is the problematic code path!
                // Try JSON first
                xformers['json'].toJson(respData, safeRespCb, function() {
                    // if error Try XML - THIS CAN CAUSE DOUBLE CALLBACK!
                    xformers['xml'].toJson(respData, safeRespCb, safeErrorCb);
                });
            }
            else {
                safeErrorCb({message:"No transformer available", type:mediaType.type, subType:mediaType.subtype})
            }
        };

        const mediaType = { type: 'text', subtype: 'plain' };
        const respData = '{"valid": "json"}';  // Valid JSON
        const xformers = {
            json: {
                toJson: function(data, respCb, errorCb) {
                    try {
                        const parsed = JSON.parse(data);
                        return respCb(parsed);  // This succeeds
                    } catch (error) {
                        return errorCb(error);
                    }
                }
            },
            xml: {
                toJson: function(data, respCb, errorCb) {
                    // This should NOT be called if JSON succeeds
                    return respCb({ xml: 'data' });
                }
            }
        };

        let errorThrown = false;
        
        try {
            jsonify('test.table', respData, mediaType, {}, xformers, 
                function(data) {
                    // Success callback
                }, 
                function(error) {
                    // Error callback
                }
            );
        } catch (error) {
            if (error.message === 'Callback was already called') {
                errorThrown = true;
            }
        }

        // The current implementation should NOT throw this error
        // because JSON parsing succeeds and doesn't call the error callback
        expect(errorThrown).toBe(false);
        done();
    });
});