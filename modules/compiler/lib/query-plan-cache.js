/**
 * Query Plan Cache - Advanced optimization for caching execution plans
 * 
 * This module provides intelligent caching of query execution plans,
 * allowing for template-based plan reuse and parameter substitution.
 */

'use strict';

const crypto = require('crypto');

/**
 * Query Plan Cache Manager
 * 
 * Caches compiled query plans separately from full compilation results,
 * enabling template-based reuse and parameter substitution optimization.
 */
class QueryPlanCache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 500;
        this.ttl = options.ttl || 300000; // 5 minutes default TTL
        this.enabled = options.enabled !== false;
        
        // Plan cache: stores execution plans by template hash
        this.planCache = new Map();
        
        // Template cache: stores query templates by normalized structure
        this.templateCache = new Map();
        
        // Metrics
        this.metrics = {
            planHits: 0,
            planMisses: 0,
            templateHits: 0,
            templateMisses: 0,
            evictions: 0,
            substitutions: 0
        };
        
        // LRU tracking
        this.accessOrder = [];
    }

    /**
     * Get cached plan for a query
     */
    getPlan(query, parameters = {}) {
        if (!this.enabled) return null;
        
        const template = this.extractTemplate(query);
        const templateHash = this.hashTemplate(template);
        
        // Check if we have a cached plan for this template
        const cachedEntry = this.planCache.get(templateHash);
        if (cachedEntry && !this.isExpired(cachedEntry)) {
            this.updateAccessOrder(templateHash);
            this.metrics.planHits++;
            
            // Substitute parameters in the cached plan
            const substitutedPlan = this.substitutePlan(cachedEntry.plan, parameters);
            this.metrics.substitutions++;
            
            return substitutedPlan;
        }
        
        this.metrics.planMisses++;
        return null;
    }

    /**
     * Cache a compiled plan
     */
    setPlan(query, plan, parameters = {}) {
        if (!this.enabled) return;
        
        const template = this.extractTemplate(query);
        const templateHash = this.hashTemplate(template);
        
        // Store the plan with metadata
        const entry = {
            plan: this.createPlanTemplate(plan, parameters),
            template,
            timestamp: Date.now(),
            accessCount: 1,
            parameters: Object.keys(parameters)
        };
        
        // Evict if necessary
        if (this.planCache.size >= this.maxSize) {
            this.evictLRU();
        }
        
        this.planCache.set(templateHash, entry);
        this.updateAccessOrder(templateHash);
    }

    /**
     * Extract query template by normalizing parameters
     */
    extractTemplate(query) {
        // Normalize string literals to placeholders
        let template = query
            .replace(/"[^"]*"/g, '"__STRING__"')
            .replace(/'[^']*'/g, "'__STRING__'")
            .replace(/\b\d+\b/g, '__NUMBER__')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Store in template cache for reuse
        const templateKey = this.hashString(template);
        if (!this.templateCache.has(templateKey)) {
            this.templateCache.set(templateKey, template);
            this.metrics.templateMisses++;
        } else {
            this.metrics.templateHits++;
        }
        
        return template;
    }

    /**
     * Create a plan template that can be reused with parameter substitution
     */
    createPlanTemplate(plan, parameters) {
        // For now, store a simplified version without circular references
        // In a full implementation, this would use a more sophisticated approach
        const template = this.createSimplifiedPlan(plan);
        
        // Replace parameter values in the plan structure
        this.replaceParametersInNode(template, parameters);
        
        return template;
    }

    /**
     * Substitute parameters in a cached plan template
     */
    substitutePlan(planTemplate, parameters) {
        // Create a copy of the template
        const plan = this.createSimplifiedPlan(planTemplate);
        
        // Substitute placeholders with actual parameter values
        this.substituteParametersInNode(plan, parameters);
        
        return plan;
    }

    /**
     * Create a simplified plan without circular references
     */
    createSimplifiedPlan(plan) {
        const visited = new WeakSet();
        
        const simplify = (obj) => {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (visited.has(obj)) {
                // Return a reference marker for circular references
                return { __circular_ref__: true, id: obj.id || 'unknown' };
            }
            
            visited.add(obj);
            
            if (Array.isArray(obj)) {
                return obj.map(item => simplify(item));
            }
            
            const simplified = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    // Skip certain properties that cause circular references
                    if (key === 'listeners' || key === 'return' || key === 'scope') {
                        simplified[key] = Array.isArray(obj[key]) ? [] : null;
                    } else {
                        simplified[key] = simplify(obj[key]);
                    }
                }
            }
            
            return simplified;
        };
        
        return simplify(plan);
    }

    /**
     * Replace parameter values with placeholders in a plan node
     */
    replaceParametersInNode(node, parameters) {
        if (!node || typeof node !== 'object') return;
        
        if (Array.isArray(node)) {
            node.forEach(item => this.replaceParametersInNode(item, parameters));
            return;
        }
        
        // Replace parameter values in object properties
        Object.keys(node).forEach(key => {
            const value = node[key];
            
            if (typeof value === 'string') {
                // Check if this value matches any parameter
                Object.entries(parameters).forEach(([paramKey, paramValue]) => {
                    if (value === paramValue || value.includes(paramValue)) {
                        node[key] = value.replace(paramValue, `__PARAM_${paramKey}__`);
                    }
                });
            } else if (typeof value === 'object') {
                this.replaceParametersInNode(value, parameters);
            }
        });
    }

    /**
     * Substitute placeholders with actual parameter values in a plan node
     */
    substituteParametersInNode(node, parameters) {
        if (!node || typeof node !== 'object') return;
        
        if (Array.isArray(node)) {
            node.forEach(item => this.substituteParametersInNode(item, parameters));
            return;
        }
        
        // Substitute placeholders in object properties
        Object.keys(node).forEach(key => {
            const value = node[key];
            
            if (typeof value === 'string') {
                // Replace parameter placeholders with actual values
                Object.entries(parameters).forEach(([paramKey, paramValue]) => {
                    const placeholder = `__PARAM_${paramKey}__`;
                    if (value.includes(placeholder)) {
                        node[key] = value.replace(placeholder, paramValue);
                    }
                });
            } else if (typeof value === 'object') {
                this.substituteParametersInNode(value, parameters);
            }
        });
    }

    /**
     * Hash a template string for cache key
     */
    hashTemplate(template) {
        return this.hashString(template);
    }

    /**
     * Hash a string using SHA-256
     */
    hashString(str) {
        return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
    }

    /**
     * Check if a cache entry is expired
     */
    isExpired(entry) {
        return Date.now() - entry.timestamp > this.ttl;
    }

    /**
     * Update LRU access order
     */
    updateAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        this.accessOrder.push(key);
    }

    /**
     * Evict least recently used entry
     */
    evictLRU() {
        if (this.accessOrder.length === 0) return;
        
        const lruKey = this.accessOrder.shift();
        this.planCache.delete(lruKey);
        this.metrics.evictions++;
    }

    /**
     * Clear all cached plans
     */
    clear() {
        this.planCache.clear();
        this.templateCache.clear();
        this.accessOrder = [];
        this.resetMetrics();
    }

    /**
     * Get cache metrics
     */
    getMetrics() {
        const totalRequests = this.metrics.planHits + this.metrics.planMisses;
        const hitRatio = totalRequests > 0 ? this.metrics.planHits / totalRequests : 0;
        
        return {
            ...this.metrics,
            planCacheSize: this.planCache.size,
            templateCacheSize: this.templateCache.size,
            hitRatio: hitRatio,
            fillRatio: this.planCache.size / this.maxSize
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            planHits: 0,
            planMisses: 0,
            templateHits: 0,
            templateMisses: 0,
            evictions: 0,
            substitutions: 0
        };
    }

    /**
     * Configure cache settings
     */
    configure(options) {
        if (options.maxSize !== undefined) {
            this.maxSize = options.maxSize;
            
            // Evict excess entries if new size is smaller
            while (this.planCache.size > this.maxSize) {
                this.evictLRU();
            }
        }
        
        if (options.ttl !== undefined) {
            this.ttl = options.ttl;
        }
        
        if (options.enabled !== undefined) {
            this.enabled = options.enabled;
        }
    }

    /**
     * Enable plan caching
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable plan caching
     */
    disable() {
        this.enabled = false;
    }
}

module.exports = QueryPlanCache;