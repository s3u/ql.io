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

'use strict';

const uriTemplate = require('../lib/uri-template');
const _ = require('underscore');

describe('URI Template', () => {
    test('notoken', () => {
        const u = "http://www.subbu.org";
        const p = uriTemplate.parse(u);
        const e = ['http://www.subbu.org'];
        expect(p.stream).toEqual(e);
    });

    test('basic', () => {
        const u = "http://www.subbu.org?p1={p1}&p2={p2}";
        const p = uriTemplate.parse(u);
        const e = [
            'http://www.subbu.org?p1=',
            {
                variable: 'p1'
            },
            '&p2=',
            {
                variable: 'p2'
            }];
        expect(p.stream).toEqual(e);
    });

    test('required', () => {
        const u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        const p = uriTemplate.parse(u);
        const e = [
            'http://www.subbu.org?p1=',
            {
                variable: 'p1'
            },
            '&p2=',
            {
                variable: 'p2',
                required: true
            },
            '&p3=',
            {
                variable: 'p3'
            }];
        expect(p.stream).toEqual(e);
    });

    test('format', () => {
        const u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        const p = uriTemplate.parse(u);
        const s = p.format({
            p1: 'v1',
            p2: 'v2',
            p3: 'v3'
        });
        expect(s).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3');
    });

    test('format-defaults', () => {
        const u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        const p = uriTemplate.parse(u);
        const s = p.format({}, {
            p1: 'd1',
            p2: 'd2',
            p3: 'd3'
        });
        expect(s).toBe('http://www.subbu.org?p1=d1&p2=d2&p3=d3');
    });

    test('format-override', () => {
        const u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        const p = uriTemplate.parse(u);
        const s = p.format({
            p1: 'v1',
            p3: 'v3'
        }, {
            p1: 'd1',
            p2: 'd2',
            p3: 'd3'
        });
        expect(s).toBe('http://www.subbu.org?p1=v1&p2=d2&p3=v3');
    });

    test('format-missing', () => {
        const u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        const p = uriTemplate.parse(u);
        expect(() => {
            p.format({
                p1: 'v1',
                p3: 'v3'
            }, {
                p1: 'd1',
                p3: 'd3'
            });
        }).toThrow();
    });

    test('multivalued-split', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={p2}';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            p1: 'v1',
            p2: ['v2-1', 'v2-2']
        });
        expect(Array.isArray(uri)).toBe(true);
        expect(uri.length).toBe(2);
        expect(uri[0]).toBe('http://www.subbu.org?p1=v1&p2=v2-1');
        expect(uri[1]).toBe('http://www.subbu.org?p1=v1&p2=v2-2');
    });

    test('multivalued-encode', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={|p2}';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            p1: 'v1',
            p2: ['v2-1', 'v2-2']
        });
        expect(uri).toBe('http://www.subbu.org?p1=v1&p2=v2-1%2Cv2-2');
    });

    test('multivalued-multi-multi', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={p3}';
        const template = uriTemplate.parse(str);
        expect(() => {
            template.format({
                p1: 'v1',
                p2: ['v2-1', 'v2-2'],
                p3: ['v3-1', 'v3-2']
            });
        }).toThrow();
    });

    test('multivalued-required', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={^|p2}&p3={^|p3}';
        const p = uriTemplate.parse(str);
        const e = [
            'http://www.subbu.org?p1=',
            {
                variable: 'p1'
            },
            '&p2=',
            {
                variable: 'p2',
                multivalued: true,
                required: true
            },
            '&p3=',
            {
                variable: 'p3',
                multivalued: true,
                required: true
            }
        ];
        expect(p.stream).toEqual(e);
    });

    test('multivalued-required-max', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={^|p2}&p3={^|p3}&p4={^20|p4}';
        const p = uriTemplate.parse(str);
        const e = [
            'http://www.subbu.org?p1=',
            {
                variable: 'p1'
            },
            '&p2=',
            {
                variable: 'p2',
                multivalued: true,
                required: true
            },
            '&p3=',
            {
                variable: 'p3',
                multivalued: true,
                required: true
            },
            '&p4=',
            {
                variable: 'p4',
                multivalued: true,
                max: 20,
                required: true
            }
        ];
        expect(p.stream).toEqual(e);
    });

    test('multivalued-split-max', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={2|p3}';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            p1: 'v1',
            p2: 'v2',
            p3: ['v3-1', 'v3-2', 'v3-3']
        });
        expect(Array.isArray(uri)).toBe(true);
        expect(uri.length).toBe(2);
        expect(uri[0]).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3-1%2Cv3-2');
        expect(uri[1]).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3-3');
    });

    test('multivalued-split-remove-dups', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={2|p3}';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            p1: 'v1',
            p2: 'v2',
            p3: ['v3-1', 'v3-2', 'v3-3', 'v3-1', 'v3-3', 'v3-2']
        });
        expect(Array.isArray(uri)).toBe(true);
        expect(uri.length).toBe(2);
        expect(uri[0]).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3-1%2Cv3-2');
        expect(uri[1]).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3-3');
    });

    test('multivalued-split-max-more', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={2|p3}';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            p1: 'v1',
            p2: 'v2',
            p3: ['v3-1', 'v3-2', 'v3-3', 'v3-4', 'v3-5']
        });
        expect(Array.isArray(uri)).toBe(true);
        expect(uri.length).toBe(3);
        expect(uri[0]).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3-1%2Cv3-2');
        expect(uri[1]).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3-3%2Cv3-4');
        expect(uri[2]).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3-5');
    });

    test('multivalued-split-max-less', () => {
        const str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={5|p3}';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            p1: 'v1',
            p2: 'v2',
            p3: ['v3-1', 'v3-2', 'v3-3']
        });
        expect(uri).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3-1%2Cv3-2%2Cv3-3');
    });

    test('multivalued-optional', () => {
        const str = 'https://www.example.org/path1/path2?p1={0|v1}&p2={0|v2}&p3={0|v3}';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            v1: [],
            v2: [],
            v3: '1,2,3,4'
        });
        expect(uri).toBe('https://www.example.org/path1/path2?p1=&p2=&p3=1%2C2%2C3%2C4');
    });

    test('encode', () => {
        const str = 'http://www.foo.com?p1={p1}&p2={p2}&p3={5|p3}';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            p1: 'this is a value',
            p2: 'this+is+a+value',
            p3: 'this/is/another/value'
        });
        expect(uri).toBe('http://www.foo.com?p1=this%20is%20a%20value&p2=this%2Bis%2Ba%2Bvalue&p3=this%2Fis%2Fanother%2Fvalue');
    });

    test('encode-skip', () => {
        const str = 'http://www.foo.com/{`p1}/baz';
        const template = uriTemplate.parse(str);
        const uri = template.format({
            p1: 'a/b/c'
        });
        expect(uri).toBe('http://www.foo.com/a/b/c/baz');
    });

    test('merge', () => {
        let str = 'http://www.foo.com?p1={p1}&p2={p2}&p3={#p3}';
        let template = uriTemplate.parse(str);
        expect(template.merge()).toBe('block');
        str = 'http://www.foo.com?p1={p1}&p2={p2}&p3={p3}';
        template = uriTemplate.parse(str);
        expect(template.merge()).toBe('field');
    });

    test('format-nested', () => {
        const u = 'http://www.subbu.org?p1={a.p1}&p2={^a.p2}&p3={a.p3}';
        const p = uriTemplate.parse(u);
        const s = p.format({
            a : {
                p1: 'v1',
                p2: 'v2',
                p3: 'v3'
            }
        });
        expect(s).toBe('http://www.subbu.org?p1=v1&p2=v2&p3=v3');
    });

    test('format-no-values', () => {
        const u = 'http://www.subbu.org?p1={a.p1}&p2={a.p2}&p3={a.p3}';
        const p = uriTemplate.parse(u);
        const s = p.format({});
        expect(s).toBe('http://www.subbu.org?p1=&p2=&p3=');
    });

    test('nested-tokens', () => {
        const u = 'http://www.foo.com?p1={p1}&p2={config.{ua}.apikey}';
        const p = uriTemplate.parse(u);

        const s = p.format({
            p1: 'v1',
            ua: 'safari',
            config: {
                safari: {
                    apikey: '1234'
                }
            }
        }, true);

        expect(s).toBe('http://www.foo.com?p1=v1&p2=1234');
    });

    test('required multiples', () => {
        const u = 'http://www.foo.com?p1={^p1}';
        const p = uriTemplate.parse(u);

        expect(() => {
            p.format({
                p1: []
            }, true);
        }).toThrow();
    });
});
