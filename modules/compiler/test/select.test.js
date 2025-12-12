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

describe('Select Tests', () => {
    test('select-star', () => {
        const q = "select * from foo";
        const statement = compiler.compile(q);
        expect(statement.rhs.columns).toEqual({name: '*', type: 'column'});
    });

    test('select-some', () => {
        const q = 'select title[0], itemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] from ebay.finding.items';
        const statement = compiler.compile(q);
        expect(statement.rhs.columns).toEqual([
            {name: 'title[0]', type: "column"},
            {name: 'itemId[0]', type: "column"},
            {name: 'primaryCategory[0].categoryName[0]', type: "column"},
            {name: 'sellingStatus[0].currentPrice[0]', type: "column"}
        ]);
    });

    test('select-some-where', () => {
        const q = 'select title[0], itemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] from ebay.finding.items where keywords="cooper"';
        const statement = compiler.compile(q);
        expect(statement.rhs.columns).toEqual([
            {name: 'title[0]', type: "column"},
            {name: 'itemId[0]', type: "column"},
            {name: 'primaryCategory[0].categoryName[0]', type: "column"},
            {name: 'sellingStatus[0].currentPrice[0]', type: "column"}
        ]);
        expect(statement.rhs.whereCriteria).toEqual([
            { operator: '=', lhs: {name: 'keywords', type: "column"}, rhs: {
                value: 'cooper'
            } }
        ]);
    });

    test('select-alias', () => {
        const q = 'select e.title[0], e.itemId[0], e.primaryCategory[0].categoryName[0], ' +
            'e.sellingStatus[0].currentPrice[0] from ebay.finding.items as e where keywords="cooper"';
        const statement = compiler.compile(q);
        expect(statement.rhs.fromClause).toEqual([
            {name: 'ebay.finding.items', alias: 'e' }
        ]);
    });

    test('select-in-csv', () => {
        const q = "select ViewItemURLForNaturalSearch from ebay.item where itemId in ('180652013910','120711247507')";
        const statement = compiler.compile(q);
        expect(statement.rhs.fromClause).toEqual([
            {name: 'ebay.item'}
        ]);
        expect(statement.rhs.columns).toEqual([
            {name: 'ViewItemURLForNaturalSearch', type: "column"}
        ]);
        expect(statement.rhs.whereCriteria).toEqual([
            { operator: 'in', lhs: {name: 'itemId'}, "rhs": {
                value: ['180652013910', '120711247507']
            }}
        ]);
    });

    test('select-in-csv-numbers', () => {
        const q = "select * from a where a in (1, 2, '3')";
        const statement = compiler.compile(q);
        expect(statement.rhs.whereCriteria[0].operator).toBe('in');
        expect(statement.rhs.whereCriteria[0].lhs.name).toBe('a');
        expect(statement.rhs.whereCriteria[0].rhs.value).toEqual([1,2,'3']);
    });
});