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

const compiler = require('../lib/compiler');

describe('Route Tests', () => {
    test('route get', () => {
        const q = "des = describe foo; return des via route '/foo/bar' using method get;";
        const compiled = compiler.compile(q);
        expect(compiled.type).toBe('return');
        expect(compiled.rhs.dependsOn[0].type).toBe('describe');
        expect(compiled.route).toBeTruthy();
        expect(compiled.route.path.value).toBe('/foo/bar');
        expect(compiled.route.method).toBe('get');
    });

    test('route post', () => {
        const q = "des = describe foo; return des via route '/foo/{id}' using method post;";
        const compiled = compiler.compile(q);
        expect(compiled.type).toBe('return');
        expect(compiled.rhs.dependsOn[0].type).toBe('describe');
        expect(compiled.route).toBeTruthy();
        expect(compiled.route.path.value).toBe('/foo/{id}');
        expect(compiled.route.method).toBe('post');
    });
});