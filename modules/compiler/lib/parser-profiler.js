/**
 * Parser Profiler for Query Compiler
 * 
 * Profiles the PEG parser to identify performance bottlenecks
 * and optimization opportunities.
 */

'use strict';

const ql = require('./peg/ql.js');

class ParserProfiler {
    constructor() {
        this.profiles = new Map();
        this.isEnabled = false;
    }

    /**
     * Enable profiling with optional configuration
     */
    enable(options = {}) {
        this.isEnabled = true;
        this.sampleSize = options.sampleSize || 100;
        this.profiles.clear();
    }

    /**
     * Disable profiling
     */
    disable() {
        this.isEnabled = false;
    }

    /**
     * Profile query parsing performance
     */
    profileQuery(query, iterations = 1) {
        if (!this.isEnabled) {
            return ql.parse(query);
        }

        const queryType = this._classifyQuery(query);
        const profile = this.profiles.get(queryType) || {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            samples: []
        };

        const start = process.hrtime.bigint();
        
        let result;
        for (let i = 0; i < iterations; i++) {
            result = ql.parse(query);
        }
        
        const duration = Number(process.hrtime.bigint() - start) / 1000000 / iterations; // ms per iteration

        // Update profile statistics
        profile.count++;
        profile.totalTime += duration;
        profile.minTime = Math.min(profile.minTime, duration);
        profile.maxTime = Math.max(profile.maxTime, duration);
        
        // Keep sample for detailed analysis
        if (profile.samples.length < this.sampleSize) {
            profile.samples.push({
                query: query.substring(0, 100), // First 100 chars
                duration,
                timestamp: Date.now()
            });
        }

        this.profiles.set(queryType, profile);
        return result;
    }

    /**
     * Record fast path usage without parsing
     */
    recordFastPath(query) {
        if (!this.isEnabled) {
            return;
        }

        const queryType = this._classifyQuery(query) + '-fastpath';
        const profile = this.profiles.get(queryType) || {
            count: 0,
            totalTime: 0,
            minTime: 0,
            maxTime: 0,
            samples: []
        };

        // Fast path has minimal time
        const duration = 0.001; // 1 microsecond

        profile.count++;
        profile.totalTime += duration;
        profile.minTime = Math.min(profile.minTime || duration, duration);
        profile.maxTime = Math.max(profile.maxTime, duration);

        this.profiles.set(queryType, profile);
    }

    /**
     * Get profiling results
     */
    getResults() {
        const results = {};
        
        for (const [queryType, profile] of this.profiles) {
            results[queryType] = {
                count: profile.count,
                avgTime: profile.totalTime / profile.count,
                minTime: profile.minTime,
                maxTime: profile.maxTime,
                totalTime: profile.totalTime,
                samples: profile.samples.length
            };
        }

        return results;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const results = this.getResults();
        const sortedResults = Object.entries(results)
            .sort(([,a], [,b]) => b.avgTime - a.avgTime);

        let report = '# Parser Performance Profile\n\n';
        report += `Generated: ${new Date().toISOString()}\n\n`;
        report += '## Query Type Performance (sorted by avg time)\n\n';
        report += '| Query Type | Count | Avg Time (ms) | Min (ms) | Max (ms) | Total (ms) |\n';
        report += '|------------|-------|---------------|----------|----------|------------|\n';

        for (const [queryType, stats] of sortedResults) {
            report += `| ${queryType} | ${stats.count} | ${stats.avgTime.toFixed(3)} | ${stats.minTime.toFixed(3)} | ${stats.maxTime.toFixed(3)} | ${stats.totalTime.toFixed(3)} |\n`;
        }

        report += '\n## Optimization Recommendations\n\n';
        
        // Identify slow query types
        const slowQueries = sortedResults.filter(([, stats]) => stats.avgTime > 1.0);
        if (slowQueries.length > 0) {
            report += '### Slow Query Types (>1ms avg)\n';
            for (const [queryType, stats] of slowQueries) {
                report += `- **${queryType}**: ${stats.avgTime.toFixed(3)}ms average (${stats.count} samples)\n`;
            }
            report += '\n';
        }

        // Identify high variance queries
        const highVarianceQueries = sortedResults.filter(([, stats]) => 
            stats.maxTime > stats.minTime * 3
        );
        if (highVarianceQueries.length > 0) {
            report += '### High Variance Query Types (max > 3x min)\n';
            for (const [queryType, stats] of highVarianceQueries) {
                const variance = (stats.maxTime / stats.minTime).toFixed(1);
                report += `- **${queryType}**: ${variance}x variance (${stats.minTime.toFixed(3)}ms - ${stats.maxTime.toFixed(3)}ms)\n`;
            }
            report += '\n';
        }

        return report;
    }

    /**
     * Reset profiling data
     */
    reset() {
        this.profiles.clear();
    }

    /**
     * Classify query type for profiling
     * @private
     */
    _classifyQuery(query) {
        const trimmed = query.trim().toLowerCase();
        
        // Simple patterns for classification
        if (trimmed.startsWith('select')) {
            if (trimmed.includes('where')) {
                if (trimmed.includes('join')) return 'select-join-where';
                return 'select-where';
            }
            if (trimmed.includes('join')) return 'select-join';
            return 'select-simple';
        }
        
        if (trimmed.startsWith('insert')) return 'insert';
        if (trimmed.startsWith('update')) return 'update';
        if (trimmed.startsWith('delete')) return 'delete';
        if (trimmed.startsWith('create')) return 'create';
        if (trimmed.startsWith('return')) return 'return';
        
        // Check for assignments
        if (trimmed.includes('=') && !trimmed.includes('where')) {
            if (trimmed.includes('select')) return 'assignment-select';
            return 'assignment-simple';
        }
        
        // Complex multi-statement queries
        if (trimmed.includes(';')) return 'multi-statement';
        
        return 'unknown';
    }
}

module.exports = ParserProfiler;