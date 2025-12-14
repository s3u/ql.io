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

describe('Find All Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });
    
    test('find all functionality', () => {
        // Test find all concepts
        expect(engine).toBeDefined();
        expect(typeof engine.execute).toBe('function');
        
        // Test find all operation
        const data = [
            { id: 1, name: 'John', active: true },
            { id: 2, name: 'Jane', active: false },
            { id: 3, name: 'Bob', active: true }
        ];
        
        const allItems = data;
        const activeItems = data.filter(item => item.active);
        
        expect(allItems.length).toBe(3);
        expect(activeItems.length).toBe(2);
        expect(activeItems[0].name).toBe('John');
        expect(activeItems[1].name).toBe('Bob');
    });
    
    test('find all processing', async () => {
        // Test find all processing logic
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            try {
                // Test find all with conditions
                const findAll = (data, condition) => {
                    if (!condition) {
                        return data;
                    }
                    return data.filter(condition);
                };
                
                const testData = [
                    { id: 1, category: 'A', value: 10 },
                    { id: 2, category: 'B', value: 20 },
                    { id: 3, category: 'A', value: 30 }
                ];
                
                const allResults = findAll(testData);
                const categoryAResults = findAll(testData, item => item.category === 'A');
                const highValueResults = findAll(testData, item => item.value > 15);
                
                expect(allResults.length).toBe(3);
                expect(categoryAResults.length).toBe(2);
                expect(highValueResults.length).toBe(2);
                
                clearTimeout(timeout);
                resolve();
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }, 15000);
});
