/**
 * Object Pool for Query Compiler
 * 
 * Provides object pooling to reduce garbage collection pressure
 * and improve sustained performance.
 */

'use strict';

class ObjectPool {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 100;
        this.createFn = options.createFn || (() => ({}));
        this.resetFn = options.resetFn || ((obj) => {
            // Default reset: clear all properties
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    delete obj[key];
                }
            }
            return obj;
        });
        
        this.pool = [];
        this.metrics = {
            created: 0,
            reused: 0,
            returned: 0,
            currentSize: 0
        };
    }

    /**
     * Get an object from the pool
     */
    acquire() {
        let obj;
        
        if (this.pool.length > 0) {
            obj = this.pool.pop();
            this.metrics.reused++;
        } else {
            obj = this.createFn();
            this.metrics.created++;
        }
        
        this.metrics.currentSize = this.pool.length;
        return obj;
    }

    /**
     * Return an object to the pool
     */
    release(obj) {
        if (!obj || this.pool.length >= this.maxSize) {
            return; // Don't pool if at capacity
        }

        // Reset object state
        try {
            this.resetFn(obj);
            this.pool.push(obj);
            this.metrics.returned++;
            this.metrics.currentSize = this.pool.length;
        } catch (error) {
            // If reset fails, don't pool the object
            console.warn('Object pool reset failed:', error.message);
        }
    }

    /**
     * Get pool metrics
     */
    getMetrics() {
        const totalAcquired = this.metrics.created + this.metrics.reused;
        return {
            ...this.metrics,
            reuseRatio: totalAcquired > 0 ? this.metrics.reused / totalAcquired : 0,
            efficiency: this.metrics.returned > 0 ? this.metrics.reused / this.metrics.returned : 0
        };
    }

    /**
     * Clear the pool
     */
    clear() {
        this.pool.length = 0;
        this.metrics.currentSize = 0;
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            created: 0,
            reused: 0,
            returned: 0,
            currentSize: this.pool.length
        };
    }
}

/**
 * Specialized pools for common compiler objects
 */
class CompilerObjectPools {
    constructor() {
        // Pool for AST nodes
        this.nodePool = new ObjectPool({
            maxSize: 50,
            createFn: () => ({}),
            resetFn: (node) => {
                // Clear all properties but preserve object identity
                for (const key in node) {
                    if (node.hasOwnProperty(key)) {
                        delete node[key];
                    }
                }
                return node;
            }
        });

        // Pool for dependency arrays
        this.arrayPool = new ObjectPool({
            maxSize: 30,
            createFn: () => [],
            resetFn: (arr) => {
                arr.length = 0;
                return arr;
            }
        });

        // Pool for listener arrays
        this.listenerPool = new ObjectPool({
            maxSize: 20,
            createFn: () => [],
            resetFn: (arr) => {
                arr.length = 0;
                return arr;
            }
        });
    }

    /**
     * Get a fresh AST node
     */
    acquireNode() {
        return this.nodePool.acquire();
    }

    /**
     * Return an AST node to the pool
     */
    releaseNode(node) {
        this.nodePool.release(node);
    }

    /**
     * Get a fresh array for dependencies
     */
    acquireArray() {
        return this.arrayPool.acquire();
    }

    /**
     * Return an array to the pool
     */
    releaseArray(arr) {
        this.arrayPool.release(arr);
    }

    /**
     * Get a fresh array for listeners
     */
    acquireListenerArray() {
        return this.listenerPool.acquire();
    }

    /**
     * Return a listener array to the pool
     */
    releaseListenerArray(arr) {
        this.listenerPool.release(arr);
    }

    /**
     * Get combined metrics from all pools
     */
    getMetrics() {
        return {
            nodes: this.nodePool.getMetrics(),
            arrays: this.arrayPool.getMetrics(),
            listeners: this.listenerPool.getMetrics()
        };
    }

    /**
     * Clear all pools
     */
    clear() {
        this.nodePool.clear();
        this.arrayPool.clear();
        this.listenerPool.clear();
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.nodePool.resetMetrics();
        this.arrayPool.resetMetrics();
        this.listenerPool.resetMetrics();
    }
}

module.exports = { ObjectPool, CompilerObjectPools };