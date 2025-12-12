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

const _ = require('underscore');
const jsonfill = require('../lib/engine/jsonfill');

describe('JSON Fill Tests', () => {
    test('fill1', () => {
        var context, obj, filled;
        context = {
            "name": "Subbu",
            "city": "Some City"
        };
        obj = {
            "name": "{name}",
            "address": {
                "street": "1 Main Street",
                "city": "{city}"
            }
        };
        obj = Object.seal(obj);
        filled = jsonfill.fill(obj, context);
        expect(filled).toEqual({
            name: 'Subbu',
            address: { street: '1 Main Street', city: 'Some City' }
        });
    });

    test('fill2', () => {
        var context, obj, filled;
        context = {
            "name": {
                "first": "John",
                "last": "Doe"
            },
            "city": "Some City"
        };
        obj = {
            "name": "{name}",
            "address": {
                "street": "1 Main Street",
                "city": "{city}"
            }
        };
        obj = Object.seal(obj);
        filled = jsonfill.fill(obj, context);
        expect(filled).toEqual({
            name: { first: 'John', last: 'Doe' },
            address: { street: '1 Main Street', city: 'Some City' }
        });
    });
});