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

describe('Delete Tests', () => {
    test('delete', () => {
        const q = "delete from foo where bar = 'a'";
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('delete');
        expect(plan.rhs.source.name).toBe('foo');
        expect(plan.rhs.whereCriteria).toEqual([
            {
                "operator": "=",
                "lhs": {name: "bar", type: 'column'},
                "rhs": {
                    "value": "a"
                }
            }
        ]);
    });

    test('delete-csv', () => {
        const q = "delete from ebay.item where itemId in ('180652013910','120711247507')";
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('delete');
        expect(plan.rhs.source.name).toBe('ebay.item');
        expect(plan.rhs.whereCriteria).toEqual([
            {
                operator: 'in',
                lhs: {name: 'itemId'},
                "rhs": {
                    value: ['180652013910', '120711247507']
                }
            }
        ]);
    });

    test('delete-timeouts', () => {
        const q = "delete from ebay.item where itemId in ('180652013910','120711247507') timeout 10 minDelay 100 maxDelay 10000";
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('delete');
        expect(plan.rhs.source.name).toBe('ebay.item');
        expect(plan.rhs.whereCriteria).toEqual([
            {
                operator: 'in',
                lhs: {name: 'itemId'},
                "rhs": {
                    value: ['180652013910', '120711247507']
                }
            }
        ]);
        expect(plan.rhs.timeout).toBe(10);
        expect(plan.rhs.minDelay).toBe(100);
        expect(plan.rhs.maxDelay).toBe(10000);
    });

    test('delete-from-obj', () => {
        const q = 'obj = {\
                    "a" : "A",\
                    "b" : "B",\
                    "c" : "C"\
                }\
                return delete from obj where a = "A";';
        const plan = compiler.compile(q);
        expect(plan.rhs.source).toEqual({name: '{obj}'});
        expect(plan.rhs.whereCriteria).toEqual([
            { 
                operator: '=',
                lhs: { type: 'column', name: 'a' },
                rhs: { value: 'A' } 
            }
        ]);
        expect(plan.rhs.dependsOn[0].object).toEqual({ a: 'A', b: 'B', c: 'C' });
    });
});