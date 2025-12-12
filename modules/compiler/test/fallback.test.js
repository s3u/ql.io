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

describe('Fallback Tests', () => {
    test('return-values', () => {
        const q = "return 1 || 2 || 3";
        const statement = compiler.compile(q);
        expect(statement.rhs.object).toBe(1);
        expect(statement.rhs.fallback).toBeTruthy();
        expect(statement.rhs.fallback.object).toBe(2);
        expect(statement.rhs.fallback.fallback).toBeTruthy();
        expect(statement.rhs.fallback.fallback.object).toBe(3);
    });

    test('return-select-obj', () => {
        const q = "return select * from a || { 'yeah': 'ok' };";
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('select');
        expect(statement.rhs.fallback).toBeTruthy();
        expect(statement.rhs.fallback.object).toEqual({'yeah': 'ok'});
    });

    test('return-select-select', () => {
        const q = "return select * from a || select * from b;";
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('select');
        expect(statement.rhs.fallback).toBeTruthy();
        expect(statement.rhs.fallback.type).toBe('select');
        expect(statement.rhs.fallback.fromClause[0].name).toBe('b');
    });

    test('return-select-select-select', () => {
        const q = "return select * from a || select * from b || select * from c;";
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('select');
        expect(statement.rhs.fallback).toBeTruthy();
        expect(statement.rhs.fallback.type).toBe('select');
        expect(statement.rhs.fallback.fromClause[0].name).toBe('b');
        expect(statement.rhs.fallback.fallback.type).toBe('select');
        expect(statement.rhs.fallback.fallback.fromClause[0].name).toBe('c');
    });

    test('assign-select-obj', () => {
        const q = "a = select * from A || 10.0;";
        const statement = compiler.compile(q);
        expect(statement.rhs.type).toBe('select');
        expect(statement.rhs.fallback).toBeTruthy();
        expect(statement.rhs.fallback.object).toBe(10);
        expect(statement.rhs.fallback.assign).toBe(statement.rhs.assign);
    });

    test('deps-statements', () => {
        const q = "a = select * from A;\n\
                 b = select * from B;\n\
                 foo = select * from a || select * from b;\n\
                 return foo;";
        const statement = compiler.compile(q);
        expect(statement.rhs.ref).toBe('foo');
        expect(statement.rhs.dependsOn.length).toBe(1);
        expect(statement.rhs.dependsOn[0].type).toBe('select');
        expect(statement.rhs.dependsOn[0].fromClause[0].name).toBe('{a}');
        expect(statement.rhs.dependsOn[0].dependsOn.length).toBe(1);
        expect(statement.rhs.dependsOn[0].dependsOn[0].fromClause[0].name).toBe('A');
        expect(statement.rhs.dependsOn[0].fallback.type).toBe('select');
        expect(statement.rhs.dependsOn[0].fallback.fromClause[0].name).toBe('{b}');
        expect(statement.rhs.dependsOn[0].fallback.dependsOn.length).toBe(1);
        expect(statement.rhs.dependsOn[0].fallback.dependsOn[0].fromClause[0].name).toBe('B');
        expect(statement.rhs.ref).toBe(statement.rhs.dependsOn[0].fallback.assign);
    });

    test('assign-chaining', () => {
        const q = "a = 10 || 20 || 30 || 40";
        const statement = compiler.compile(q);
        expect(statement.rhs.assign).toBe('a');
        expect(statement.rhs.fallback.assign).toBe('a');
        expect(statement.rhs.fallback.fallback.assign).toBe('a');
        expect(statement.rhs.fallback.fallback.fallback.assign).toBe('a');
    });

    test('dep-orhpahs', () => {
        const q = "data = [\
                        {'name' : 'foo'},\
                        {'name' : 'bar'},\
                        {'name' : 'baz'}];\
                     a = select name from data;\n\
                     b = select * from t1 where name in '{data.name}' || '{a}';\n\
                     return select * from t2 || a";
        const plan = compiler.compile(q);
        expect(plan.rhs.type).toBe('select');
        expect(plan.rhs.fallback.type).toBe('ref');
        expect(plan.rhs.fallback.ref).toBe('a');
        expect(plan.rhs.fallback.dependsOn.length).toBe(1);
        expect(plan.rhs.fallback.dependsOn[0].type).toBe('select');
        expect(plan.rhs.fallback.dependsOn[0].assign).toBe('a');
        expect(plan.rhs.fallback.dependsOn[0].dependsOn.length).toBe(1);
        expect(plan.rhs.fallback.dependsOn[0].dependsOn[0].type).toBe('define');
        expect(plan.rhs.fallback.dependsOn[0].dependsOn[0].assign).toBe('data');
        expect(plan.rhs.dependsOn.length).toBe(1);
        expect(plan.rhs.dependsOn[0].type).toBe('select');
        expect(plan.rhs.dependsOn[0].assign).toBe('b');
        expect(plan.rhs.fallback.dependsOn.length).toBe(1);
        expect(plan.rhs.fallback.dependsOn[0].type).toBe('select');
        expect(plan.rhs.fallback.dependsOn[0].assign).toBe('a');
    });

    test('fallback-ref', () => {
        const q = "a = {'message': 'fallback'}; return select * from foo || a";
        const plan = compiler.compile(q);
        expect(plan.dependsOn.length).toBe(0);
        expect(plan.rhs.fallback.dependsOn.length).toBe(1);
        expect(plan.rhs.fallback.dependsOn[0].type).toBe('define');
        expect(plan.rhs.fallback.dependsOn[0].assign).toBe('a');
    });
});