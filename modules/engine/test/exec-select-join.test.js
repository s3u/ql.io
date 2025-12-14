const Engine = require('../lib/engine');
const _ = require('underscore');
describe('exec select join test Tests', () => {
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

    test('select-join-n-rows', async () => {
        const script = 'a = [{"x":"x", "id":"1"}];\
                       b = [{"id":"1", "y":"y1"},{"id":"1", "y":"y2"}];\
                       return select a.id, b.y from a as a, b  as b where b.id=a.id;';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, list) {
                    if(err) {
                        reject(new Error('got error: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(list.headers).toBeDefined();
                            expect(list.headers['content-type']).toBe('application/json');
                            expect(list.body).toBeDefined();
                            expect(list.body.length).toBe(2);
                            expect(list.body).toEqual([
                                ["1", "y1"],
                                ["1", "y2"]
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
    test('select-join-n-rows-with-alias', async () => {
        const script = 'a = [{"x":"x", "id":"1"}];\
                       b = [{"id":"1", "y":"y1"},{"id":"1", "y":"y2"}];\
                       return select a.id as a, b.y as y from a as a, b  as b where b.id=a.id;';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, list) {
                    if(err) {
                        reject(new Error('got error: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(list.headers).toBeDefined();
                            expect(list.headers['content-type']).toBe('application/json');
                            expect(list.body).toBeDefined();
                            expect(list.body.length).toBe(2);
                            expect(list.body).toEqual([
                                {
                                    "a": "1",
                                    "y": "y1"
                                },
                                {
                                    "a": "1",
                                    "y": "y2"
                                }
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
});