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

describe('Where UDF Tests', () => {
    test('star-udf-no-args', () => {
        const q = 'udfs = require("udf.js");select * from a1 where udfs.f1()';
        const c = compiler.compile(q);
        expect(c.rhs.columns.name).toBe('*');
        expect(c.rhs.columns.type).toBe('column');
        expect(c.rhs.whereCriteria[0].operator).toBe('udf');
        expect(c.rhs.whereCriteria[0].name).toBe('udfs.f1');
        expect(c.rhs.whereCriteria[0].args.length).toBe(0);
    });

    test('star-star-column-args', () => {
        const q = 'udfs = require("u.js");select * from a1 where udfs.f1(name)';
        const c = compiler.compile(q);
        expect(c.rhs.columns.name).toBe('*');
        expect(c.rhs.columns.type).toBe('column');
        expect(c.rhs.whereCriteria[0].operator).toBe('udf');
        expect(c.rhs.whereCriteria[0].name).toBe('udfs.f1');
        expect(c.rhs.whereCriteria[0].args.length).toBe(1);
    });

    test('literal-args', () => {
        const q = 'u = require("udf.js");select name, keys from a1 where u.literalArgs("one", 2, 1.2345, false, true, {"name":"value"})';
        const c = compiler.compile(q);
        expect(c.rhs.whereCriteria[0].operator).toBe('udf');
        expect(c.rhs.whereCriteria[0].name).toBe('u.literalArgs');
        expect(c.rhs.whereCriteria[0].args.length).toBe(6);
        expect(c.rhs.whereCriteria[0].args[0].value).toBe('one');
        expect(c.rhs.whereCriteria[0].args[1].value).toBe(2);
        expect(c.rhs.whereCriteria[0].args[2].value).toBe(1.2345);
        expect(c.rhs.whereCriteria[0].args[3].value).toBe(false);
        expect(c.rhs.whereCriteria[0].args[4].value).toBe(true);
        expect(c.rhs.whereCriteria[0].args[5].value.name).toBe('value');
    });
});