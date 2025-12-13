const Engine = require('../lib/engine');
const parsed = require('url');
describe('exec param overrides test Tests', () => {
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

    test('test-req-param', async () => {
        // Start a mock server to capture request parameters
        const http = require('http');
        server = http.createServer(function(req, res) {
            const parsed = require('url').parse(req.url, true);
            const body = {
                query: parsed.query
            };
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(body));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const script = 'create table test on select get from "http://localhost:3000/test?foo={foo}&bar={bar}";\
                       return select * from test where foo = "hello" and bar = "world";';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Request param test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            expect(result.body.query).toBeDefined();
                            expect(result.body.query.foo).toBe('hello');
                            expect(result.body.query.bar).toBe('world');
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('test-req-param-override', async () => {
        // Start a mock server to capture request parameters
        const http = require('http');
        server = http.createServer(function(req, res) {
            const parsed = require('url').parse(req.url, true);
            const body = {
                query: parsed.query
            };
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(body));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const script = 'create table test on select get from "http://localhost:3000/test?foo={foo}&bar={bar}";\
                       return select * from test where foo = "original" and bar = "value";';
        
        return new Promise((resolve, reject) => {
            const context = {
                foo: 'overridden',
                bar: 'value'
            };
            engine.execute(script, {
                context: context,
                request: {
                    params: {
                        foo: 'overridden'
                    }
                }
            }, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Request param override test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            expect(result.body.query).toBeDefined();
                            expect(result.body.query.foo).toBe('overridden');
                            expect(result.body.query.bar).toBe('value');
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('test-req-param-override-undefined', async () => {
        // Start a mock server to capture request parameters
        const http = require('http');
        server = http.createServer(function(req, res) {
            const parsed = require('url').parse(req.url, true);
            const body = {
                query: parsed.query
            };
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(body));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const script = 'create table test on select get from "http://localhost:3000/test?foo={foo}&bar={bar}";\
                       return select * from test where foo = "original" and bar = "value";';
        
        return new Promise((resolve, reject) => {
            const context = {
                foo: 'original',
                bar: 'value'
            };
            engine.execute(script, {
                context: context,
                request: {
                    params: {
                        foo: undefined
                    }
                }
            }, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Request param override undefined test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            expect(result.body.query).toBeDefined();
                            // When override is undefined, should use original value
                            expect(result.body.query.foo).toBe('original');
                            expect(result.body.query.bar).toBe('value');
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('test-header-override', async () => {
        // Start a mock server to capture request headers
        const http = require('http');
        server = http.createServer(function(req, res) {
            const body = {
                headers: req.headers
            };
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(body));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const script = 'create table test on select get from "http://localhost:3000/test" using headers "x-custom" = "{customHeader}";\
                       return select * from test where customHeader = "overridden";';
        
        return new Promise((resolve, reject) => {
            const context = {
                customHeader: 'overridden'
            };
            engine.execute(script, {
                context: context,
                request: {
                    headers: {
                        'x-custom': 'overridden'
                    }
                }
            }, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Header override test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            expect(result.body.headers).toBeDefined();
                            expect(result.body.headers['x-custom']).toBe('overridden');
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('test-header-override-undefined', async () => {
        // Start a mock server to capture request headers
        const http = require('http');
        server = http.createServer(function(req, res) {
            const body = {
                headers: req.headers
            };
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(body));
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const script = 'create table test on select get from "http://localhost:3000/test" using headers "x-custom" = "{customHeader}" using defaults customHeader = "original";\
                       return select * from test;';
        
        return new Promise((resolve, reject) => {
            const context = {
                // customHeader is not defined, should use default
            };
            engine.execute(script, {
                context: context,
                request: {
                    headers: {
                        'x-custom': undefined
                    }
                }
            }, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Header override undefined test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            expect(result.body.headers).toBeDefined();
                            // When override is undefined, should use default value
                            expect(result.body.headers['x-custom']).toBe('original');
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
});