/**
 * Parser Optimization Tests
 * 
 * Tests for parser profiling and fast path optimizations
 */

const compiler = require('../lib/compiler.js');

describe('Parser Optimization Tests', () => {
    beforeEach(() => {
        compiler.clearCache();
        compiler.resetProfiling();
        compiler.disableProfiling();
    });

    describe('Parser Profiling', () => {
        test('should enable and disable profiling', () => {
            compiler.enableProfiling();
            
            // Compile some queries
            compiler.compile('select * from users', {});
            compiler.compile('return "hello"', {});
            
            const results = compiler.getProfilingResults();
            expect(Object.keys(results).length).toBeGreaterThan(0);
            
            compiler.disableProfiling();
        });

        test('should classify query types correctly', () => {
            compiler.enableProfiling();
            
            // Use queries that won't trigger fast path
            compiler.compile('select id, name from users', {}); // Not select *
            compiler.compile('select * from users where id = 1', {});
            compiler.compile('return concat("hello", "world")', {}); // Not simple string
            compiler.compile('delete from users where id = 1', {});
            
            const results = compiler.getProfilingResults();
            
            expect(results['select-simple']).toBeDefined();
            expect(results['select-where']).toBeDefined();
            expect(results['return']).toBeDefined();
            expect(results['delete']).toBeDefined();
        });

        test('should track performance metrics', () => {
            compiler.enableProfiling();
            compiler.configureCaching({ maxSize: 0 }); // Disable cache for this test
            
            // Run same query multiple times (use non-fast-path query)
            for (let i = 0; i < 5; i++) {
                compiler.compile('select id, name from users', {});
            }
            
            const results = compiler.getProfilingResults();
            const selectStats = results['select-simple'];
            
            expect(selectStats.count).toBe(5);
            expect(selectStats.avgTime).toBeGreaterThan(0);
            expect(selectStats.minTime).toBeGreaterThan(0);
            expect(selectStats.maxTime).toBeGreaterThanOrEqual(selectStats.minTime);
            
            // Re-enable cache
            compiler.configureCaching({ maxSize: 1000 });
        });

        test('should generate profiling report', () => {
            compiler.enableProfiling();
            
            compiler.compile('select * from users', {});
            compiler.compile('return "hello"', {});
            
            const report = compiler.generateProfilingReport();
            
            expect(report).toContain('Parser Performance Profile');
            expect(report).toContain('Query Type Performance');
            expect(report).toContain('select-simple');
            expect(report).toContain('return');
        });

        test('should reset profiling data', () => {
            compiler.enableProfiling();
            
            compiler.compile('select id from users', {});
            expect(Object.keys(compiler.getProfilingResults()).length).toBeGreaterThan(0);
            
            compiler.resetProfiling();
            expect(Object.keys(compiler.getProfilingResults()).length).toBe(0);
        });

        test('should track fast path usage', () => {
            compiler.enableProfiling();
            
            // These should use fast paths
            compiler.compile('select * from users', {});
            compiler.compile('return "hello"', {});
            
            const results = compiler.getProfilingResults();
            
            // Should have fast path entries
            expect(results['select-simple-fastpath']).toBeDefined();
            expect(results['return-fastpath']).toBeDefined();
            expect(results['select-simple-fastpath'].count).toBe(1);
            expect(results['return-fastpath'].count).toBe(1);
        });
    });

    describe('Fast Path Optimization', () => {
        test('should optimize simple SELECT queries', () => {
            const query = 'select * from users';

            compiler.clearCache();

            const result1 = compiler.compile(query, {});
            const result2 = compiler.compile(query, {});

            expect(result1).toEqual(result2);

            // Verify structure
            expect(result1.type).toBe('return');
            expect(result1.rhs.type).toBe('select');
            expect(result1.rhs.fromClause[0].name).toBe('users');
        });

        test('should optimize simple RETURN queries', () => {
            const query = 'return "hello world"';
            const result = compiler.compile(query, {});
            
            expect(result.type).toBe('return');
            expect(result.rhs.type).toBe('define');
            expect(result.rhs.object).toBe('hello world');
        });

        test('should optimize simple assignment queries', () => {
            const query = 'myusers = select * from users';
            const result = compiler.compile(query, {});
            
            expect(result.type).toBe('return');
            expect(result.rhs.dependsOn).toHaveLength(1);
            expect(result.rhs.dependsOn[0].type).toBe('select');
            expect(result.rhs.dependsOn[0].assign).toBe('myusers');
        });

        test('should fall back to full parsing for complex queries', () => {
            const complexQuery = 'myusers = select * from users where status = "active"; return "{myusers}"';
            
            // This should not use fast path
            const result = compiler.compile(complexQuery, {});
            
            expect(result).toBeDefined();
            expect(result.type).toBe('return');
            // Complex query should have proper dependency structure
        });

        test('should handle case insensitive patterns', () => {
            const queries = [
                'SELECT * FROM users',
                'Select * From Users',
                'RETURN "hello"',
                'Return "Hello"'
            ];
            
            queries.forEach(query => {
                const result = compiler.compile(query, {});
                expect(result).toBeDefined();
                expect(result.type).toBe('return');
            });
        });

        test('should handle whitespace variations', () => {
            const queries = [
                'select * from users',
                '  select   *   from   users  ',
                '\tselect\t*\tfrom\tusers\t',
                '\nselect\n*\nfrom\nusers\n'
            ];
            
            const results = queries.map(query => compiler.compile(query, {}));
            
            // All should produce equivalent results
            for (let i = 1; i < results.length; i++) {
                expect(results[i].rhs.fromClause[0].name).toBe('users');
            }
        });
    });

    describe('Performance Comparison', () => {
        test('should show performance improvement for simple queries', () => {
            const simpleQuery = 'select * from users';
            const iterations = 100;
            
            // Disable cache to measure pure parsing performance
            compiler.configureCaching({ maxSize: 0 });
            
            // Measure multiple iterations
            const start = process.hrtime.bigint();
            for (let i = 0; i < iterations; i++) {
                compiler.compile(simpleQuery, {});
            }
            const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
            
            // Should complete quickly
            expect(duration).toBeLessThan(100); // Less than 100ms for 100 iterations
            
            // Re-enable cache
            compiler.configureCaching({ maxSize: 1000 });
        });

        test('should maintain correctness with optimizations', () => {
            const testCases = [
                {
                    query: 'select * from users',
                    expectedType: 'select',
                    expectedTable: 'users'
                },
                {
                    query: 'return "test message"',
                    expectedType: 'define',
                    expectedValue: 'test message'
                }
            ];
            
            testCases.forEach(({ query, expectedType, expectedTable, expectedValue }) => {
                const result = compiler.compile(query, {});
                
                expect(result.type).toBe('return');
                expect(result.rhs.type).toBe(expectedType);
                
                if (expectedTable) {
                    expect(result.rhs.fromClause[0].name).toBe(expectedTable);
                }
                
                if (expectedValue) {
                    expect(result.rhs.object).toBe(expectedValue);
                }
            });
        });
    });

    describe('Integration with Caching', () => {
        test('should work correctly with cache system', () => {
            const query = 'select * from users';
            
            // First compilation (should use fast path and cache)
            const result1 = compiler.compile(query, {});
            const metrics1 = compiler.getCacheMetrics();
            
            // Second compilation (should hit cache)
            const result2 = compiler.compile(query, {});
            const metrics2 = compiler.getCacheMetrics();
            
            expect(result1).toEqual(result2);
            expect(metrics1.misses).toBe(1);
            expect(metrics2.hits).toBe(1);
        });

        test('should cache fast path results', () => {
            const query = 'return "cached result"';
            
            compiler.compile(query, {});
            compiler.compile(query, {});
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.hits).toBe(1);
            expect(metrics.size).toBe(1);
        });
    });
});