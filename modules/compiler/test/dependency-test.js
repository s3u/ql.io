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

var compiler = require('../lib/compiler'),
    _ = require('underscore');

module.exports = {
    'define-dependency' : function(test) {
        var script, plan;
        script = 'a = "a";\
                  b = "{a}";\
                  c = "{b}";\
                  return c;'
        plan = compiler.compile(script);
        test.equals(plan.rhs.dependsOn.length, 1);
        test.equals(plan.rhs.dependsOn[0].object, '{b}');
        test.equals(plan.rhs.dependsOn[0].dependsOn.length, 1);
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].object, '{a}');
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].dependsOn.length, 1);
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].dependsOn[0].object, 'a');
        test.done();
    },

    'orphans-negative': function(test) {
        var q = 'show routes';
        var plan = compiler.compile(q);
        test.equals(plan.rhs.type, 'show routes');
        test.equals(plan.dependsOn.length, 0);
        test.done();
    }
};
