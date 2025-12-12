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

describe('Describe Tests', () => {
    test('describe', () => {
        const q = "describe foo";
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('describe');
        expect(statement.rhs.source.name).toBe('foo');
    });

    test('desc', () => {
        const q = "desc foo";
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('describe');
        expect(statement.rhs.source.name).toBe('foo');
    });

    test('describe-no-table', () => {
        const q = "describe ";
        expect(() => {
            compiler.compile(q);
        }).toThrow();
    });

    test('describe-assign', () => {
        const q = "des = describe foo; return {};";
        const statement = compiler.compile(q);
        expect(statement.rhs.dependsOn[0].assign).toBe('des');
    });
});