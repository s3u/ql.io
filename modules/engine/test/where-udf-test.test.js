const Engine = require('../lib/engine');
describe('where udf test Tests', () => {
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

    test('missing-udf', async () => {
        const script = 'a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                             {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                             {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                       return select a1.name, a1.keys from a1 where toUpper()';
        
        // Must fail since the UDF is not defined
        return new Promise((resolve, reject) => {
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, results) {
                    try {
                        if(err) {
                            // Expected error due to missing UDF
                            expect(true).toBe(true);
                            resolve();
                        }
                        else {
                            reject(new Error('Expected error for missing UDF but got success'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    }, 15000);
    test('no-args', async () => {
        const script = 'u = require("./test/udfs/upper.js");\
                       a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                     {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                     {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                       return select name, keys from a1 where u.toUpper()';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            expect(results.body[0][0]).toBe('BRAND-A');
                            expect(results.body[1][0]).toBe('BRAND-B');
                            expect(results.body[2][0]).toBe('BRAND-C');
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('literal-args-str', async () => {
        const script = 'u = require("./test/udfs/args.js");\
                       a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                             {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                             {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                       return select name, keys from a1 where u.echo("one", "two")';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            for(let i = 0; i < 3; i++) {
                                expect(results.body[i][0]).toBe('one');
                                expect(results.body[i][1]).toBe('two');
                            }
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('literal-args-mixed', async () => {
        const script = 'u = require("./test/udfs/args.js");\
                       a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                             {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                             {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                       return select name, keys from a1 where u.echo("one", 2, 1.2345, false, true, {"name":"value"})';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            for(let i = 0; i < 3; i++) {
                                expect(results.body[i][0]).toBe('one');
                                expect(results.body[i][1]).toBe(2);
                                expect(results.body[i][2]).toBe(1.2345);
                                expect(results.body[i][3]).toBe(false);
                                expect(results.body[i][4]).toBe(true);
                                expect(results.body[i][5]).toBeDefined();
                                expect(results.body[i][5].name).toBe("value");
                            }
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('col-args', async () => {
        const script = 'u = require("./test/udfs/args.js");\
                               a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                     {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                     {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                               return select name, keys from a1 where u.echo(name, keys)';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            expect(results.body[0][0]).toBe('Brand-A');
                            expect(results.body[0][1]).toEqual([{ "name": "G1"},{"name": "G2"},{"name": "G3"}]);
                            expect(results.body[1][0]).toBe('Brand-B');
                            expect(results.body[1][1]).toEqual([{ "name": "G1"},{"name": "G2"}]);
                            expect(results.body[2][0]).toBe('Brand-C');
                            expect(results.body[2][1]).toEqual([{ "name": "G4"},{"name": "G2"}]);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('col-args-extra-echo', async () => {
        const script = 'u = require("./test/udfs/args.js");\
                       a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                             {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                             {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                       return select name from a1 where u.echo(name, keys)';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            expect(results.body[0][0]).toBe('Brand-A');
                            expect(results.body[0][1]).toEqual([
                                { "name": "G1"},
                                {"name": "G2"},
                                {"name": "G3"}
                            ]);
                            expect(results.body[1][0]).toBe('Brand-B');
                            expect(results.body[1][1]).toEqual([
                                { "name": "G1"},
                                {"name": "G2"}
                            ]);
                            expect(results.body[2][0]).toBe('Brand-C');
                            expect(results.body[2][1]).toEqual([
                                { "name": "G4"},
                                {"name": "G2"}
                            ]);
                            for(let i = 0; i < 3; i++) {
                                expect(results.body[i].length).toBe(2);
                            }
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('col-args-alias-extra-echo', async () => {
        const script = 'u = require("./test/udfs/args.js");\
                       a1 = [{"name": "Brand-A", "color": "red", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                             {"name": "Brand-B", "color": "green", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                             {"name": "Brand-C", "color": "blue", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                       return select name as n, keys as k from a1 where u.echo(name, color, keys)';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            // Though we selected fields by alias the UDF converted into an array
                            expect(results.body[0][0]).toBe('Brand-A');
                            expect(results.body[0][1]).toBe('red');
                            expect(results.body[0][2]).toEqual([
                                { "name": "G1"},
                                {"name": "G2"},
                                {"name": "G3"}
                            ]);
                            expect(results.body[1][0]).toBe('Brand-B');
                            expect(results.body[1][1]).toBe('green');
                            expect(results.body[1][2]).toEqual([
                                { "name": "G1"},
                                {"name": "G2"}
                            ]);
                            expect(results.body[2][0]).toBe('Brand-C');
                            expect(results.body[2][1]).toBe('blue');
                            expect(results.body[2][2]).toEqual([
                                { "name": "G4"},
                                {"name": "G2"}
                            ]);
                            for(let i = 0; i < 3; i++) {
                                expect(results.body[i].length).toBe(3);
                            }
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('col-args-extra-thru', async () => {
        // Selected rows should not have keys
        const script = 'u = require("./test/udfs/args.js");\
                       a1 = [{"name": "Brand-A", "color": "red", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                             {"name": "Brand-B", "color": "green", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                             {"name": "Brand-C", "color": "blue", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                       return select name from a1 where u.thru(name, keys, color)';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            expect(results.body[0][0]).toBe('Brand-A');
                            expect(results.body[1][0]).toBe('Brand-B');
                            expect(results.body[2][0]).toBe('Brand-C');
                            for(let i = 0; i < 3; i++) {
                                expect(results.body[i].length).toBe(1);
                            }
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('col-args-alias-extra-thru', async () => {
        const script = 'u = require("./test/udfs/args.js");\
                       a1 = [{"name": "Brand-A", "color": "red", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                             {"name": "Brand-B", "color": "green", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                             {"name": "Brand-C", "color": "blue", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                       return select name as n, keys as k from a1 where u.thru(name, color, keys)';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            // Though we selected fields by alias the UDF converted into an array
                            expect(results.body[0].n).toBe('Brand-A');
                            expect(results.body[0].k).toEqual([
                                { "name": "G1"},
                                {"name": "G2"},
                                {"name": "G3"}
                            ]);
                            expect(results.body[1].n).toBe('Brand-B');
                            expect(results.body[1].k).toEqual([
                                { "name": "G1"},
                                {"name": "G2"}
                            ]);
                            expect(results.body[2].n).toBe('Brand-C');
                            expect(results.body[2].k).toEqual([
                                { "name": "G4"},
                                {"name": "G2"}
                            ]);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('filter-row', async () => {
        const script = 'u = require("./test/udfs/filter.js");\n\
                       a = [1, 1, 2, 2, 3, 3, 4];\n\
                       b = select * from a where u.filter();\n\
                       return b';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, results) {
                    if(err) {
                        reject(new Error('Filter UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            expect(results.body).toEqual([1,2,3,4]);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('select-*', async () => {
        const script = 'u = require("./test/udfs/args.js");\n\
                       a = {"arr": [1, 1, 2, 2, 3, 3, 4]};\n\
                       b = select * from a where u.stringify();\n\
                       return b';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        reject(new Error('UDF execution failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(results.body).toBeDefined();
                            expect(results.body).toBe('{"arr":[1,1,2,2,3,3,4]}');
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