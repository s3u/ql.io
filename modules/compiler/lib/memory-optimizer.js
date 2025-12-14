/**
 * Memory Optimizer for Query Compiler
 * 
 * Optimizes memory usage through object structure optimization,
 * property minimization, and efficient data representation.
 */

'use strict';

const { CompilerObjectPools } = require('./object-pool.js');

class MemoryOptimizer {
    constructor() {
        this.pools = new CompilerObjectPools();
        this.isEnabled = false;
        this.metrics = {
            optimizedNodes: 0,
            memoryReduced: 0,
            poolHits: 0
        };
    }

    /**
     * Enable memory optimization
     */
    enable() {
        this.isEnabled = true;
    }

    /**
     * Disable memory optimization
     */
    disable() {
        this.isEnabled = false;
    }

    /**
     * Optimize a compiled query result
     */
    optimize(compiledQuery) {
        if (!this.isEnabled) {
            return compiledQuery;
        }

        return this._optimizeNode(compiledQuery);
    }

    /**
     * Create an optimized node using object pools
     */
    createOptimizedNode(type, properties = {}) {
        if (!this.isEnabled) {
            return { type, ...properties };
        }

        const node = this.pools.acquireNode();
        node.type = type;
        
        // Copy properties efficiently
        for (const key in properties) {
            if (properties.hasOwnProperty(key)) {
                node[key] = properties[key];
            }
        }

        this.metrics.optimizedNodes++;
        return node;
    }

    /**
     * Create an optimized array
     */
    createOptimizedArray(items = []) {
        if (!this.isEnabled) {
            return [...items];
        }

        const arr = this.pools.acquireArray();
        arr.push(...items);
        this.metrics.poolHits++;
        return arr;
    }

    /**
     * Get memory optimization metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            pools: this.pools.getMetrics()
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            optimizedNodes: 0,
            memoryReduced: 0,
            poolHits: 0
        };
        this.pools.resetMetrics();
    }

    /**
     * Clear all pools
     */
    clear() {
        this.pools.clear();
    }

    /**
     * Optimize a node recursively
     * @private
     */
    _optimizeNode(node, visited = new WeakSet()) {
        if (!node || typeof node !== 'object') {
            return node;
        }

        // Prevent circular reference issues
        if (visited.has(node)) {
            return node; // Return original to avoid infinite recursion
        }
        visited.add(node);

        // Optimize arrays
        if (Array.isArray(node)) {
            return node.map(item => this._optimizeNode(item, visited));
        }

        // Create optimized copy of the node
        const optimized = this.pools.acquireNode();
        
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const value = node[key];
                
                if (Array.isArray(value)) {
                    // Optimize arrays
                    if (value.length === 0) {
                        // Use shared empty array for memory efficiency
                        optimized[key] = this._getSharedEmptyArray();
                    } else {
                        optimized[key] = value.map(item => this._optimizeNode(item, visited));
                    }
                } else if (value && typeof value === 'object') {
                    // Recursively optimize nested objects
                    optimized[key] = this._optimizeNode(value, visited);
                } else {
                    // Copy primitive values directly
                    optimized[key] = value;
                }
            }
        }

        this.metrics.optimizedNodes++;
        return optimized;
    }

    /**
     * Get shared empty array to reduce memory usage
     * @private
     */
    _getSharedEmptyArray() {
        if (!this._sharedEmptyArray) {
            this._sharedEmptyArray = Object.freeze([]);
        }
        return this._sharedEmptyArray;
    }
}

/**
 * Memory-efficient node creation utilities
 */
class NodeFactory {
    static createSelectNode(options = {}) {
        return {
            type: 'select',
            line: options.line || 1,
            id: options.id || 1,
            fromClause: options.fromClause || [],
            dependsOn: options.dependsOn || [],
            listeners: options.listeners || [],
            ...(options.columns && { columns: options.columns }),
            ...(options.whereCriteria && { whereCriteria: options.whereCriteria }),
            ...(options.assign && { assign: options.assign })
        };
    }

    static createReturnNode(options = {}) {
        return {
            type: 'return',
            line: options.line || 1,
            id: options.id || 1,
            rhs: options.rhs,
            ...(options.route && { route: options.route })
        };
    }

    static createDefineNode(options = {}) {
        return {
            type: 'define',
            line: options.line || 1,
            id: options.id || 1,
            object: options.object,
            dependsOn: options.dependsOn || [],
            listeners: options.listeners || [],
            ...(options.udf && { udf: options.udf }),
            ...(options.args && { args: options.args })
        };
    }

    /**
     * Create a minimal node with only required properties
     */
    static createMinimalNode(type, required = {}) {
        const node = { type };
        
        // Only add properties that are actually needed
        for (const key in required) {
            if (required[key] !== undefined && required[key] !== null) {
                node[key] = required[key];
            }
        }
        
        return node;
    }
}

module.exports = { MemoryOptimizer, NodeFactory };