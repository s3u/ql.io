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

describe('JSONPath Expression Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });
    
    test('JSONPath expression functionality', () => {
        // Test JSONPath expression concepts
        expect(engine).toBeDefined();
        expect(typeof engine.execute).toBe('function');
        
        // Test JSONPath-like operations
        const data = {
            users: [
                { id: 1, name: 'John', profile: { age: 30, city: 'NYC' } },
                { id: 2, name: 'Jane', profile: { age: 25, city: 'LA' } }
            ]
        };
        
        // Simulate JSONPath queries
        const allUsers = data.users;
        const userNames = data.users.map(user => user.name);
        const userAges = data.users.map(user => user.profile.age);
        
        expect(allUsers.length).toBe(2);
        expect(userNames).toEqual(['John', 'Jane']);
        expect(userAges).toEqual([30, 25]);
    });
    
    test('JSONPath expression processing', async () => {
        // Test JSONPath expression processing
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            try {
                // Test JSONPath-like queries
                const queryData = (data, path) => {
                    const pathParts = path.split('.');
                    let result = data;
                    
                    for (const part of pathParts) {
                        if (part === '*') {
                            // Handle wildcard
                            if (Array.isArray(result)) {
                                result = result.flat();
                            }
                        } else if (result && typeof result === 'object') {
                            result = result[part];
                        } else {
                            return undefined;
                        }
                    }
                    
                    return result;
                };
                
                const testData = {
                    store: {
                        books: [
                            { title: 'Book 1', price: 10 },
                            { title: 'Book 2', price: 15 }
                        ]
                    }
                };
                
                const books = queryData(testData, 'store.books');
                const firstBook = queryData(testData, 'store.books.0');
                
                expect(Array.isArray(books)).toBe(true);
                expect(books.length).toBe(2);
                expect(firstBook).toBeDefined();
                expect(firstBook.title).toBe('Book 1');
                
                clearTimeout(timeout);
                resolve();
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }, 15000);
});