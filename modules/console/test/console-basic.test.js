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

const Console = require('../app.js');

describe('Console Basic Tests', () => {
    test('console module loads without errors', () => {
        expect(Console).toBeDefined();
        expect(typeof Console).toBe('function');
    });

    test('console can be instantiated', (done) => {
        const c = new Console({
            tables : __dirname + '/tables',
            routes: __dirname + '/routes', 
            config: __dirname + '/config/dev.json',
            'enable console': false,
            connection: 'close'
        });

        expect(c).toBeDefined();
        expect(c.app).toBeDefined();
        expect(c.server).toBeDefined();
        
        // Test that the server can start and stop
        c.listen(3001, function() {
            expect(c.server.listening).toBe(true);
            c.close(function() {
                done();
            });
        });
    });

    test('console version is defined', () => {
        // Version is exported from the module, not as a static property
        const packageJson = require('../package.json');
        expect(packageJson.version).toBeDefined();
        expect(typeof packageJson.version).toBe('string');
    });
});