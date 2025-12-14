/**
 * Incremental Compiler - Advanced optimization for incremental compilation
 * 
 * This module provides incremental compilation capabilities, detecting
 * query similarities and reusing partial compilation results.
 */

'use strict';

const crypto = require('crypto');

/**
 * Incremental Compiler
 * 
 * Analyzes query structure to detect similarities and reuse compilation
 * results for common patterns and partial query structures.
 */
class IncrementalCompiler {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.maxFragments = options.maxFragments || 1000;
        this.similarityThreshold = options.similarityThreshold || 0.8;
        
        // Fragment cache: stores compiled fragments by structure hash
        this.fragmentCache = new Map();
        
        // Structure cache: stores query structures for similarity analysis
        this.structureCache = new Map();
        
        // Metrics
        this.metrics = {
            incrementalHits: 0,
            incrementalMisses: 0,
            fragmentsReused: 0,
            similarityMatches: 0,
            deltaCompilations: 0
        };
    }

    /**
     * Attempt incremental compilation
     */
    compile(query, fullCompiler) {
        if (!this.enabled) {
            return fullCompiler(query);
        }
        
        const structure = this.analyzeStructure(query);
        const structureHash = this.hashStructure(structure);
        
        // Check for exact structural match
        const cachedResult = this.fragmentCache.get(structureHash);
        if (cachedResult) {
            this.metrics.incrementalHits++;
            this.metrics.fragmentsReused++;
            return this.adaptCachedResult(cachedResult, query, structure);
        }
        
        // Check for similar structures
        const similarStructure = this.findSimilarStructure(structure);
        if (similarStructure) {
            this.metrics.similarityMatches++;
            return this.compileDelta(query, structure, similarStructure, fullCompiler);
        }
        
        // No incremental optimization possible, do full compilation
        this.metrics.incrementalMisses++;
        const result = fullCompiler(query);
        
        // Cache the result for future incremental compilation
        this.cacheCompilationResult(structureHash, structure, result);
        
        return result;
    }

    /**
     * Analyze query structure for incremental compilation
     */
    analyzeStructure(query) {
        const structure = {
            statements: [],
            dependencies: new Set(),
            variables: new Set(),
            tables: new Set(),
            operations: new Set()
        };
        
        // Basic structure analysis (simplified for demonstration)
        const lines = query.split(/[;\n]/).filter(line => line.trim());
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            
            const statement = {
                index,
                type: this.detectStatementType(trimmed),
                normalized: this.normalizeStatement(trimmed),
                hash: this.hashString(trimmed)
            };
            
            structure.statements.push(statement);
            structure.operations.add(statement.type);
            
            // Extract dependencies
            this.extractDependencies(trimmed, structure);
        });
        
        return structure;
    }

    /**
     * Detect statement type
     */
    detectStatementType(statement) {
        const lower = statement.toLowerCase().trim();
        
        if (lower.startsWith('select')) return 'select';
        if (lower.startsWith('insert')) return 'insert';
        if (lower.startsWith('update')) return 'update';
        if (lower.startsWith('delete')) return 'delete';
        if (lower.startsWith('return')) return 'return';
        if (lower.startsWith('create')) return 'create';
        
        // Check for assignment statements (variable = select ...)
        if (lower.includes('=') && lower.includes('select')) return 'assignment';
        if (lower.includes('=') && !lower.includes('where')) return 'assignment';
        
        return 'unknown';
    }

    /**
     * Normalize statement for comparison
     */
    normalizeStatement(statement) {
        return statement
            .replace(/\s+/g, ' ')
            .replace(/"[^"]*"/g, '"__STRING__"')
            .replace(/'[^']*'/g, "'__STRING__'")
            .replace(/\b\d+\b/g, '__NUMBER__')
            .trim()
            .toLowerCase();
    }

    /**
     * Extract dependencies from statement
     */
    extractDependencies(statement, structure) {
        // Extract table names (simplified pattern matching)
        const tableMatches = statement.match(/from\s+(\w+)/gi);
        if (tableMatches) {
            tableMatches.forEach(match => {
                const table = match.replace(/from\s+/i, '').trim();
                structure.tables.add(table);
            });
        }
        
        // Extract variable assignments (handle both = and select)
        const assignmentMatch = statement.match(/(\w+)\s*=\s*select/i);
        if (assignmentMatch) {
            structure.variables.add(assignmentMatch[1]);
        } else {
            const simpleAssignmentMatch = statement.match(/^(\w+)\s*=/);
            if (simpleAssignmentMatch) {
                structure.variables.add(simpleAssignmentMatch[1]);
            }
        }
        
        // Extract variable references
        const refMatches = statement.match(/\{(\w+)\}/g);
        if (refMatches) {
            refMatches.forEach(match => {
                const variable = match.replace(/[{}]/g, '');
                structure.dependencies.add(variable);
            });
        }
    }

    /**
     * Find similar structure in cache
     */
    findSimilarStructure(structure) {
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (const [hash, cachedStructure] of this.structureCache) {
            const similarity = this.calculateSimilarity(structure, cachedStructure.structure);
            
            if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
                bestSimilarity = similarity;
                bestMatch = { hash, ...cachedStructure, similarity };
            }
        }
        
        return bestMatch;
    }

    /**
     * Calculate similarity between two query structures
     */
    calculateSimilarity(struct1, struct2) {
        // Compare operation types
        const ops1 = Array.from(struct1.operations);
        const ops2 = Array.from(struct2.operations);
        const opsIntersection = ops1.filter(op => ops2.includes(op));
        const opsUnion = [...new Set([...ops1, ...ops2])];
        const opsSimilarity = opsIntersection.length / opsUnion.length;
        
        // Compare table usage
        const tables1 = Array.from(struct1.tables);
        const tables2 = Array.from(struct2.tables);
        const tablesIntersection = tables1.filter(table => tables2.includes(table));
        const tablesUnion = [...new Set([...tables1, ...tables2])];
        const tablesSimilarity = tablesUnion.length > 0 ? tablesIntersection.length / tablesUnion.length : 1;
        
        // Compare statement structure
        const stmtSimilarity = this.compareStatementStructure(struct1.statements, struct2.statements);
        
        // Weighted average
        return (opsSimilarity * 0.4) + (tablesSimilarity * 0.3) + (stmtSimilarity * 0.3);
    }

    /**
     * Compare statement structures
     */
    compareStatementStructure(statements1, statements2) {
        if (statements1.length === 0 && statements2.length === 0) return 1;
        if (statements1.length === 0 || statements2.length === 0) return 0;
        
        const maxLength = Math.max(statements1.length, statements2.length);
        let matches = 0;
        
        for (let i = 0; i < maxLength; i++) {
            const stmt1 = statements1[i];
            const stmt2 = statements2[i];
            
            if (stmt1 && stmt2 && stmt1.type === stmt2.type) {
                // Check normalized similarity
                const normalizedSimilarity = this.stringSimilarity(stmt1.normalized, stmt2.normalized);
                if (normalizedSimilarity > 0.7) {
                    matches++;
                }
            }
        }
        
        return matches / maxLength;
    }

    /**
     * Calculate string similarity using Levenshtein distance
     */
    stringSimilarity(str1, str2) {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;
        
        const distance = this.levenshteinDistance(str1, str2);
        return 1 - (distance / maxLength);
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Compile delta between similar structures
     */
    compileDelta(query, structure, similarStructure, fullCompiler) {
        this.metrics.deltaCompilations++;
        
        // For now, fall back to full compilation but track the attempt
        // In a full implementation, this would analyze the differences
        // and compile only the changed parts
        const result = fullCompiler(query);
        
        // Cache this new structure for future similarity matching
        const structureHash = this.hashStructure(structure);
        this.cacheCompilationResult(structureHash, structure, result);
        
        return result;
    }

    /**
     * Adapt cached result to current query
     */
    adaptCachedResult(cachedResult, query, structure) {
        // For now, return the cached result directly
        // In a full implementation, this would adapt the cached result
        // to match the specific parameters of the current query
        return cachedResult.result;
    }

    /**
     * Cache compilation result
     */
    cacheCompilationResult(structureHash, structure, result) {
        // Evict if necessary
        if (this.fragmentCache.size >= this.maxFragments) {
            this.evictOldestFragment();
        }
        
        const entry = {
            structure,
            result,
            timestamp: Date.now(),
            accessCount: 1
        };
        
        this.fragmentCache.set(structureHash, entry);
        this.structureCache.set(structureHash, entry);
    }

    /**
     * Evict oldest fragment
     */
    evictOldestFragment() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.fragmentCache) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.fragmentCache.delete(oldestKey);
            this.structureCache.delete(oldestKey);
        }
    }

    /**
     * Hash structure for cache key
     */
    hashStructure(structure) {
        const structureString = JSON.stringify({
            operations: Array.from(structure.operations).sort(),
            tables: Array.from(structure.tables).sort(),
            variables: Array.from(structure.variables).sort(),
            statementTypes: structure.statements.map(s => s.type)
        });
        
        return this.hashString(structureString);
    }

    /**
     * Hash a string using SHA-256
     */
    hashString(str) {
        return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
    }

    /**
     * Clear all cached fragments
     */
    clear() {
        this.fragmentCache.clear();
        this.structureCache.clear();
        this.resetMetrics();
    }

    /**
     * Get metrics
     */
    getMetrics() {
        const totalRequests = this.metrics.incrementalHits + this.metrics.incrementalMisses;
        const hitRatio = totalRequests > 0 ? this.metrics.incrementalHits / totalRequests : 0;
        
        return {
            ...this.metrics,
            fragmentCacheSize: this.fragmentCache.size,
            structureCacheSize: this.structureCache.size,
            hitRatio,
            fillRatio: this.fragmentCache.size / this.maxFragments
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            incrementalHits: 0,
            incrementalMisses: 0,
            fragmentsReused: 0,
            similarityMatches: 0,
            deltaCompilations: 0
        };
    }

    /**
     * Configure incremental compiler
     */
    configure(options) {
        if (options.maxFragments !== undefined) {
            this.maxFragments = options.maxFragments;
        }
        
        if (options.similarityThreshold !== undefined) {
            this.similarityThreshold = options.similarityThreshold;
        }
        
        if (options.enabled !== undefined) {
            this.enabled = options.enabled;
        }
    }

    /**
     * Enable incremental compilation
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable incremental compilation
     */
    disable() {
        this.enabled = false;
    }
}

module.exports = IncrementalCompiler;