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
// Note: These tests should run sequentially to avoid port conflicts
describe('Auth Tests', () => {
    let server;

    // Helper function to wait for server to be fully closed
    const closeServer = () => {
        return new Promise((resolve) => {
            if (server && server.listening) {
                server.close(() => {
                    server = null;
                    // Add small delay to ensure port is released
                    setTimeout(resolve, 100);
                });
            } else {
                resolve();
            }
        });
    };

    // Helper function to create server with retry logic
    const createServer = (port = 3000, retries = 5) => {
        return new Promise((resolve, reject) => {
            server = http.createServer(function (req, res) {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                
                req.on('end', () => {
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({'message': 'ok'}));
                });
            });
            
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE' && retries > 0) {
                    setTimeout(() => {
                        createServer(port, retries - 1).then(resolve).catch(reject);
                    }, 200);
                } else {
                    reject(err);
                }
            });
            
            server.listen(port, () => {
                resolve(port);
            });
        });
    };

    afterEach(async () => {
        await closeServer();
    });

    test('auth-ok', async () => {
        await createServer();
        
        // Add a small delay to ensure server is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const engine = new Engine({
            tables: __dirname + '/auth',
            config: {} // Explicitly pass empty config to avoid any proxy settings
        });
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Engine execution timed out after 10 seconds'));
            }, 10000);
            
            let callbackCalled = false;
            
            engine.execute('select * from auth.plugin where ok = "ok"', function(emitter) {
                emitter.on('end', function(err, result) {
                    if (callbackCalled) return;
                    callbackCalled = true;
                    clearTimeout(timeout);
                    
                    if(err) {
                        reject(err);
                    } else {
                        try {
                            expect(result.headers['content-type']).toBe('application/json');
                            expect(result.body.message).toBe('ok');
                            resolve();
                        } catch (assertionError) {
                            reject(assertionError);
                        }
                    }
                });
            });
        });
    }, 15000);

    test('auth-no-ok', async () => {
        await createServer();
        
        const engine = new Engine({
            tables: __dirname + '/auth'
        });
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out - expected auth failure but got no response'));
            }, 10000);
            
            let resolved = false;
            
            const handleResult = (err, result) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                
                if(err) {
                    // Expected behavior - auth should fail
                    resolve();
                } else {
                    reject(new Error('Expected authentication to fail but it succeeded'));
                }
            };
            
            try {
                engine.execute('select * from auth.plugin where ok = "no-ok"', function(emitter) {
                    emitter.on('end', handleResult);
                    emitter.on('error', (err) => handleResult(err, null));
                });
            } catch (syncError) {
                handleResult(syncError, null);
            }
        });
    }, 15000);

    test('auth-post-ok', async () => {
        await createServer();
        
        const engine = new Engine({
            tables: __dirname + '/auth',
            config: {} // Explicitly pass empty config to avoid any proxy settings
        });
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Engine execution timed out after 10 seconds'));
            }, 10000);
            
            let callbackCalled = false;
            
            engine.execute('select * from auth.plugin.post where ok = "ok"', function(emitter) {
                emitter.on('end', function(err, result) {
                    if (callbackCalled) return;
                    callbackCalled = true;
                    clearTimeout(timeout);
                    
                    if(err) {
                        reject(err);
                    } else {
                        try {
                            expect(result.headers['content-type']).toBe('application/json');
                            expect(result.body.message).toBe('ok');
                            resolve();
                        } catch (assertionError) {
                            reject(assertionError);
                        }
                    }
                });
            });
        });
    }, 15000);

    test('auth-post-no-ok', async () => {
        await createServer();
        
        const engine = new Engine({
            tables: __dirname + '/auth'
        });
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out - expected auth failure but got no response'));
            }, 10000);
            
            let resolved = false;
            
            const handleResult = (err, result) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                
                if(err) {
                    // Expected behavior - auth should fail
                    resolve();
                } else {
                    reject(new Error('Expected authentication to fail but it succeeded'));
                }
            };
            
            try {
                engine.execute('select * from auth.plugin.post where ok = "no-ok"', function(emitter) {
                    emitter.on('end', handleResult);
                    emitter.on('error', (err) => handleResult(err, null));
                });
            } catch (syncError) {
                handleResult(syncError, null);
            }
        });
    }, 15000);
});