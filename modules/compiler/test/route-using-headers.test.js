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

'use strict';

const compiler = require('../lib/compiler');

describe('Route Using Headers Tests', () => {
    test('route using header', () => {
        const q = "return {} via route '/foo/bar' using method get using headers 'A' = 'B';";
        const compiled = compiler.compile(q);
        expect(compiled.type).toBe('return');
        expect(compiled.route).toBeTruthy();
        expect(compiled.route.path.value).toBe('/foo/bar');
        expect(compiled.route.method).toBe('get');
        expect(compiled.route.headers).toEqual({'A' : 'B'});
    });

    test('route using headers token name', () => {
        const q = "name = \"hello\";return {} via route '/foo/bar' using method get using headers '{name}' = 'B', 'B' = 'C';";
        const compiled = compiler.compile(q);
        expect(compiled.type).toBe('return');
        expect(compiled.route).toBeTruthy();
        expect(compiled.route.path.value).toBe('/foo/bar');
        expect(compiled.route.method).toBe('get');
        expect(compiled.route.headers).toEqual({'{name}' : 'B', 'B' : 'C'});
    });

    test('route using headers token value', () => {
        const q = "name = \"hello\"; value = \"world\";return {} via route '/foo/bar' using method get using headers '{name}' = '{value}', 'B' = 'C';";
        const compiled = compiler.compile(q);
        expect(compiled.type).toBe('return');
        expect(compiled.route).toBeTruthy();
        expect(compiled.route.path.value).toBe('/foo/bar');
        expect(compiled.route.method).toBe('get');
        expect(compiled.route.headers).toEqual({'{name}' : '{value}', 'B' : 'C'});
    });
});