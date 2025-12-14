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

const Engine = require('../lib/engine');
describe('Debug Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({});
    });
    
    test('debug query execution', async () => {
        const q = 'obj = {"a": "test"}; foo = select a from obj; return foo';
        
        return new Promise((resolve, reject) => {
            engine.execute(q, {}, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(err);
                    } else {
                        expect(result).toBeTruthy();
                        expect(result.body).toBeDefined();
                        resolve();
                    }
                });
            });
        });
    }, 15000);
});