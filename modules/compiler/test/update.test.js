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

describe('Update Tests', () => {
    test('update', () => {
        const q = 'a = { "one" : 1 }; update tab with "{a}"';
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('update');
        expect(statement.rhs.dependsOn.length).toBe(1);
    });

    test('update-then-return', () => {
        const q = 'a = { "one" : 1 }; update tab with "{a}";select * from tab';
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('select');
        expect(statement.rhs.dependsOn.length).toBe(1);
        expect(statement.rhs.dependsOn[0].type).toBe('update');
        expect(statement.rhs.dependsOn[0].dependsOn.length).toBe(1);
    });

    test('update-select', () => {
        const q = 'a = select * from tab; update tab with "{a}"';
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('update');
        expect(statement.rhs.dependsOn.length).toBe(1);
        expect(statement.rhs.dependsOn[0].type).toBe("select");
    });

    test('update-timeout', () => {
        const q = 'a = select * from tab; update tab with "{a}" timeout 100 minDelay 50 maxDelay 5000';
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('update');
        expect(statement.rhs.dependsOn.length).toBe(1);
        expect(statement.rhs.dependsOn[0].type).toBe("select");
        expect(statement.rhs.timeout).toBe(100);
        expect(statement.rhs.minDelay).toBe(50);
        expect(statement.rhs.maxDelay).toBe(5000);
    });
});