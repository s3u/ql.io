/*
 * Coverage Improvement Test Suite
 * Target: Improve compiler coverage from 65.87% to 80%+
 * Focus on working QL.io syntax and uncovered code paths
 */

'use strict';

const compiler = require('../lib/compiler.js');

describe('Coverage Improvement Tests', () => {
    let originalConsoleLog;
    
    beforeEach(() => {
        // Suppress console.log during tests
        originalConsoleLog = console.log;
        console.log = jest.fn();
    });

    afterEach(() => {
        // Restore console.log
        console.log = originalConsoleLog;
    });

    describe('Basic Error Handling', () => {
        test('should handle undefined script', () => {
            expect(() => {
                compiler.compile(undefined, {});
            }).toThrow('script is undefined');
        });

        test('should handle null script', () => {
            expect(() => {
                compiler.compile(null, {});
            }).toThrow('script is undefined');
        });

        test('should handle empty script', () => {
            expect(() => {
                compiler.compile('', {});
            }).toThrow();
        });

        test('should handle malformed syntax', () => {
            expect(() => {
                compiler.compile('invalid syntax here', {});
            }).toThrow();
        });
    });

    describe('Dependency Analysis', () => {
        test('should handle string template dependencies', () => {
            const script = `
                userId = "123";
                profile = select * from users where id = "{userId}";
                return profile;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
            expect(result.rhs.dependsOn).toBeDefined();
            expect(result.rhs.dependsOn.length).toBeGreaterThan(0);
        });

        test('should handle object introspection', () => {
            const script = `
                config = {"url": "{baseUrl}/api", "key": "{apiKey}"};
                baseUrl = "https://example.com";
                apiKey = "secret";
                return config;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle array introspection', () => {
            const script = `
                items = ["{first}", "{second}"];
                first = "item1";
                second = "item2";
                return items;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle nested object introspection', () => {
            const script = `
                data = {
                    "user": {"id": "{userId}", "name": "{userName}"},
                    "settings": ["{setting1}", "{setting2}"]
                };
                userId = "123";
                userName = "John";
                setting1 = "value1";
                setting2 = "value2";
                return data;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });

    describe('UDF Handling', () => {
        test('should handle UDF with arguments', () => {
            const script = `
                input = "test";
                result = myUdf("{input}", "param2");
                return result;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle UDF without arguments', () => {
            const script = `
                result = getCurrentTime();
                return result;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle require UDF specially', () => {
            const script = `
                module = require("lodash");
                return module;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle UDF with variable dependencies', () => {
            const script = `
                param1 = "value1";
                param2 = "value2";
                result = processData("{param1}", "{param2}");
                return result;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });

    describe('Logic Operations', () => {
        test('should handle variable assignments', () => {
            const script = `
                a = true;
                b = false;
                return a;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle string variables', () => {
            const script = `
                condition = "test";
                return condition;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });

    describe('Comments Handling', () => {
        test('should handle block comments', () => {
            const script = `
                /*
                 * Multi-line comment
                 * with multiple lines
                 */
                data = "test";
                return data;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle simple assignments with comments', () => {
            const script = `
                /* Comment */
                data = "test";
                return data;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });

    describe('Create Table Operations', () => {
        test('should handle basic create table', () => {
            const script = `
                create table users on select get from "/users";
                data = select * from users;
                return data;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle create table with defaults', () => {
            const script = `
                create table api 
                  on select get from "/api/data"
                  using defaults format = "json";
                data = select * from api;
                return data;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle multiple create tables', () => {
            const script = `
                create table users on select get from "/users";
                create table posts on select get from "/posts";
                userData = select * from users;
                return userData;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });

    describe('Assignment Operations', () => {
        test('should handle multiple assignments', () => {
            const script = `
                primary = select * from primary_source;
                backup = select * from backup_source;
                return primary;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle chained assignments', () => {
            const script = `
                first = select * from source1;
                second = select * from source2;
                third = select * from source3;
                return third;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });

    describe('Orphan Statement Handling', () => {
        test('should handle orphan statements', () => {
            const script = `
                standalone = "independent";
                dependent = select * from table where id = "{standalone}";
                return dependent;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle statements with no explicit dependencies', () => {
            const script = `
                config = {"key": "value"};
                result = insert into table values ("data");
                return result;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty objects', () => {
            const script = `
                empty = {};
                return empty;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle empty arrays', () => {
            const script = `
                empty = [];
                return empty;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle malformed templates gracefully', () => {
            const script = `
                data = "invalid {template without closing";
                result = select * from table where value = "{data}";
                return result;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle simple return statements', () => {
            const script = `
                return "simple";
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
            expect(result.type).toBe('return');
        });
    });

    describe('Performance Tests', () => {
        test('should handle large scripts efficiently', () => {
            let script = '';
            for (let i = 0; i < 30; i++) {
                script += `var${i} = "value${i}";\n`;
            }
            script += 'return var0;';
            
            const startTime = Date.now();
            const result = compiler.compile(script, {});
            const endTime = Date.now();
            
            expect(result).toBeDefined();
            expect(endTime - startTime).toBeLessThan(500);
        });

        test('should handle deep dependency chains', () => {
            let script = 'base = "start";\n';
            for (let i = 1; i <= 8; i++) {
                const prev = i === 1 ? 'base' : `level${i-1}`;
                script += `level${i} = select * from table${i} where prev = "{${prev}}";\n`;
            }
            script += 'return level8;';
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });

    describe('Advanced Features', () => {
        test('should handle listener relationships', () => {
            const script = `
                source = select * from data_source;
                processed = transform(source);
                validated = validate(processed);
                return validated;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle object freezing', () => {
            const script = 'return "test";';
            const result = compiler.compile(script, {});
            
            expect(result).toBeDefined();
            if (Object.isFrozen) {
                expect(Object.isFrozen(result)).toBe(true);
            }
        });

        test('should handle table expectations from loaded tables', () => {
            const tables = {
                'test_table': {
                    verbs: {
                        select: {
                            expects: 'application/json'
                        }
                    }
                }
            };
            
            const script = 'result = select * from test_table; return result;';
            const result = compiler.compile(script, tables);
            
            expect(result).toBeDefined();
        });

        test('should handle complex dependency resolution', () => {
            const script = `
                a = "value_a";
                b = select * from table1 where id = "{a}";
                c = select * from table2 where ref = "{b}";
                d = transform(c);
                e = validate(d);
                return e;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
            expect(result.rhs.dependsOn).toBeDefined();
        });
    });

    describe('Introspection Edge Cases', () => {
        test('should handle dot notation in variable references', () => {
            const script = `
                user = {"profile": {"name": "John"}};
                result = select * from table where name = "{user.profile.name}";
                return result;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle mixed data types in objects', () => {
            const script = `
                mixed = {
                    "string": "{stringVar}",
                    "number": 123,
                    "boolean": true,
                    "null": null,
                    "array": ["{arrayItem1}", "{arrayItem2}"],
                    "object": {"nested": "{nestedVar}"}
                };
                stringVar = "test";
                arrayItem1 = "item1";
                arrayItem2 = "item2";
                nestedVar = "nested";
                return mixed;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });

        test('should handle string parsing errors gracefully', () => {
            const script = `
                malformed = "unclosed template {var";
                result = select * from table where data = "{malformed}";
                return result;
            `;
            
            const result = compiler.compile(script, {});
            expect(result).toBeDefined();
        });
    });
});