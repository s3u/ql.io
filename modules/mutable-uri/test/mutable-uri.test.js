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

const MutableURI = require('../lib/ql.uri');
const _ = require('underscore');

describe('Mutable URI', () => {
    test('remove', () => {
        const u = 'http://www.subbu.org?p1=v1&p2=v2&p3=v3';
        const parsed = new MutableURI(u);
        parsed.removeParam('p3');
        expect(parsed.format()).toBe('http://www.subbu.org/?p1=v1&p2=v2');
    });

    test('remove-empty', () => {
        const u = 'http://www.subbu.org?p1=v1&p2&p3=v3&p4';
        const parsed = new MutableURI(u);
        parsed.removeEmptyParams();
        expect(parsed.format()).toBe('http://www.subbu.org/?p1=v1&p3=v3');
    });

    test('set-param', () => {
        const u = 'http://www.subbu.org?p1=v1&p2&p3=v3&p4';
        const parsed = new MutableURI(u);
        parsed.setParam('p4', 'v4');
        expect(parsed.format()).toBe('http://www.subbu.org/?p1=v1&p2=&p3=v3&p4=v4');
    });

    test('add-param', () => {
        const u = 'http://www.subbu.org?p1=v1&p2&p3=v3';
        const parsed = new MutableURI(u);
        parsed.addParam('p4', 'v41');
        expect(parsed.format()).toBe('http://www.subbu.org/?p1=v1&p2=&p3=v3&p4=v41');
    });
});
