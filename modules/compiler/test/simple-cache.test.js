/**
 * Compiler Caching Integration Tests
 * 
 * Tests for the compiler's integration with the cache manager,
 * including performance improvements and cache behavior.
 */

const compiler = require('../lib/compiler.js');

describe('Compiler Caching Integration Tests', () => {
    beforeEach(() => {
        // Clear cache and reset metrics before each test
        compiler.clearCache();
    });

    describe('Basic Caching Functionality', () => {
        test('should cache compiled queries', () => {
            const query = 'select * from users';
            
            // First compilation
            const result1 = compiler.compile(query, {});
            const metrics1 = compiler.getCacheMetrics();
            
            // Second compilation (should hit cache)
            const result2 = compiler.compile(query, {});
            const metrics2 = compiler.getCacheMetrics();
            
            expect(result1).toEqual(result2);
            expect(metrics1.hits).toBe(0);
            expect(metrics1.misses).toBe(1);
            expect(metrics2.hits).toBe(1);
            expect(metrics2.misses).toBe(1);
        });

        test('should handle different queries separately', () => {
            const query1 = 'select * from users';
            const query2 = 'select id from users';
            
            const result1 = compiler.compile(query1, {});
            const result2 = compiler.compile(query2, {});
            
            expect(result1).not.toEqual(result2);
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.size).toBe(2);
            expect(metrics.misses).toBe(2);
        });

        test('should cache with different table definitions', () => {
            const query = 'select * from users';
            const tables1 = { users: { name: 'users' } };
            const tables2 = { users: { name: 'users', version: 2 } };
            
            // Same query, different tables should use same cache entry
            const result1 = compiler.compile(query, tables1);
            const result2 = compiler.compile(query, tables2);
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.hits).toBe(1);
            expect(metrics.misses).toBe(1);
        });
    });

    describe('Cache Management', () => {
        test('should clear cache', () => {
            compiler.compile('select * from users', {});
            compiler.compile('select * from orders', {});
            
            expect(compiler.getCacheMetrics().size).toBe(2);
            
            compiler.clearCache();
            
            expect(compiler.getCacheMetrics().size).toBe(0);
        });

        test('should configure cache settings', () => {
            compiler.configureCaching({ maxSize: 5 });
            
            expect(compiler.getCacheMetrics().maxSize).toBe(5);
        });

        test('should evict entries when cache is full', () => {
            // Configure small cache
            compiler.configureCaching({ maxSize: 2 });
            
            // Fill cache beyond capacity
            compiler.compile('select * from users', {});
            compiler.compile('select * from orders', {});
            compiler.compile('select * from products', {}); // Should trigger eviction
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.size).toBe(2);
            expect(metrics.evictions).toBe(1);
        });
    });

    describe('Cache Metrics', () => {
        test('should provide accurate hit ratio', () => {
            const query = 'select * from users';
            
            // 1 miss, 3 hits
            compiler.compile(query, {});
            compiler.compile(query, {});
            compiler.compile(query, {});
            compiler.compile(query, {});
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.hitRatio).toBeCloseTo(0.75); // 3/4 = 0.75
        });

        test('should track memory usage', () => {
            compiler.compile('select * from users', {});
            compiler.compile('select * from orders', {});
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.memoryUsage).toBeGreaterThan(0);
            expect(metrics.memoryUsage).toBe(2 * 1024); // 2KB estimate
        });

        test('should track fill ratio', () => {
            compiler.configureCaching({ maxSize: 10 });
            
            // Add 3 entries
            compiler.compile('select * from users', {});
            compiler.compile('select * from orders', {});
            compiler.compile('select * from products', {});
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.fillRatio).toBeCloseTo(0.3); // 3/10 = 0.3
        });
    });

    describe('Error Handling', () => {
        test('should not cache compilation errors', () => {
            const invalidQuery = 'invalid query syntax';
            
            // First attempt should throw
            expect(() => compiler.compile(invalidQuery, {})).toThrow();
            
            // Second attempt should also throw (not cached)
            expect(() => compiler.compile(invalidQuery, {})).toThrow();
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.size).toBe(0); // No entries cached
        });
    });

    describe('Complex Query Caching', () => {
        test('should cache complex queries with assignments', () => {
            const query = 'myusers = select * from users where status = "active"; return "{myusers}"';
            
            const result1 = compiler.compile(query, {});
            const result2 = compiler.compile(query, {});
            
            expect(result1).toEqual(result2);
            expect(compiler.getCacheMetrics().hits).toBe(1);
        });

        test('should cache queries with different whitespace', () => {
            const query1 = 'select * from users';
            const query2 = 'select * from users'; // Same query
            const query3 = 'select  *  from  users'; // Different whitespace
            
            compiler.compile(query1, {});
            compiler.compile(query2, {}); // Should hit cache
            compiler.compile(query3, {}); // Should miss cache (different string)
            
            const metrics = compiler.getCacheMetrics();
            expect(metrics.hits).toBe(1);
            expect(metrics.misses).toBe(2);
            expect(metrics.size).toBe(2);
        });
    });
});