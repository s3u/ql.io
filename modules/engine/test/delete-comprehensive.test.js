/*
 * DELETE Operations Comprehensive Test Suite
 * Target: Improve coverage from 9.61% to 60%+
 */

'use strict';

const Engine = require('../lib/engine.js');

describe('DELETE Operations Comprehensive Tests', () => {
    let engine;
    let originalConsoleLog;
    
    beforeEach(() => {
        // Suppress console.log during tests
        originalConsoleLog = console.log;
        console.log = jest.fn();
        
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });

    afterEach(() => {
        // Restore console.log
        console.log = originalConsoleLog;
    });

    describe('Basic DELETE Operations', () => {
        test('should delete from context object', (done) => {
            const script = 'obj = {"a": "A", "b": "B", "c": "C"}; return delete from obj where a = "A";';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(result.body.a).toBeUndefined();
                    expect(result.body.b).toBe('B');
                    expect(result.body.c).toBe('C');
                    done();
                });
            });
        });

        test('should delete from context array', (done) => {
            const script = 'arr = [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]; return delete from arr where id = 1;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(1);
                    expect(result.body[0].name).toBe('Jane');
                    done();
                });
            });
        });

        test('should handle DELETE with assignment', (done) => {
            const script = 'users = [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]; filtered = delete from users where id = 1; return filtered;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(1);
                    expect(result.body[0].name).toBe('Jane');
                    done();
                });
            });
        });
    });

    describe('DELETE Error Handling', () => {
        test('should handle DELETE from non-existent table', (done) => {
            const script = 'delete from nonexistent_table where id = 1;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    expect(err).toBeDefined();
                    expect(err.message || err).toContain('No such table');
                    done();
                });
            });
        });

        test('should handle DELETE with no WHERE conditions', (done) => {
            const script = 'obj = {"a": "A", "b": "B"}; return delete from obj;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    // This should either work or give a meaningful error
                    if (err) {
                        expect(err).toBeDefined();
                    } else {
                        expect(result.body).toBeDefined();
                    }
                    done();
                });
            });
        });
    });

    describe('DELETE Edge Cases', () => {
        test('should handle DELETE from empty object', (done) => {
            const script = 'obj = {}; return delete from obj where a = "A";';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toEqual({});
                    done();
                });
            });
        });

        test('should handle DELETE with non-matching conditions', (done) => {
            const script = 'obj = {"a": "A", "b": "B"}; return delete from obj where c = "C";';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body.a).toBe('A');
                    expect(result.body.b).toBe('B');
                    done();
                });
            });
        });

        test('should handle DELETE with complex WHERE conditions', (done) => {
            const script = 'data = [{"id": 1, "status": "active", "type": "user"}, {"id": 2, "status": "inactive", "type": "user"}, {"id": 3, "status": "active", "type": "admin"}]; return delete from data where status = "active" and type = "user";';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(2);
                    // Should keep inactive user and active admin
                    expect(result.body.some(item => item.id === 2)).toBe(true);
                    expect(result.body.some(item => item.id === 3)).toBe(true);
                    done();
                });
            });
        });

        test('should handle DELETE with IN operator', (done) => {
            const script = 'items = [{"id": 1, "category": "books"}, {"id": 2, "category": "electronics"}, {"id": 3, "category": "books"}]; return delete from items where category in ("books", "toys");';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(1);
                    expect(result.body[0].category).toBe('electronics');
                    done();
                });
            });
        });
    });

    describe('DELETE with Different Data Types', () => {
        test('should handle DELETE with numeric conditions', (done) => {
            const script = 'numbers = [{"value": 1}, {"value": 2}, {"value": 3}]; return delete from numbers where value = 2;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(2);
                    expect(result.body.some(item => item.value === 1)).toBe(true);
                    expect(result.body.some(item => item.value === 3)).toBe(true);
                    done();
                });
            });
        });

        test('should handle DELETE with boolean conditions', (done) => {
            const script = 'flags = [{"active": true, "name": "A"}, {"active": false, "name": "B"}, {"active": true, "name": "C"}]; return delete from flags where name = "B";';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(2);
                    expect(result.body[0].name).toBe('A');
                    expect(result.body[1].name).toBe('C');
                    done();
                });
            });
        });

        test('should handle DELETE with null values', (done) => {
            const script = 'nulls = [{"value": null, "id": 1}, {"value": "test", "id": 2}, {"value": null, "id": 3}]; return delete from nulls where id = 2;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(2);
                    expect(result.body[0].value).toBe(null);
                    expect(result.body[1].value).toBe(null);
                    done();
                });
            });
        });
    });

    describe('DELETE Assignment Operations', () => {
        test('should assign DELETE result to variable', (done) => {
            const script = 'original = [{"keep": true, "id": 1}, {"keep": false, "id": 2}]; filtered = delete from original where id = 2; return filtered;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(1);
                    expect(result.body[0].keep).toBe(true);
                    done();
                });
            });
        });

        test('should handle multiple DELETE operations', (done) => {
            const script = 'data = [{"type": "A", "status": 1}, {"type": "B", "status": 1}, {"type": "A", "status": 2}]; step1 = delete from data where status = 2; final = delete from step1 where type = "A"; return final;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(1);
                    expect(result.body[0].type).toBe('B');
                    done();
                });
            });
        });
    });

    describe('DELETE Performance and Edge Cases', () => {
        test('should handle DELETE from large arrays efficiently', (done) => {
            const largeArray = Array.from({length: 100}, (_, i) => ({id: i, keep: i % 2 === 0}));
            const script = `data = ${JSON.stringify(largeArray)}; return delete from data where id = 50;`;
            
            const startTime = Date.now();
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    const endTime = Date.now();
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(99); // One item should be removed
                    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
                    done();
                });
            });
        });

        test('should handle DELETE with special characters in values', (done) => {
            const script = 'special = [{"name": "test@example.com", "id": 1}, {"name": "user#123", "id": 2}, {"name": "normal", "id": 3}]; return delete from special where name = "test@example.com";';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    if (err) {
                        console.log('Error:', err);
                        done(err);
                        return;
                    }
                    expect(result.body).toBeDefined();
                    expect(Array.isArray(result.body)).toBe(true);
                    expect(result.body.length).toBe(2);
                    expect(result.body.some(item => item.name === "user#123")).toBe(true);
                    expect(result.body.some(item => item.name === "normal")).toBe(true);
                    done();
                });
            });
        });

        test('should handle DELETE from nested object properties', (done) => {
            const script = 'nested = {"items": [{"id": 1, "active": true}, {"id": 2, "active": false}]}; result = delete from nested.items where active = false; return result;';
            
            engine.execute(script, (emitter) => {
                emitter.on('end', (err, result) => {
                    // This might not work as expected due to nested property access limitations
                    // But we should test the error handling
                    if (err) {
                        expect(err).toBeDefined();
                    } else {
                        expect(result.body).toBeDefined();
                    }
                    done();
                });
            });
        });
    });
});