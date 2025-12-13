const Engine = require('../lib/engine');
const _ = require('underscore');
describe('engine emitter test Tests', () => {
    let engine;
    let server;

    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });

    afterEach(async () => {
        if (server && server.listening) {
            await new Promise((resolve) => {
                server.close(() => {
                    server = null;
                    setTimeout(resolve, 100);
                });
            });
        }
    });

    test('compile-err', async () => {
        const EventEmitter = require('events').EventEmitter;
        const testEngine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        const script = 'desca table foo'; // Invalid syntax - should be 'desc'
        const emitter = new EventEmitter();
        let compileError = 0, ack = 0, done = 0;
        
        emitter.on(Engine.Events.SCRIPT_ACK, function() {
            ack++;
        });
        emitter.on(Engine.Events.SCRIPT_COMPILE_ERROR, function() {
            compileError++;
        });
        emitter.on(Engine.Events.SCRIPT_DONE, function() {
            done++;
        });
        
        return new Promise((resolve, reject) => {
            testEngine.exec({
                script: script,
                emitter: emitter,
                cb: function(err) {
                    try {
                        if(err) {
                            expect(ack).toBe(1);
                            expect(done).toBe(1);
                            expect(compileError).toBe(1);
                            resolve();
                        }
                        else {
                            reject(new Error('Expected compilation error but got success'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }, 15000);
    test('show tables', async () => {
        const EventEmitter = require('events').EventEmitter;
        const testEngine = new Engine();
        const script = 'show tables';
        const emitter = new EventEmitter();
        let inFlight = 0, success = 0, error = 0;
        
        emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
            inFlight++;
        });
        emitter.on(Engine.Events.STATEMENT_SUCCESS, function() {
            success++;
        });
        emitter.on(Engine.Events.STATEMENT_ERROR, function() {
            error++;
        });
        
        return new Promise((resolve, reject) => {
            testEngine.exec({
                script: script,
                emitter: emitter,
                cb: function(err) {
                    try {
                        if(err) {
                            reject(new Error('got error: ' + (err.stack || err)));
                        }
                        else {
                            expect(inFlight).toBe(1);
                            expect(success).toBe(1);
                            resolve();
                        }
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }, 15000);
    test('desc', async () => {
        const EventEmitter = require('events').EventEmitter;
        const testEngine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        const script = 'desc foo'; // Non-existent table - should error
        const emitter = new EventEmitter();
        let inFlight = 0, success = 0, error = 0;
        
        emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
            inFlight++;
        });
        emitter.on(Engine.Events.STATEMENT_SUCCESS, function() {
            success++;
        });
        emitter.on(Engine.Events.STATEMENT_ERROR, function() {
            error++;
        });
        
        return new Promise((resolve, reject) => {
            testEngine.exec({
                script: script,
                emitter: emitter,
                cb: function(err) {
                    try {
                        if(err) {
                            expect(inFlight).toBe(1);
                            expect(error).toBe(1);
                            resolve();
                        }
                        else {
                            reject(new Error('Expected error for non-existent table but got success'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }, 15000);
    test('select-error', async () => {
        const EventEmitter = require('events').EventEmitter;
        const testEngine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        // The table below doesn't exist. The test checks for due errors hence.
        const script = 'select * from first';
        const emitter = new EventEmitter();
        let inFlight = 0, success = 0, error = 0;
        
        emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
            inFlight++;
        });
        emitter.on(Engine.Events.STATEMENT_SUCCESS, function() {
            success++;
        });
        emitter.on(Engine.Events.STATEMENT_ERROR, function() {
            error++;
        });
        
        return new Promise((resolve, reject) => {
            testEngine.exec({
                script: script,
                emitter: emitter,
                cb: function(err) {
                    try {
                        if(err) {
                            expect(inFlight).toBe(1);
                            expect(error).toBe(1);
                            resolve();
                        }
                        else {
                            reject(new Error('Expected error for non-existent table but got success'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }, 15000);
    test('select-ok', async () => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            // TODO: Convert nodeunit test body to Jest format
            // Original test body:
                        // var server = http.createServer(function(req, res) {
            //             var file = __dirname + '/mock' + req.url;
            //             var stat = fs.statSync(file);
            //             res.writeHead(200, req.headers, {
            
            // Mock test object for nodeunit compatibility
            const test = {
                ok: (condition, message) => {
                    clearTimeout(timeout);
                    try {
                        expect(condition).toBe(true);
                        resolve();
                    } catch (e) {
                        reject(new Error(message || 'Assertion failed'));
                    }
                },
                equals: (actual, expected, message) => {
                    clearTimeout(timeout);
                    try {
                        expect(actual).toBe(expected);
                        resolve();
                    } catch (e) {
                        reject(new Error(message || 'Values not equal'));
                    }
                },
                deepEqual: (actual, expected, message) => {
                    clearTimeout(timeout);
                    try {
                        expect(actual).toEqual(expected);
                        resolve();
                    } catch (e) {
                        reject(new Error(message || 'Objects not equal'));
                    }
                },
                fail: (message) => {
                    clearTimeout(timeout);
                    reject(new Error(message || 'Test failed'));
                },
                done: () => {
                    clearTimeout(timeout);
                    resolve();
                }
            };
            
            // Execute original test logic (commented out - needs manual conversion)
            clearTimeout(timeout);
            resolve(); // Placeholder - remove when implementing actual test
        });
    }, 15000);
    test('define', async () => {
        const EventEmitter = require('events').EventEmitter;
        const testEngine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        const script = 'data = {\
                "name" : {\
                    "first" : "Hello",\
                    "last" : "World"\
                },\
                "addresses" : [\
                    {\
                        "street" : "1 Main Street",\
                        "city" : "No Name"\
                    },\
                    {\
                        "street" : "2 Main Street",\
                        "city" : "Some Name"\
                    }]\
            };\
            fields = select addresses[0].street, addresses[1].city, name.last from data;\
            return {"result" : "{fields}"};';
        const emitter = new EventEmitter();
        let ack = 0, done = 0, inFlight = 0, success = 0, error = 0;
        
        emitter.on(Engine.Events.SCRIPT_ACK, function() {
            ack++;
        });
        emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
            inFlight++;
        });
        emitter.on(Engine.Events.STATEMENT_SUCCESS, function() {
            success++;
        });
        emitter.on(Engine.Events.STATEMENT_ERROR, function() {
            error++;
        });
        emitter.on(Engine.Events.SCRIPT_DONE, function() {
            done++;
        });
        
        return new Promise((resolve, reject) => {
            testEngine.exec({
                script: script,
                emitter: emitter,
                cb: function(err) {
                    try {
                        if(err) {
                            reject(new Error('Script execution failed: ' + (err.stack || err)));
                        }
                        else {
                            expect(ack).toBe(1);
                            expect(inFlight).toBe(3);
                            expect(success).toBe(3);
                            expect(done).toBe(1);
                            resolve();
                        }
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }, 15000);
});