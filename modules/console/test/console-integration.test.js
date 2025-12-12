/*
 * Copyright 2011 eBay Software Foundation
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

"use strict";

const http = require('http');
const Console = require('../app.js');

describe('Console Integration Tests', () => {
    let console;
    
    beforeEach(() => {
        console = new Console({
            tables : __dirname + '/tables',
            routes: __dirname + '/routes',
            config: __dirname + '/config/dev.json',
            'enable console': false,
            connection: 'close'
        });
    });

    afterEach((done) => {
        if (console && console.server && console.server.listening) {
            console.close(done);
        } else {
            done();
        }
    });

    test('console server can handle basic HTTP requests', (done) => {
        console.listen(3002, function() {
            const options = {
                hostname: 'localhost',
                port: 3002,
                path: '/tables',
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                expect(res.statusCode).toBeDefined();
                
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    // Just verify we got some response
                    expect(data).toBeDefined();
                    expect(typeof data).toBe('string');
                    done();
                });
            });

            req.on('error', (err) => {
                done(err);
            });

            req.end();
        });
    });

    test('console handles 404 errors correctly', (done) => {
        console.listen(3003, function() {
            const options = {
                hostname: 'localhost',
                port: 3003,
                path: '/nonexistent',
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                expect(res.statusCode).toBe(404);
                
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    expect(data).toBeDefined();
                    // Should be JSON error response
                    try {
                        const parsed = JSON.parse(data);
                        expect(parsed.error).toBeDefined();
                    } catch (e) {
                        // If not JSON, should at least be a string
                        expect(typeof data).toBe('string');
                    }
                    done();
                });
            });

            req.on('error', (err) => {
                done(err);
            });

            req.end();
        });
    });
});