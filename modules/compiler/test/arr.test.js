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

describe('Array Tests', () => {
    test('simple', () => {
        const q = '-- Define an object\n\
            n = [["Gap","Addidas","Gravati2a"], ["Gap","Addidasf"], ["Gravati","Addis"]];\
            -- Return now\n\
            return n;';
        const compiled = compiler.compile(q);
        expect(compiled.type).toBe('return');
        expect(compiled.comments[0].text).toBe('Return now');
        expect(compiled.rhs.ref).toBe('n');
        expect(compiled.rhs.dependsOn[0].object).toEqual(
            [['Gap', 'Addidas', 'Gravati2a'], ['Gap', 'Addidasf'], ['Gravati', 'Addis']]);
        expect(compiled.rhs.dependsOn[0].type).toBe('define');
        expect(compiled.rhs.dependsOn[0].assign).toBe('n');
    });
});