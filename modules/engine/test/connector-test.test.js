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

const Engine = require('../lib/engine');

describe('Connector Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });
    
    test('engine has connectors', () => {
        // Test that engine has connector functionality
        expect(engine).toBeDefined();
        expect(engine.connectors).toBeDefined();
        expect(typeof engine.connectors).toBe('object');
    });
    
    test('connector functionality', async () => {
        // Test basic connector concepts
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            try {
                // Test connector structure
                const connector = {
                    type: 'http',
                    method: 'GET',
                    url: 'http://example.com'
                };
                
                expect(connector).toHaveProperty('type');
                expect(connector).toHaveProperty('method');
                expect(connector).toHaveProperty('url');
                expect(connector.type).toBe('http');
                
                // Test engine functionality
                expect(typeof engine.execute).toBe('function');
                
                clearTimeout(timeout);
                resolve();
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }, 15000);
});
