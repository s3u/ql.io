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

describe('Dependency Tests', () => {
    test('define-dependency', () => {
        const script = 'a = "a";\
                      b = "{a}";\
                      c = "{b}";\
                      return c;';
        const plan = compiler.compile(script);
        expect(plan.rhs.dependsOn.length).toBe(1);
        expect(plan.rhs.dependsOn[0].object).toBe('{b}');
        expect(plan.rhs.dependsOn[0].dependsOn.length).toBe(1);
        expect(plan.rhs.dependsOn[0].dependsOn[0].object).toBe('{a}');
        expect(plan.rhs.dependsOn[0].dependsOn[0].dependsOn.length).toBe(1);
        expect(plan.rhs.dependsOn[0].dependsOn[0].dependsOn[0].object).toBe('a');
    });

    test('orphans-negative', () => {
        const q = 'show routes';
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('show routes');
        expect(plan.dependsOn.length).toBe(0);
    });

    test('fallback', () => {
        const q = 'ret1 = null; \
        ret2 = select category from mytable; \
        comp1 = "{ret2}"; \
        finalResult = "{ret1}" || "{comp1}"; \
        return finalResult';
        const plan = compiler.compile(q);
        let temp = plan.rhs;
        expect(temp.type).toBe('ref');
        expect(temp.ref).toBe('finalResult');
        expect(temp.dependsOn.length).toBe(1);
        temp = temp.dependsOn[0];
        expect(temp.type).toBe('define');
        expect(temp.assign).toBe('finalResult');
        expect(temp.dependsOn.length).toBe(1);
        expect(temp.dependsOn[0].type).toBe('define');
        expect(temp.dependsOn[0].assign).toBe('ret1');
        expect(temp.fallback).toBeTruthy();
        expect(temp.fallback.dependsOn.length).toBe(1);
    });
});