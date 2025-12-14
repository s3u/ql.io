/**
 * Cache Manager for Query Compiler
 * 
 * Provides intelligent caching with size limits, LRU eviction,
 * and performance metrics tracking.
 */

'use strict';

class CacheManager {
    constructor(options = {}) {
        this.maxSize = options.maxSize !== undefined ? options.maxSize : 1000;
        this.cache = new Map();
        this.accessOrder = new Map(); // For LRU tracking
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            memoryUsage: 0
        };
        this.accessCounter = 0;
    }

    /**
     * Get compiled query from cache
     */
    get(key) {
        if (this.cache.has(key)) {
            // Update access order for LRU
            this.accessOrder.set(key, ++this.accessCounter);
            this.metrics.hits++;
            return this.cache.get(key);
        }
        
        this.metrics.misses++;
        return null;
    }

    /**
     * Store compiled query in cache
     */
    set(key, value) {
        // If max size is 0, don't cache anything
        if (this.maxSize === 0) {
            return;
        }

        // If at capacity, evict least recently used
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this._evictLRU();
        }

        this.cache.set(key, value);
        this.accessOrder.set(key, ++this.accessCounter);
        
        // Update memory usage estimate
        this._updateMemoryUsage();
    }

    /**
     * Check if key exists in cache
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.accessOrder.clear();
        this.accessCounter = 0;
        // Reset all metrics when clearing cache
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            memoryUsage: 0
        };
    }

    /**
     * Get cache statistics
     */
    getMetrics() {
        const totalRequests = this.metrics.hits + this.metrics.misses;
        return {
            ...this.metrics,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRatio: totalRequests > 0 ? this.metrics.hits / totalRequests : 0,
            fillRatio: this.cache.size / this.maxSize
        };
    }

    /**
     * Reset metrics (useful for testing)
     */
    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            memoryUsage: 0
        };
    }

    /**
     * Configure cache settings
     */
    configure(options) {
        if (options.maxSize !== undefined) {
            this.maxSize = options.maxSize;
            // If new size is smaller, evict excess entries
            while (this.cache.size > this.maxSize) {
                this._evictLRU();
            }
        }
    }

    /**
     * Evict least recently used entry
     * @private
     */
    _evictLRU() {
        if (this.cache.size === 0) return;

        // Find the entry with the smallest access counter
        let lruKey = null;
        let lruAccess = Infinity;

        for (const [key, accessTime] of this.accessOrder) {
            if (accessTime < lruAccess) {
                lruAccess = accessTime;
                lruKey = key;
            }
        }

        if (lruKey !== null) {
            this.cache.delete(lruKey);
            this.accessOrder.delete(lruKey);
            this.metrics.evictions++;
        }
    }

    /**
     * Update memory usage estimate
     * @private
     */
    _updateMemoryUsage() {
        // Rough estimate: each cache entry is ~1KB on average
        this.metrics.memoryUsage = this.cache.size * 1024;
    }
}

module.exports = CacheManager;