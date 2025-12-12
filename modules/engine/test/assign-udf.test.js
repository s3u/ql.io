const Engine = require('../lib/engine');

describe('Assign UDF Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });

    test('with-args', async () => {
        const script = 'u = require("./test/udfs/addone.js");\
                      x = 1;\
                      y = 2;\
                      b = u.add(x, y);\
                      return b';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        reject(err);
                    }
                    else {
                        expect(results.body).toBe(3);
                        resolve();
                    }
                });
            });
        });
    }, 15000);

    test('no-arg', async () => {
        const script = 'u = require("./test/udfs/addone.js");\
                      x = 1;\
                      b = u.addonex();\
                      return b';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        reject(err);
                    }
                    else {
                        expect(results.body).toBe(2);
                        resolve();
                    }
                });
            });
        });
    }, 15000);

    test('dependency-check', async () => {
        const script = 'u = require("./test/udfs/addone.js");\
                      b = u.add(x_beta, y_beta);\
                      x = 1;\
                      x_beta = select * from x;\
                      y = 2;\
                      y_beta = select * from y;\
                      return b';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        reject(err);
                    }
                    else {
                        expect(results.body).toBe(3);
                        resolve();
                    }
                });
            });
        });
    }, 15000);

    test('direct-pass', async () => {
        const script = 'u = require("./test/udfs/addone.js");\
                      x = 1;\
                      b = u.add(x, 2);\
                      return b';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, results) {
                    if(err) {
                        reject(err);
                    }
                    else {
                        expect(results.body).toBe(3);
                        resolve();
                    }
                });
            });
        });
    }, 15000);
});