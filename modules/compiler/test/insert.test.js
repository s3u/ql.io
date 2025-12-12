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

describe('Insert Tests', () => {
    test('insert', () => {
        const q = "insert into suppliers (supplier_id, supplier_name) values ('24553', 'IBM')";
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('insert');
        expect(plan.rhs.source).toEqual({
            "name": "suppliers"
        });
        expect(plan.rhs.columns).toEqual([
            {name: "supplier_id", type: 'column'},
            {name: "supplier_name", type: 'column'}
        ]);
        expect(plan.rhs.values).toEqual([
            "24553",
            "IBM"
        ]);
    });

    test('mismatch-count', () => {
        const q = "insert into ebay.internal.shorturi (longUri, duration) values ('http://desc.shop.ebay.in/helloworld', '1', '2')";
        expect(() => {
            compiler.compile(q);
        }).toThrow();
    });

    test('insert-assign', () => {
        const q = "a = insert into foo (a, b, c) values ('a', 'b', 'c'); \nreturn {};";
        const plan = compiler.compile(q);
        expect(plan.rhs.dependsOn[0].assign).toBe('a');
        expect(plan.rhs.dependsOn[0].values).toEqual(['a', 'b', 'c']);
        expect(plan.rhs.dependsOn[0].columns).toEqual([
            { type: 'column', name: 'a' },
            { type: 'column', name: 'b' },
            { type: 'column', name: 'c' }
        ]);
    });

    test('insert-no-table', () => {
        const q = "insert into";
        expect(() => {
            compiler.compile(q);
        }).toThrow();
    });

    test('insert-opaque', () => {
        const q = "insert into suppliers values ('24553')";
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('insert');
        expect(plan.rhs.source).toEqual({
            "name": "suppliers"
        });
        expect(plan.rhs.values).toBe("24553");
    });

    test('insert-multiparts', () => {
        const q = 'insert into mytable (name, salary) values ( "John Smith", 5) with parts "{parts[0]}", "{parts[4]}", "{parts[2]}"';
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('insert');
        expect(plan.rhs.parts.length).toBe(3);
        expect(plan.rhs.parts).toEqual([
            "{parts[0]}",
            "{parts[4]}",
            "{parts[2]}"
        ]);
    });

    test('insert-timeout', () => {
        const q = "insert into suppliers (supplier_id, supplier_name) values ('24553', 'IBM') timeout 10 minDelay 100 maxDelay 10000";
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('insert');
        expect(plan.rhs.timeout).toBe(10);
        expect(plan.rhs.minDelay).toBe(100);
        expect(plan.rhs.maxDelay).toBe(10000);
    });

    test('insert-obj', () => {
        const q = 'obj = {\n\
                    "p3" : "v3",\n\
                    "p4" : "v4"\n\
                 };\n\
                 updated = insert into obj (p5, p6) values ("v5", "v6");\n\
                 return updated;';

        const plan = compiler.compile(q);
        expect(plan.rhs.dependsOn[0].assign).toBe('updated');
        expect(plan.rhs.dependsOn[0].listeners[0].type).toBe('ref');
        expect(plan.rhs.dependsOn[0].type).toBe('insert');
        expect(plan.rhs.dependsOn[0].columns).toEqual([
            { type: 'column', name: 'p5' },
            { type: 'column', name: 'p6' }
        ]);
        expect(plan.rhs.dependsOn[0].values).toEqual(['v5', 'v6']);
        expect(plan.rhs.dependsOn[0].dependsOn[0].assign).toBe('obj');
        expect(plan.rhs.dependsOn[0].dependsOn[0].listeners[0].assign).toBe('updated');
    });

    test('insert-json', () => {
        const q = 'obj = {\n\
                    "p3" : "v3",\n\
                    "p4" : "v4"\n\
                 };\n\
                 j = {"p3": "v5", "p5": "v6"};\
                 updated = insert "{j}" into obj;\n\
                 return updated;';

        const plan = compiler.compile(q);
        expect(plan.rhs.dependsOn[0].assign).toBe('updated');
        expect(plan.rhs.dependsOn[0].listeners[0].type).toBe('ref');
        expect(plan.rhs.dependsOn[0].jsonObj).toEqual({ "value": "{j}" });
        expect(plan.rhs.dependsOn[0].dependsOn[0].assign).toBe('obj');
        expect(plan.rhs.dependsOn[0].dependsOn[0].listeners[0].assign).toBe('updated');
    });
});