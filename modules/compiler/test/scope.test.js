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

"use strict";

const compiler = require('../lib/compiler');

describe('Scope Tests', () => {
    test('try catch', () => {
        const q = "try {select * from aaa;\n\
        throw (asdf)}\n\
        catch (asdf){\n\
            a = 1\n\
        }\n\
        finally {select * from bbb}";
        const statement = compiler.compile(q);
        expect(statement.rhs.dependsOn.length).toBe(3);
        expect(statement.rhs.catchClause.length).toBe(1);
        expect(statement.rhs.catchClause[0].condition.values).toBe('asdf');
        expect(statement.rhs.catchClause[0].condition.logic).toBe('normal');
        expect(statement.rhs.finallyClause.length).toBe(1);
    });

    test('if else', () => {
        const q = "if (awef || wef && !jlk) {e = select * from f} else {g = select * from h}\n\
            return e || g";
        const statement = compiler.compile(q);
        expect(statement.rhs.dependsOn.length).toBe(1);
        expect(statement.rhs.dependsOn[0].assign).toBe('e');
        expect(statement.rhs.dependsOn[0].scope).toBeTruthy();
        expect(statement.rhs.fallback).toBeTruthy();
        expect(statement.rhs.fallback.ref).toBe('g');
    });
});