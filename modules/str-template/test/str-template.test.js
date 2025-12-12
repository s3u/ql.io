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

const strTemplate = require('../lib/str-parser');

describe('String Template Parser', () => {
    test('notoken - parses string without tokens', () => {
        const u = "Hello World";
        const p = strTemplate.parse(u);
        const e = ['Hello World'];
        expect(p.stream).toEqual(e);
    });

    test('basic - parses string with single token', () => {
        const u = "Hello {token} World";
        const p = strTemplate.parse(u);
        const e = [
            'Hello ',
            {
                variable: 'token',
                str: 'token'
            },
            ' World'];
        expect(p.stream).toEqual(e);
    });

    test('replace - formats string with token replacement', () => {
        const u = "Hello {token} World";
        const p = strTemplate.parse(u);
        const s = p.format({
            token: '1234'
        });
        expect(s).toBe('Hello 1234 World');
    });

    test('replace-keep - keeps unreplaced tokens when flag is true', () => {
        const u = "Hello {token} World";
        const p = strTemplate.parse(u);
        const s = p.format({
            some: '1234'
        }, true);
        expect(s).toBe(u);
    });

    test('replace-mixed - handles multiple tokens with partial replacement', () => {
        const u = "Hello {token} World {p1} another token";
        const p = strTemplate.parse(u);
        const e = [
            'Hello ',
            {
                variable: 'token',
                str: 'token'
            },
            ' World ',
            {
                variable : 'p1',
                str : 'p1'
            },
            ' another token'];
        expect(p.stream).toEqual(e);
        
        const s = p.format({
            token: '1234'
        }, true);
        expect(s).toBe('Hello 1234 World {p1} another token');
    });

    test('nested-tokens - resolves nested token references', () => {
        const u = '{config.{ua}.apikey}';
        const p = strTemplate.parse(u);
        const s = p.format({
            "p1": "v1",
            "ua": "safari",
            "config": {
                "safari": {
                    "apikey": "1234"
                }
            }
        }, true);
        expect(s).toBe('1234');
    });

    test('nested-tokens-keep - keeps nested tokens when data is missing', () => {
        const u = '{config.{ua}.apikey}';
        const p = strTemplate.parse(u);
        const s = p.format({
            "p1": "v1",
            "config": {
                "safari": {
                    "apikey": "1234"
                }
            }
        }, true);
        expect(s).toBe('{config.{ua}.apikey}');
    });

    test('nested-tokens-deep - handles deeply nested tokens', () => {
        const u = '{aa{b{cc}b}dd}';
        const p = strTemplate.parse(u);
        const s = p.format({
            cc: 'cc'
        });
        expect(s).toBe('');
    });

    test('nested-tokens-deep-keep - keeps deeply nested tokens with flag', () => {
        const u = '{aa{b{cc}b}dd}';
        const p = strTemplate.parse(u);
        const s = p.format({
            cc: 'cc'
        }, true);
        expect(s).toBe('{aa{b{cc}b}dd}');
    });
});
