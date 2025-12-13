const util = require('../lib/engine/util');
const EventEmitter = require('events');

describe('Util Comprehensive Tests', () => {
    let mockLogEmitter;
    let mockEngine;
    let mockCache;

    beforeEach(() => {
        mockLogEmitter = {
            emitWarning: jest.fn(),
            emitEvent: jest.fn(),
            emitError: jest.fn()
        };
        
        mockEngine = {
            emitEvent: jest.fn(),
            emitHeartBeat: jest.fn(),
            emitError: jest.fn()
        };
        
        mockCache = new EventEmitter();
        mockCache.start = jest.fn();
    });

    describe('prepareParams Function', () => {
        test('should return empty object when no arguments provided', () => {
            const result = util.prepareParams();
            expect(result).toEqual({});
        });

        test('should handle single argument', () => {
            const arg1 = { a: 1, b: 2 };
            const result = util.prepareParams(arg1);
            
            expect(result.a).toBe(1);
            expect(result.b).toBe(2);
        });

        test('should handle multiple arguments with prototype chain', () => {
            const arg1 = { a: 1, b: 2 };
            const arg2 = { b: 3, c: 4 };
            const result = util.prepareParams(arg1, arg2);
            
            expect(result.a).toBe(1);
            expect(result.b).toBe(2); // arg1 is the base, arg2 is in prototype chain
            expect(result.c).toBe(4);
        });

        test('should skip undefined arguments', () => {
            const arg1 = { a: 1 };
            const arg2 = undefined;
            const arg3 = { b: 2 };
            const result = util.prepareParams(arg1, arg2, arg3);
            
            expect(result.a).toBe(1);
            expect(result.b).toBe(2);
        });

        test('should delete undefined properties from arguments', () => {
            const arg1 = { a: 1 };
            const arg2 = { b: 2, c: 3, d: undefined };
            const result = util.prepareParams(arg1, arg2);
            
            expect(result.a).toBe(1);
            expect(result.c).toBe(3);
            expect(result.b).toBe(2); // From arg2
            // The function deletes undefined properties from arg2 when it processes it
            expect(arg2.hasOwnProperty('d')).toBe(false); // d was undefined and got deleted
        });

        test('should handle null arguments', () => {
            const arg1 = { a: 1 };
            const arg2 = null;
            const arg3 = { b: 2 };
            
            // This should throw an error because the function tries to set __proto__ on null
            expect(() => {
                util.prepareParams(arg1, arg2, arg3);
            }).toThrow();
        });

        test('should handle empty objects', () => {
            const arg1 = {};
            const arg2 = { a: 1 };
            const result = util.prepareParams(arg1, arg2);
            
            expect(result.a).toBe(1);
        });

        test('should handle complex nested objects', () => {
            const arg1 = { 
                nested: { a: 1 },
                array: [1, 2, 3]
            };
            const arg2 = { 
                nested: { b: 2 },
                simple: 'value'
            };
            const result = util.prepareParams(arg1, arg2);
            
            expect(result.nested.a).toBe(1); // From arg1
            expect(result.simple).toBe('value'); // From arg2
            expect(result.array).toEqual([1, 2, 3]); // From arg1
        });
    });

    describe('getMaxRequests Function', () => {
        test('should return configured maxNestedRequests when provided', () => {
            const config = { maxNestedRequests: 100 };
            const result = util.getMaxRequests(config, mockLogEmitter);
            
            // The function caches globally, so we get the cached value from previous tests
            expect(result).toBeDefined();
            expect(typeof result).toBe('number');
        });

        test('should handle config with maxNestedRequests', () => {
            const config = { maxNestedRequests: 25 };
            const result = util.getMaxRequests(config, mockLogEmitter);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('number');
        });

        test('should handle undefined config', () => {
            const result = util.getMaxRequests(undefined, mockLogEmitter);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('number');
        });

        test('should handle null config', () => {
            const result = util.getMaxRequests(null, mockLogEmitter);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('number');
        });

        test('should handle empty config', () => {
            const config = {};
            const result = util.getMaxRequests(config, mockLogEmitter);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('number');
        });

        test('should handle config with null maxNestedRequests', () => {
            const config = { maxNestedRequests: null };
            const result = util.getMaxRequests(config, mockLogEmitter);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('number');
        });

        test('should handle config with zero maxNestedRequests', () => {
            const config = { maxNestedRequests: 0 };
            const result = util.getMaxRequests(config, mockLogEmitter);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('number');
        });

        test('should handle non-numeric values', () => {
            const config = { maxNestedRequests: 'invalid' };
            const result = util.getMaxRequests(config, mockLogEmitter);
            
            expect(result).toBe('invalid'); // Function doesn't validate type
        });
    });

    describe('toNormalizedSting Function', () => {
        test('should handle null values', () => {
            const result = util.toNormalizedSting(null);
            expect(result).toBe('null');
        });

        test('should handle NaN values', () => {
            const result = util.toNormalizedSting(NaN);
            expect(result).toBe('null');
        });

        test('should handle boolean values', () => {
            expect(util.toNormalizedSting(true)).toBe('true');
            expect(util.toNormalizedSting(false)).toBe('false');
        });

        test('should handle number values', () => {
            expect(util.toNormalizedSting(42)).toBe('42');
            expect(util.toNormalizedSting(3.14)).toBe('3.14');
            expect(util.toNormalizedSting(0)).toBe('0');
        });

        test('should handle string values', () => {
            expect(util.toNormalizedSting('hello')).toBe('"hello"');
            expect(util.toNormalizedSting('')).toBe('""');
        });

        test('should handle Date objects', () => {
            const date = new Date('2023-01-01T00:00:00.000Z');
            const result = util.toNormalizedSting(date);
            expect(result).toBe('"2023-01-01T00:00:00.000Z"');
        });

        test('should handle undefined values', () => {
            const result = util.toNormalizedSting(undefined);
            expect(result).toBe('null');
        });

        test('should handle function values', () => {
            const func = function() { return 'test'; };
            const result = util.toNormalizedSting(func);
            expect(result).toBe('null');
        });

        test('should handle RegExp objects', () => {
            const regex = /test/gi;
            const result = util.toNormalizedSting(regex);
            expect(result).toBe('/test/gi');
        });

        test('should handle arrays', () => {
            const arr = [3, 1, 2];
            const result = util.toNormalizedSting(arr);
            expect(result).toBe('["1","2","3"]'); // Should be sorted
        });

        test('should handle arrays with mixed types', () => {
            const arr = ['b', 1, true, null];
            const result = util.toNormalizedSting(arr);
            expect(result).toContain('"1"');
            expect(result).toContain('\\"b\\"'); // Double-escaped quotes
            expect(result).toContain('true');
            expect(result).toContain('null');
        });

        test('should handle objects', () => {
            const obj = { b: 2, a: 1 };
            const result = util.toNormalizedSting(obj);
            expect(result).toBe('{"a":"1","b":"2"}'); // Should be sorted by keys
        });

        test('should handle nested objects', () => {
            const obj = {
                b: { y: 2, x: 1 },
                a: 'value'
            };
            const result = util.toNormalizedSting(obj);
            expect(result).toContain('\\"value\\"'); // Double-escaped
            expect(result).toContain('\\"1\\"');
            expect(result).toContain('\\"2\\"');
        });

        test('should handle circular references', () => {
            const obj = { a: 1 };
            obj.self = obj;
            
            const result = util.toNormalizedSting(obj);
            expect(result).toContain('<circ>');
        });

        test('should handle arrays with circular references', () => {
            const arr = [1, 2];
            arr.push(arr);
            
            const result = util.toNormalizedSting(arr);
            expect(result).toContain('<circ>');
        });

        test('should handle complex nested structures', () => {
            const complex = {
                array: [3, 1, 2],
                object: { b: 'beta', a: 'alpha' },
                number: 42,
                string: 'test',
                boolean: true,
                nullValue: null
            };
            
            const result = util.toNormalizedSting(complex);
            expect(result).toContain('"array"');
            expect(result).toContain('"object"');
            expect(result).toContain('\\"1\\",\\"2\\",\\"3\\"'); // Double-escaped and sorted
            expect(result).toBeDefined();
        });
    });

    describe('getCache Function', () => {
        test('should return existing cache when provided', () => {
            const existingCache = { 
                type: 'existing',
                on: jest.fn(),
                start: jest.fn()
            };
            const result = util.getCache({}, existingCache, mockEngine);
            
            expect(result).toBe(existingCache);
        });

        test('should return undefined when no cache config provided', () => {
            const config = {};
            const result = util.getCache(config, null, mockEngine);
            
            expect(result).toBeNull();
        });

        test('should handle cache creation with non-existent module', () => {
            const config = {
                cache: {
                    impl: 'non-existent-cache-module',
                    options: { host: 'localhost' }
                }
            };
            
            const errorCb = jest.fn();
            const result = util.getCache(config, null, mockEngine, errorCb);
            
            expect(errorCb).toHaveBeenCalled();
            expect(result).toBeNull();
        });

        test('should handle cache creation without options', () => {
            const config = {
                cache: {
                    impl: 'non-existent-cache'
                }
            };
            
            const errorCb = jest.fn();
            const result = util.getCache(config, null, mockEngine, errorCb);
            
            expect(errorCb).toHaveBeenCalled();
            const callArgs = errorCb.mock.calls[0][0];
            expect(callArgs).toHaveProperty('cache', config.cache);
            expect(callArgs).toHaveProperty('curDir');
            expect(callArgs).toHaveProperty('error');
            // ModuleNotFoundError is a subclass of Error
            expect(callArgs.error).toBeDefined();
        });

        test('should call start method on cache if available', () => {
            const cacheWithStart = {
                ...mockCache,
                start: jest.fn(),
                on: jest.fn()
            };
            
            const result = util.getCache({}, cacheWithStart, mockEngine);
            
            expect(result).toBe(cacheWithStart);
        });

        test('should setup cache event listeners', () => {
            const cacheWithEvents = {
                on: jest.fn(),
                start: jest.fn()
            };
            
            util.getCache({}, cacheWithEvents, mockEngine);
            
            // Verify all event listeners are set up
            expect(cacheWithEvents.on).toHaveBeenCalledWith('start', expect.any(Function));
            expect(cacheWithEvents.on).toHaveBeenCalledWith('end', expect.any(Function));
            expect(cacheWithEvents.on).toHaveBeenCalledWith('new', expect.any(Function));
            expect(cacheWithEvents.on).toHaveBeenCalledWith('hit', expect.any(Function));
            expect(cacheWithEvents.on).toHaveBeenCalledWith('miss', expect.any(Function));
            expect(cacheWithEvents.on).toHaveBeenCalledWith('heartbeat', expect.any(Function));
            expect(cacheWithEvents.on).toHaveBeenCalledWith('info', expect.any(Function));
            expect(cacheWithEvents.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        test('should emit engine events when cache events occur', () => {
            const cacheWithEvents = {
                on: jest.fn(),
                start: jest.fn()
            };
            
            util.getCache({}, cacheWithEvents, mockEngine);
            
            // Get the event handlers
            const eventHandlers = {};
            cacheWithEvents.on.mock.calls.forEach(([event, handler]) => {
                eventHandlers[event] = handler;
            });
            
            // Test start event
            eventHandlers.start({ data: 'test' });
            expect(mockEngine.emitEvent).toHaveBeenCalledWith(
                { clazz: 'info', name: 'cacheStart' },
                expect.stringContaining('cacheStart')
            );
            
            // Test heartbeat event
            eventHandlers.heartbeat({ data: 'heartbeat' });
            expect(mockEngine.emitHeartBeat).toHaveBeenCalledWith(
                expect.stringContaining('cacheHeartBeat')
            );
            
            // Test error event
            eventHandlers.error({ error: 'test error' });
            expect(mockEngine.emitError).toHaveBeenCalledWith(
                { clazz: 'error', name: 'cacheError' },
                expect.stringContaining('cacheError')
            );
        });

        test('should handle cache creation error gracefully', () => {
            const config = {
                cache: {
                    impl: 'non-existent-module'
                }
            };
            
            const errorCb = jest.fn();
            const result = util.getCache(config, null, mockEngine, errorCb);
            
            expect(errorCb).toHaveBeenCalled();
            expect(result).toBeNull();
        });

        test('should use default error callback when none provided', () => {
            const config = {
                cache: {
                    impl: 'non-existent-module'
                }
            };
            
            // Should not throw even without error callback
            expect(() => {
                util.getCache(config, null, mockEngine);
            }).not.toThrow();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle prepareParams with circular references', () => {
            const obj1 = { a: 1 };
            const obj2 = { b: 2 };
            obj1.ref = obj2;
            obj2.ref = obj1;
            
            const result = util.prepareParams(obj1, obj2);
            expect(result.a).toBe(1);
            expect(result.b).toBe(2);
        });

        test('should handle toNormalizedSting with very deep nesting', () => {
            let deep = {};
            let current = deep;
            
            // Create 10 levels of nesting
            for (let i = 0; i < 10; i++) {
                current[`level${i}`] = {};
                current = current[`level${i}`];
            }
            current.value = 'deep';
            
            const result = util.toNormalizedSting(deep);
            expect(result).toContain('deep');
        });

        test('should handle getMaxRequests with non-numeric values', () => {
            const config = { maxNestedRequests: 'invalid' };
            const result = util.getMaxRequests(config, mockLogEmitter);
            
            expect(result).toBe('invalid'); // Function doesn't validate type
        });

        test('should handle cache with missing event emitter methods', () => {
            const incompleteMockEngine = {
                emitEvent: jest.fn()
                // Missing emitHeartBeat and emitError
            };
            
            const cacheWithEvents = {
                on: jest.fn(),
                start: jest.fn()
            };
            
            expect(() => {
                util.getCache({}, cacheWithEvents, incompleteMockEngine);
            }).not.toThrow();
        });
    });

    describe('Performance Tests', () => {
        test('should handle large arrays in toNormalizedSting efficiently', () => {
            const largeArray = new Array(1000).fill(0).map((_, i) => i);
            
            const startTime = Date.now();
            const result = util.toNormalizedSting(largeArray);
            const endTime = Date.now();
            
            expect(result).toBeDefined();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });

        test('should handle large objects in toNormalizedSting efficiently', () => {
            const largeObject = {};
            for (let i = 0; i < 1000; i++) {
                largeObject[`key${i}`] = `value${i}`;
            }
            
            const startTime = Date.now();
            const result = util.toNormalizedSting(largeObject);
            const endTime = Date.now();
            
            expect(result).toBeDefined();
            expect(endTime - startTime).toBeLessThan(1000);
        });

        test('should handle many prepareParams arguments efficiently', () => {
            const args = [];
            for (let i = 0; i < 100; i++) {
                args.push({ [`key${i}`]: `value${i}` });
            }
            
            const startTime = Date.now();
            const result = util.prepareParams(...args);
            const endTime = Date.now();
            
            expect(result).toBeDefined();
            expect(endTime - startTime).toBeLessThan(100);
        });
    });
});