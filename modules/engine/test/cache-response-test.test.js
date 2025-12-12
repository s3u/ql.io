/*
 * Copyright 2012 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Engine = require('../lib/engine');
const http = require('http');
const events = require('events');
const fs = require('fs');
const util = require('util');
// Mock cache implementation
class MockCache extends events.EventEmitter {
    constructor() {
        super();
        this.cache = {};
    }

    put(key, data, duration, cb) {
        cb = cb || function() {};
        if (!key) {
            return cb({ message: 'No key specified' });
        }
        this.cache[key] = data;
        cb(null, { message: 'success', data: true });
    }

    get(key, cb) {
        cb = cb || function() {};
        const result = this.cache[key];
        if (result === undefined) {
            return cb({ message: 'failure', data: false });
        }
        cb(null, { message: 'success', data: result });
    }
}

describe('Cache Response Tests', () => {
    let server;

    const closeServer = () => {
        return new Promise((resolve) => {
            if (server && server.listening) {
                server.close(() => {
                    server = null;
                    setTimeout(resolve, 100);
                });
            } else {
                resolve();
            }
        });
    };

    afterEach(async () => {
        await closeServer();
    });

    test('patch-compute cache json', async () => {
        const cache = new MockCache();
        const result = JSON.stringify({ counter: 1 });
        cache.put('patch-compute-key', {
            result: { content: result },
            res: {
                headers: {
                    'content-type': 'application/json',
                    'content-length': result.length
                },
                statusCode: 200
            }
        }, 10);

        server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({}));
            throw new Error('Should not reach here - cache should be used');
        });

        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });

        const engine = new Engine({
            tables: __dirname + '/cache',
            cache: cache
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out'));
            }, 15000);

            engine.exec('select * from patch.compute.key', (err, result) => {
                clearTimeout(timeout);
                if (err) {
                    reject(err);
                } else {
                    try {
                        expect(result.headers['content-type']).toBe('application/json');
                        expect(result.body).toEqual({ counter: 1 });
                        
                        // Test cache hit on second call
                        engine.exec('select * from patch.compute.key', (err2, result2) => {
                            if (err2) {
                                reject(err2);
                            } else {
                                try {
                                    expect(result2.headers['content-type']).toBe('application/json');
                                    expect(result2.body).toEqual({ counter: 1 });
                                    resolve();
                                } catch (assertionError) {
                                    reject(assertionError);
                                }
                            }
                        });
                    } catch (assertionError) {
                        reject(assertionError);
                    }
                }
            });
        });
    }, 15000);

    test('auto-compute cache json', async () => {
        let counter = 1;

        server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ counter: counter }));
            counter++;
        });

        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });

        const engine = new Engine({
            tables: __dirname + '/cache',
            cache: new MockCache()
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out'));
            }, 15000);

            engine.exec('select * from auto.compute.key', (err, result) => {
                if (err) {
                    clearTimeout(timeout);
                    reject(err);
                } else {
                    try {
                        expect(result.headers['content-type']).toBe('application/json');
                        expect(result.body).toEqual({ counter: 1 });
                        
                        // Test cache hit - should return same result
                        engine.exec('select * from auto.compute.key', (err2, result2) => {
                            clearTimeout(timeout);
                            if (err2) {
                                reject(err2);
                            } else {
                                try {
                                    expect(result2.headers['content-type']).toBe('application/json');
                                    expect(result2.body).toEqual({ counter: 1 }); // Should be cached
                                    resolve();
                                } catch (assertionError) {
                                    reject(assertionError);
                                }
                            }
                        });
                    } catch (assertionError) {
                        reject(assertionError);
                    }
                }
            });
        });
    }, 15000);
});
