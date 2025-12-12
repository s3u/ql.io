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

describe('QL Script Tests', () => {
    test('select-script', () => {
        const q = 'a = select * from foo;\n\
                 results = select title[0],\n\
                      itemId[0], primaryCategory[0].categoryName[0], sellingStatus[0].currentPrice[0]\n\
                      from a;\n\
                 return results;';
        const statement = compiler.compile(q);
        expect(statement.type).toBe('return');
        expect(statement.rhs.ref).toBe('results');
        expect(statement.rhs.dependsOn.length).toBe(1);
        expect(statement.rhs.dependsOn[0].assign).toBe('results');
        expect(statement.rhs.dependsOn[0].type).toBe('select');
    });

    test('null-val', () => {
        const script = 'a = null';
        const plan = compiler.compile(script);
        expect(plan.rhs.object).toBe(null);
        expect(plan.rhs.assign).toBe('a');
    });

    test('escaped-quotes', () => {
        const script = 'a = "Hello\\"World"';
        const plan = compiler.compile(script);
        expect(plan.rhs.object).toBe("Hello\"World");
    });

    test('circular-ref', () => {
        const script = 'foo = select * from foo;\n\
                      return foo;';
        expect(() => {
            compiler.compile(script);
        }).toThrow();
    });
});