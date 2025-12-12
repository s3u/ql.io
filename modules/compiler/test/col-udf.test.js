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

describe('Column UDF Tests', () => {
    test('udf-args', () => {
        const q = 'select id, name(fname, lname) from people';
        const c = compiler.compile(q);
        const columns = [
            { type: 'column', name: 'id' },
            { operator: 'udf',
                name: 'name',
                args: [
                    { type: 'column', name: 'fname' },
                    { type: 'column', name: 'lname' }
                ] }
        ];
        expect(c.rhs.columns).toEqual(columns);
    });

    test('udf-args-literal', () => {
        const q = 'select id, name(1, 2.0, "hello", "hello world", {"p" : "v"}) from people';
        const c = compiler.compile(q);
        expect(c.rhs.columns[1].args).toEqual([
            {
                "type": "literal",
                "value": 1
            },
            {
                "type": "literal",
                "value": 2.0
            },
            {
                "type": "literal",
                "value": "hello"
            },
            {
                "type": "literal",
                "value": "hello world"
            },
            {
                "type": "literal",
                "value": {'p' : 'v'}
            }
        ]);
    });

    test('udf-args-mixed', () => {
        const q = 'select id, name(1, fname, lname) from people;';
        const c = compiler.compile(q);
        expect(c.rhs.columns[1].args).toEqual([
            {
                "type": "literal",
                "value": 1
            },
            {
                "type": "column",
                "name": "fname"
            },
            {
                "type": "column",
                "name": "lname"
            }
        ]);
    });

    test('udf-args-with-alias', () => {
        const q = 'select id as id, name(fname, lname) as name from people';
        const c = compiler.compile(q);
        const columns = [ 
            { type: 'column', name: 'id', alias: 'id' },
            { operator: 'udf',
                name: 'name',
                args: [
                    { type: 'column', name: 'fname' },
                    { type: 'column', name: 'lname' } 
                ],
                alias: 'name' 
            } 
        ];
        expect(c.rhs.columns).toEqual(columns);
    });
});