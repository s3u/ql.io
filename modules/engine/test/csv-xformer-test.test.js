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

const csvXFormer = require('../lib/xformers/csv');

describe('CSV Transformer Tests', () => {
    test('Simple parse with headers', async () => {
        return new Promise((resolve, reject) => {
            csvXFormer.toJson('id,lastname,firstname\r\n1,Dow,John\r\n101,AnotherDow,Jane', 
                function(results) {
                    try {
                        expect(results).toEqual([
                            { id: '1', lastname: 'Dow', firstname: 'John' },
                            { id: '101', lastname: 'AnotherDow', firstname: 'Jane' }
                        ]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 
                function(error) {
                    reject(new Error("Test failed: " + error));
                }, 
                true
            );
        });
    });

    test('Handle null with headers', async () => {
        return new Promise((resolve, reject) => {
            csvXFormer.toJson(null, 
                function(json) {
                    try {
                        expect(json).toEqual([]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 
                function(error) {
                    reject(new Error("Test failed: " + error));
                }, 
                true
            );
        });
    });

    test('Handle undefined with headers', async () => {
        return new Promise((resolve, reject) => {
            csvXFormer.toJson(undefined, 
                function(json) {
                    try {
                        expect(json).toEqual([]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 
                function(error) {
                    reject(new Error("Test failed: " + error));
                }, 
                true
            );
        });
    });

    test('Handle invalid data with headers', async () => {
        return new Promise((resolve, reject) => {
            csvXFormer.toJson("akjkjdf", 
                function(json) {
                    try {
                        expect(json).toEqual([]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 
                function(error) {
                    reject(new Error("Test failed: " + error));
                }, 
                true
            );
        });
    });

    test('Simple parse without headers', async () => {
        return new Promise((resolve, reject) => {
            csvXFormer.toJson('id,lastname,firstname\r\n1,Dow,John\r\n101,AnotherDow,Jane', 
                function(results) {
                    try {
                        expect(results).toEqual([
                            ['id', 'lastname', 'firstname'],
                            ['1', 'Dow', 'John'],
                            ['101', 'AnotherDow', 'Jane']
                        ]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 
                function(error) {
                    reject(new Error("Test failed: " + error));
                }
            );
        });
    });

    test('Handle null without headers', async () => {
        return new Promise((resolve, reject) => {
            csvXFormer.toJson(null, 
                function(json) {
                    try {
                        expect(json).toEqual([['null']]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 
                function(error) {
                    reject(new Error("Test failed: " + error));
                }
            );
        });
    });

    test('Handle undefined without headers', async () => {
        return new Promise((resolve, reject) => {
            csvXFormer.toJson(undefined, 
                function(json) {
                    try {
                        expect(json).toEqual([['undefined']]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 
                function(error) {
                    reject(new Error("Test failed: " + error));
                }
            );
        });
    });

    test('Handle invalid data without headers', async () => {
        return new Promise((resolve, reject) => {
            csvXFormer.toJson("akjkjdf", 
                function(json) {
                    try {
                        expect(json).toEqual([['akjkjdf']]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 
                function(error) {
                    reject(new Error("Test failed: " + error));
                }
            );
        });
    });
});
