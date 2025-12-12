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

describe('Line Prerequisite Tests', () => {
    test('single level select with where =', () => {
        const q = 'var2 = select * from details where id = "{^var1}";';
        const compiled = compiler.compile(q);
        expect(compiled.rhs.preRequisites.length).toBe(1);
        expect(compiled.rhs.preRequisites[0]).toBe('var1');
    });

    test('single level select with where in', () => {
        const q = 'var2 = select * from details where id in ("{^var1}");';
        const compiled = compiler.compile(q);
        expect(compiled.rhs.preRequisites.length).toBe(1);
        expect(compiled.rhs.preRequisites[0]).toBe('var1');
    });

    test('Two level select with where in select with =', () => {
        const q = 'var3 = select * from abcd where id in (select * from pqr where id = "{^var4}");';
        const compiled = compiler.compile(q);
        expect(compiled.rhs.preRequisites.length).toBe(1);
        expect(compiled.rhs.preRequisites[0]).toBe('var4');
    });

    test('Two level select with where in select with in', () => {
        const q = 'var3 = select * from abcd where id in (select * from pqr where id in ("{^var4}"));';
        const compiled = compiler.compile(q);
        expect(compiled.rhs.preRequisites.length).toBe(1);
        expect(compiled.rhs.preRequisites[0]).toBe('var4');
    });

    test('Multi-line Two level select with where = & in', () => {
        const q = 'var3 = select * from abcd where id in (select * from pqr where id in ("{^var4}"));\
        var5 = select * from abcd where id in (select * from pqr where id = "{^var6}");\
        return {"var3":"{var3}","var5":"{var5}"};';
        const compiled = compiler.compile(q);
        expect(compiled.rhs.dependsOn[0].preRequisites.length).toBe(1);
        expect(compiled.rhs.dependsOn[0].preRequisites[0]).toBe('var4');
        expect(compiled.rhs.dependsOn[1].preRequisites.length).toBe(1);
        expect(compiled.rhs.dependsOn[1].preRequisites[0]).toBe('var6');
    });

    test('Three level select with in and =', () => {
        const q = 'var3 = select * from abcd where id in ' +
            '(select * from pqr where id in ( select * from xyz where id in ("{^var4}") and pid = "{^var6}") ' +
            'and pid = "{^var5}");';
        const compiled = compiler.compile(q);
        expect(compiled.rhs.type).toBe('select');
        expect(compiled.rhs.preRequisites.length).toBe(3);
        expect(compiled.rhs.preRequisites[0]).toBe('var4');
        expect(compiled.rhs.preRequisites[1]).toBe('var6');
        expect(compiled.rhs.preRequisites[2]).toBe('var5');
    });

    test('Join in return', () => {
        const q = 'prodid = select ProductID[0].Value from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\
             details = select * from ebay.shopping.productdetails where ProductID in ("{prodid}") and siteid=0 and ProductType = "Reference";\
             stats = select * from ebay.shopping.productstats where productID in ("{prodid}");\
             return select d.ProductID[0].Value as id, d.Title as title, d.DetailsURL as details, d.ReviewCount as reviewCount, d.StockPhotoURL as photo,\
        	        s.inventoryCountResponse as count\
                    from details as d, stats as s where s.productId = d.ProductID[0].Value and s.producId = "{^abcd}";';
        const compiled = compiler.compile(q);
        expect(compiled.rhs.type).toBe('select');
        expect(compiled.rhs.preRequisites.length).toBe(1);
        expect(compiled.rhs.preRequisites[0]).toBe('abcd');
    });

    test('delete with in', () => {
        const q = "delete from ebay.item where itemId in ('{^abcd}') timeout 10 minDelay 100 maxDelay 10000";
        const compiled = compiler.compile(q);
        expect(compiled.rhs.preRequisites.length).toBe(1);
        expect(compiled.rhs.preRequisites[0]).toBe('abcd');
    });

    test('delete with =', () => {
        const q = "delete from ebay.item where itemId = '{^abcd}' timeout 10 minDelay 100 maxDelay 10000";
        const compiled = compiler.compile(q);
        expect(compiled.rhs.preRequisites.length).toBe(1);
        expect(compiled.rhs.preRequisites[0]).toBe('abcd');
    });
});