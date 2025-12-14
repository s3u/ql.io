#!/usr/bin/env node

/**
 * Load and Stress Testing for ql.io
 * 
 * Tests system behavior under various load conditions to identify
 * breaking points and performance characteristics under stress.
 */

const Engine = require('../../../lib/engine');
const path = require('path');
const fs = require('fs');

// Load test configuration
const LOAD_TEST_CONFIG = {
    scenarios: {
        light: { concurrency: 5, duration: 30, rampUp: 5 },
        moderate: { concurrency: 20, duration: 60, rampUp: 10 },
        heavy: { concurrency: 50, duration: 120, rampUp: 20 },
        stress: { concurrency: 100, duration: 180, rampUp: 30 }
    },
    queries: {
        simple: 'select * from users where id = 1',
        assignment: `
            user = select * from users where id = 1;
            return "{user}";
        `
    }
};

/**
 * Load Test Runner
 */
class LoadTestRunner {
    constructor() {
        this.results = {};
        this.activeRequests = new Map();
        this.metrics = {
            totalRequests: 0,
            completedRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: []
        };
    }
    
    /**
     * Create test engine instance
     */
    createEngine() {
        return new Engine({
            tables: path.join(__dirname, '../../../test/tables'),
            config: {
                maxNestedRequests: 50,
                maxResponseLength: 10000000,
                cache: {
                    impl: 'memory-cache',
                    options: {
                        max: 1000,
                        ttl: 300000
                    }
                }
            }
        });
    }
    
    /**
     * Execute single request
     */
    async executeRequest(engine, query, requestId) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.metrics.failedRequests++;
                this.metrics.errors.push({
                    requestId,
                    error: 'Timeout',
                    timestamp: Date.now()
                });
                resolve({ success: false, duration: Date.now() - startTime, error: 'Timeout' });
            }, 30000); // 30 second timeout
            
            engine.execute(query, (emitter) => {
                emitter.on('end', (err, results) => {
                    clearTimeout(timeout);
                    const duration = Date.now() - startTime;
                    
                    if (err) {
                        this.metrics.failedRequests++;
                        this.metrics.errors.push({
                            requestId,
                            error: err.message,
                            timestamp: Date.now()
                        });
                        resolve({ success: false, duration, error: err.message });
                    } else {
                        this.metrics.completedRequests++;
                        this.metrics.responseTimes.push(duration);
                        resolve({ success: true, duration, resultSize: JSON.stringify(results).length });
                    }
                });
                
                emitter.on('error', (err) => {
                    clearTimeout(timeout);
                    const duration = Date.now() - startTime;
                    this.metrics.failedRequests++;
                    this.metrics.errors.push({
                        requestId,
                        error: err.message,
                        timestamp: Date.now()
                    });
                    resolve({ success: false, duration, error: err.message });
                });
            });
        });
    }
    
    /**
     * Run load test scenario
     */
    async runLoadTest(scenarioName, queryName) {
        const scenario = LOAD_TEST_CONFIG.scenarios[scenarioName];
        const query = LOAD_TEST_CONFIG.queries[queryName];
        
        if (!scenario) {
            throw new Error(`Unknown scenario: ${scenarioName}`);
        }
        
        if (!query) {
            throw new Error(`Unknown query: ${queryName}`);
        }
        
        console.log(`\n🚛 Starting ${scenarioName} load test with ${queryName} query...`);
        console.log(`📊 Config: ${scenario.concurrency} concurrent users, ${scenario.duration}s duration, ${scenario.rampUp}s ramp-up`);
        
        // Reset metrics
        this.metrics = {
            totalRequests: 0,
            completedRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: []
        };
        
        const startTime = Date.now();
        const endTime = startTime + (scenario.duration * 1000);
        const rampUpInterval = (scenario.rampUp * 1000) / scenario.concurrency;
        
        const engines = Array.from({ length: scenario.concurrency }, () => this.createEngine());
        const workers = [];
        
        // Ramp up workers
        for (let i = 0; i < scenario.concurrency; i++) {
            setTimeout(() => {
                const worker = this.startWorker(engines[i], query, endTime, i);
                workers.push(worker);
            }, i * rampUpInterval);
        }
        
        // Wait for test duration
        await new Promise(resolve => setTimeout(resolve, scenario.duration * 1000));
        
        // Wait for all workers to complete
        await Promise.all(workers);
        
        const totalDuration = Date.now() - startTime;
        
        // Calculate statistics
        const stats = this.calculateLoadTestStats(totalDuration);
        
        console.log(`✅ Load test completed in ${(totalDuration / 1000).toFixed(2)}s`);
        console.log(`📊 Results: ${stats.successRate.toFixed(1)}% success rate, ${stats.throughput.toFixed(2)} req/s`);
        
        return {
            scenario: scenarioName,
            query: queryName,
            config: scenario,
            duration: totalDuration,
            statistics: stats,
            rawMetrics: { ...this.metrics }
        };
    }
    
    /**
     * Start individual worker
     */
    async startWorker(engine, query, endTime, workerId) {
        let requestCount = 0;
        
        while (Date.now() < endTime) {
            const requestId = `worker-${workerId}-req-${requestCount++}`;
            this.metrics.totalRequests++;
            
            try {
                await this.executeRequest(engine, query, requestId);
            } catch (error) {
                this.metrics.failedRequests++;
                this.metrics.errors.push({
                    requestId,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    
    /**
     * Calculate load test statistics
     */
    calculateLoadTestStats(duration) {
        const responseTimes = this.metrics.responseTimes.sort((a, b) => a - b);
        const durationSeconds = duration / 1000;
        
        const percentile = (arr, p) => {
            const index = Math.ceil(arr.length * p / 100) - 1;
            return arr[Math.max(0, index)] || 0;
        };
        
        return {
            totalRequests: this.metrics.totalRequests,
            completedRequests: this.metrics.completedRequests,
            failedRequests: this.metrics.failedRequests,
            successRate: this.metrics.totalRequests > 0 ? 
                (this.metrics.completedRequests / this.metrics.totalRequests) * 100 : 0,
            throughput: this.metrics.completedRequests / durationSeconds,
            responseTime: {
                min: Math.min(...responseTimes) || 0,
                max: Math.max(...responseTimes) || 0,
                mean: responseTimes.length > 0 ? 
                    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
                p50: percentile(responseTimes, 50),
                p95: percentile(responseTimes, 95),
                p99: percentile(responseTimes, 99)
            },
            errorRate: this.metrics.totalRequests > 0 ? 
                (this.metrics.failedRequests / this.metrics.totalRequests) * 100 : 0,
            errors: this.metrics.errors.slice(0, 10) // First 10 errors for analysis
        };
    }
    
    /**
     * Generate load test report
     */
    generateLoadTestReport(results) {
        const reportPath = path.join(__dirname, '../reports/load-test-report.md');
        const reportDir = path.dirname(reportPath);
        
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        let report = `# Load Test Report

## 📊 Test Summary (${new Date().toISOString()})

`;

        results.forEach(result => {
            const stats = result.statistics;
            const config = result.config;
            
            report += `### ${result.scenario.toUpperCase()} Load Test - ${result.query} Query

**Configuration:**
- Concurrency: ${config.concurrency} users
- Duration: ${config.duration}s
- Ramp-up: ${config.rampUp}s

**Results:**
- **Total Requests:** ${stats.totalRequests}
- **Success Rate:** ${stats.successRate.toFixed(1)}%
- **Throughput:** ${stats.throughput.toFixed(2)} req/s
- **Error Rate:** ${stats.errorRate.toFixed(1)}%

**Response Times:**
- Mean: ${stats.responseTime.mean.toFixed(2)}ms
- P50: ${stats.responseTime.p50.toFixed(2)}ms
- P95: ${stats.responseTime.p95.toFixed(2)}ms
- P99: ${stats.responseTime.p99.toFixed(2)}ms

${stats.errors.length > 0 ? `**Sample Errors:**
${stats.errors.slice(0, 3).map(e => `- ${e.error}`).join('\n')}
` : '**No Errors Detected**'}

`;
        });
        
        // Add analysis
        report += `## 📈 Performance Analysis

### Throughput Comparison
${results.map(r => `- **${r.scenario}**: ${r.statistics.throughput.toFixed(2)} req/s`).join('\n')}

### Latency Comparison (P95)
${results.map(r => `- **${r.scenario}**: ${r.statistics.responseTime.p95.toFixed(2)}ms`).join('\n')}

### Reliability Comparison
${results.map(r => `- **${r.scenario}**: ${r.statistics.successRate.toFixed(1)}% success rate`).join('\n')}

## 🎯 Recommendations

${this.generateLoadTestRecommendations(results).map(r => `- ${r}`).join('\n')}

---
*Generated by ql.io Performance Testing Framework*
`;
        
        fs.writeFileSync(reportPath, report);
        console.log(`📊 Load test report generated: ${reportPath}`);
        
        return reportPath;
    }
    
    /**
     * Generate recommendations based on load test results
     */
    generateLoadTestRecommendations(results) {
        const recommendations = [];
        
        results.forEach(result => {
            const stats = result.statistics;
            
            if (stats.successRate < 95) {
                recommendations.push(`**${result.scenario}**: Low success rate (${stats.successRate.toFixed(1)}%) - investigate error causes and improve error handling`);
            }
            
            if (stats.responseTime.p95 > 1000) {
                recommendations.push(`**${result.scenario}**: High latency (${stats.responseTime.p95.toFixed(2)}ms P95) - optimize query execution and consider caching`);
            }
            
            if (stats.throughput < 10) {
                recommendations.push(`**${result.scenario}**: Low throughput (${stats.throughput.toFixed(2)} req/s) - review system capacity and bottlenecks`);
            }
        });
        
        if (recommendations.length === 0) {
            recommendations.push('System performs well under all tested load conditions');
            recommendations.push('Consider testing with higher concurrency levels to find breaking points');
        }
        
        return recommendations;
    }
}

/**
 * Main execution function
 */
async function runAllLoadTests() {
    console.log('🚛 Starting ql.io Load Testing Suite...\n');
    
    const runner = new LoadTestRunner();
    const results = [];
    
    // Test scenarios
    const testMatrix = [
        { scenario: 'light', query: 'simple' },
        { scenario: 'moderate', query: 'simple' },
        { scenario: 'light', query: 'assignment' },
        { scenario: 'moderate', query: 'assignment' }
    ];
    
    for (const test of testMatrix) {
        try {
            const result = await runner.runLoadTest(test.scenario, test.query);
            results.push(result);
        } catch (error) {
            console.error(`❌ Load test failed (${test.scenario}/${test.query}):`, error.message);
        }
    }
    
    // Generate report
    if (results.length > 0) {
        runner.generateLoadTestReport(results);
    }
    
    console.log(`\n✅ Load testing completed! Tested ${results.length} scenarios.`);
    
    return results;
}

// Export for use in other modules
module.exports = {
    LoadTestRunner,
    runAllLoadTests,
    LOAD_TEST_CONFIG
};

// Run tests if called directly
if (require.main === module) {
    runAllLoadTests().catch(console.error);
}