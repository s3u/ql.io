/**
 * Cache Manager Tests
 * 
 * Tests for the intelligent caching system with LRU eviction
 * and performance metrics.
 */

const CacheManager = require('../lib/cache-manager.js');

describe('Cache Manager Tests', () => {
    let cache;

    beforeEach(() => {
        cache = new CacheManager({ maxSize: 3 });
    });

    describe('Basic Cache Operations', () => {
        test('should store and retrieve values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        test('should return null for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeNull();
        });

        test('should check key existence', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('nonexistent')).toBe(false);
        });

        test('should clear all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
            expect(cache.getMetrics().size).toBe(0);
        });
    });

    describe('LRU Eviction', () => {
        test('should evict least recently used when at capacity', () => {
            // Fill cache to capacity
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Access key1 to make it recently used
            cache.get('key1');

            // Add new entry, should evict key2 (least recently used)
            cache.set('key4', 'value4');

            expect(cache.get('key1')).toBe('value1'); // Still there
            expect(cache.get('key2')).toBeNull();     // Evicted
            expect(cache.get('key3')).toBe('value3'); // Still there
            expect(cache.get('key4')).toBe('value4'); // New entry
        });

        test('should update access order on get', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Access key1 to make it most recently used
            cache.get('key1');

            // Add new entry, should evict key2
            cache.set('key4', 'value4');

            expect(cache.get('key1')).toBe('value1'); // Most recently used
            expect(cache.get('key2')).toBeNull();     // Evicted
        });

        test('should not evict when updating existing key', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Update existing key - should not trigger eviction
            cache.set('key1', 'updated1');

            expect(cache.getMetrics().size).toBe(3);
            expect(cache.get('key1')).toBe('updated1');
            expect(cache.get('key2')).toBe('value2');
            expect(cache.get('key3')).toBe('value3');
        });
    });

    describe('Metrics Tracking', () => {
        test('should track cache hits and misses', () => {
            cache.set('key1', 'value1');
            
            // Hit
            cache.get('key1');
            // Miss
            cache.get('nonexistent');
            
            const metrics = cache.getMetrics();
            expect(metrics.hits).toBe(1);
            expect(metrics.misses).toBe(1);
            expect(metrics.hitRatio).toBe(0.5);
        });

        test('should track evictions', () => {
            // Fill beyond capacity to trigger evictions
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            cache.set('key4', 'value4'); // Should trigger eviction

            const metrics = cache.getMetrics();
            expect(metrics.evictions).toBe(1);
        });

        test('should track cache size and fill ratio', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const metrics = cache.getMetrics();
            expect(metrics.size).toBe(2);
            expect(metrics.maxSize).toBe(3);
            expect(metrics.fillRatio).toBeCloseTo(2/3);
        });

        test('should reset metrics', () => {
            cache.set('key1', 'value1');
            cache.get('key1');
            cache.get('nonexistent');

            cache.resetMetrics();

            const metrics = cache.getMetrics();
            expect(metrics.hits).toBe(0);
            expect(metrics.misses).toBe(0);
            expect(metrics.evictions).toBe(0);
        });

        test('should estimate memory usage', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const metrics = cache.getMetrics();
            expect(metrics.memoryUsage).toBe(2 * 1024); // 2KB estimate
        });
    });

    describe('Configuration', () => {
        test('should configure max size', () => {
            cache.configure({ maxSize: 5 });
            expect(cache.getMetrics().maxSize).toBe(5);
        });

        test('should evict excess entries when reducing max size', () => {
            // Fill cache
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Reduce max size
            cache.configure({ maxSize: 2 });

            expect(cache.getMetrics().size).toBe(2);
            expect(cache.getMetrics().maxSize).toBe(2);
        });

        test('should handle zero max size', () => {
            cache.configure({ maxSize: 0 });
            cache.set('key1', 'value1');
            expect(cache.getMetrics().size).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty cache eviction', () => {
            const emptyCache = new CacheManager({ maxSize: 0 });
            // Should not throw and should not store anything
            emptyCache.set('key1', 'value1');
            expect(emptyCache.getMetrics().size).toBe(0);
            expect(emptyCache.get('key1')).toBeNull();
        });

        test('should handle single entry cache', () => {
            const singleCache = new CacheManager({ maxSize: 1 });
            singleCache.set('key1', 'value1');
            singleCache.set('key2', 'value2'); // Should evict key1

            expect(singleCache.get('key1')).toBeNull();
            expect(singleCache.get('key2')).toBe('value2');
        });

        test('should handle undefined and null values', () => {
            cache.set('undefined', undefined);
            cache.set('null', null);

            expect(cache.get('undefined')).toBeUndefined();
            expect(cache.get('null')).toBeNull();
            expect(cache.has('undefined')).toBe(true);
            expect(cache.has('null')).toBe(true);
        });
    });

    describe('Performance Characteristics', () => {
        test('should maintain performance with large datasets', () => {
            const largeCache = new CacheManager({ maxSize: 1000 });
            
            const start = Date.now();
            
            // Add many entries
            for (let i = 0; i < 1000; i++) {
                largeCache.set(`key${i}`, `value${i}`);
            }
            
            // Access entries
            for (let i = 0; i < 100; i++) {
                largeCache.get(`key${i}`);
            }
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100); // Should complete in <100ms
        });

        test('should handle rapid evictions efficiently', () => {
            const start = Date.now();
            
            // Trigger many evictions
            for (let i = 0; i < 100; i++) {
                cache.set(`key${i}`, `value${i}`);
            }
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(50); // Should complete quickly
            expect(cache.getMetrics().evictions).toBeGreaterThan(90);
        });
    });
});