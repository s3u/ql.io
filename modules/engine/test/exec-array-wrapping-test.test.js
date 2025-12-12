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
describe('Exec Array Wrapping Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({});
    });
    
    test('array wrapping test', async () => {
        const script = 'source = [{"a": "1"}, {"a": "2"}]; return "{source.$..a}";';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function(emitter) {
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