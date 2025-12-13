const Engine = require('../lib/engine');
const _ = require('underscore');
describe('engine emitter new test Tests', () => {
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

    test('should emit compile error events for invalid syntax', async () => {
        const testEngine = new Engine({
            tables: __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        
        const script = 'desca table foo'; // Invalid syntax - should be 'desc'
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            let compileError = 0, ack = 0, done = 0;
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on(Engine.Events.SCRIPT_ACK, function() {
                    ack++;
                });
                
                emitter.on(Engine.Events.SCRIPT_COMPILE_ERROR, function(event) {
                    expect(event).toBeDefined();
                    compileError++;
                });
                
                emitter.on(Engine.Events.SCRIPT_DONE, function() {
                    done++;
                });
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Verify event counts
                        expect(ack).toBe(1);
                        expect(done).toBe(1);
                        expect(compileError).toBe(1);
                        
                        // Should have error due to compile failure
                        expect(err).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Compile errors are expected, don't reject
                    resolve();
                });
            });
        });
    });
    test('should emit success events for show tables command', async () => {
        const testEngine = new Engine();
        const script = 'show tables';
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            let inFlight = 0, success = 0, error = 0;
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function(event) {
                    expect(event).toBeDefined();
                    inFlight++;
                });
                
                emitter.on(Engine.Events.STATEMENT_SUCCESS, function(event) {
                    expect(event).toBeDefined();
                    success++;
                });
                
                emitter.on(Engine.Events.STATEMENT_ERROR, function(event) {
                    expect(event).toBeDefined();
                    error++;
                });
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should not have error for show tables
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Unexpected error: ' + err.message));
                            return;
                        }
                        
                        // Verify event counts
                        expect(inFlight).toBe(1);
                        expect(success).toBe(1);
                        expect(error).toBe(0);
                        
                        // Verify result
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Show tables error: ' + err.message));
                });
            });
        });
    });
    test('should emit error events for describe non-existent table', async () => {
        const testEngine = new Engine({
            tables: __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        
        const script = 'desc foo'; // 'foo' table doesn't exist
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            let inFlight = 0, success = 0, error = 0;
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function(event) {
                    expect(event).toBeDefined();
                    inFlight++;
                });
                
                emitter.on(Engine.Events.STATEMENT_SUCCESS, function(event) {
                    expect(event).toBeDefined();
                    success++;
                });
                
                emitter.on(Engine.Events.STATEMENT_ERROR, function(event) {
                    expect(event).toBeDefined();
                    error++;
                });
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Verify event counts - should have error for non-existent table
                        expect(inFlight).toBe(1);
                        expect(error).toBe(1);
                        expect(success).toBe(0);
                        
                        // Should have error
                        expect(err).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected for non-existent table
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });
    test('should emit error events for select from non-existent table', async () => {
        const testEngine = new Engine({
            tables: __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        
        // The table 'first' doesn't exist - should cause error
        const script = 'select * from first';
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            let inFlight = 0, success = 0, error = 0;
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function(event) {
                    expect(event).toBeDefined();
                    inFlight++;
                });
                
                emitter.on(Engine.Events.STATEMENT_SUCCESS, function(event) {
                    expect(event).toBeDefined();
                    success++;
                });
                
                emitter.on(Engine.Events.STATEMENT_ERROR, function(event) {
                    expect(event).toBeDefined();
                    error++;
                });
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Verify event counts - should have error for non-existent table
                        expect(inFlight).toBe(1);
                        expect(error).toBe(1);
                        expect(success).toBe(0);
                        
                        // Should have error
                        expect(err).toBeDefined();
                        if (err.message) {
                            expect(err.message).toBeDefined();
                        }
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected for non-existent table
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });
    test('should emit success events for valid select query', async () => {
        const http = require('http');
        const fs = require('fs');
        
        // Create mock server to serve test data
        server = http.createServer(function(req, res) {
            const file = __dirname + '/mock' + req.url;
            try {
                const stat = fs.statSync(file);
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Content-Length': stat.size
                });
                const readStream = fs.createReadStream(file);
                readStream.pipe(res);
            } catch (e) {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        
        // Use the eng-emit2 table that exists in mock files
        const script = `
            create table first on select get from "http://localhost:3000/eng-emit2.json"
            select * from first where keyword = "ipad"
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            let inFlight = 0, success = 0, error = 0;
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function(event) {
                    expect(event).toBeDefined();
                    inFlight++;
                });
                
                emitter.on(Engine.Events.STATEMENT_SUCCESS, function(event) {
                    expect(event).toBeDefined();
                    success++;
                });
                
                emitter.on(Engine.Events.STATEMENT_ERROR, function(event) {
                    expect(event).toBeDefined();
                    error++;
                });
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should not have error for valid select
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Unexpected error: ' + err.message));
                            return;
                        }
                        
                        // Verify event counts
                        expect(inFlight).toBeGreaterThan(0);
                        expect(success).toBeGreaterThan(0);
                        expect(error).toBe(0);
                        
                        // Verify result
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Select error: ' + err.message));
                });
            });
        });
    });
    test('should emit correct events for multi-statement script with local data', async () => {
        const testEngine = new Engine({
            tables: __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        
        const script = `data = {
            "name": {
                "first": "Hello",
                "last": "World"
            },
            "addresses": [
                {
                    "street": "1 Main Street",
                    "city": "No Name"
                },
                {
                    "street": "2 Main Street", 
                    "city": "Some Name"
                }
            ]
        };
        fields = select addresses[0].street, addresses[1].city, name.last from data;
        return {"result": "{fields}"};`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            let ack = 0, done = 0, inFlight = 0, success = 0, error = 0;
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on(Engine.Events.SCRIPT_ACK, function(event) {
                    expect(event).toBeDefined();
                    ack++;
                });
                
                emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function(event) {
                    expect(event).toBeDefined();
                    inFlight++;
                });
                
                emitter.on(Engine.Events.STATEMENT_SUCCESS, function(event) {
                    expect(event).toBeDefined();
                    success++;
                });
                
                emitter.on(Engine.Events.STATEMENT_ERROR, function(event) {
                    expect(event).toBeDefined();
                    error++;
                });
                
                emitter.on(Engine.Events.SCRIPT_DONE, function(event) {
                    expect(event).toBeDefined();
                    done++;
                });
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should not have error for valid script
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Unexpected error: ' + err.message));
                            return;
                        }
                        
                        // Verify event counts
                        expect(ack).toBe(1);
                        expect(inFlight).toBe(3); // data assignment, fields select, return
                        expect(success).toBe(3);
                        expect(error).toBe(0);
                        expect(done).toBe(1);
                        
                        // Verify result
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(typeof result.body).toBe('object');
                        expect(result.body.result).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Script execution error: ' + err.message));
                });
            });
        });
    });
});