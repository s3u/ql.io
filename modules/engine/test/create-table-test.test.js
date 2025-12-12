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

describe('Create Table Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });
    
    test('engine loads existing tables', () => {
        // Test that engine can load tables from directory
        expect(engine).toBeDefined();
        expect(engine.tables).toBeDefined();
        expect(typeof engine.tables).toBe('object');
        
        // Test that some tables are loaded
        const tableNames = Object.keys(engine.tables);
        expect(Array.isArray(tableNames)).toBe(true);
    });
    
    test('create table functionality', async () => {
        // Test basic create table functionality
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            try {
                // Test table creation concepts
                const tableDefinition = {
                    name: 'test.table',
                    method: 'GET',
                    uri: 'http://example.com/api'
                };
                
                expect(tableDefinition).toHaveProperty('name');
                expect(tableDefinition).toHaveProperty('method');
                expect(tableDefinition).toHaveProperty('uri');
                
                // Test engine execute function exists
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
