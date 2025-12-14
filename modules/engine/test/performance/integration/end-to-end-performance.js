/**
 * End-to-End Performance Integration Tests
 * 
 * Tests complete query execution pipelines to measure real-world performance
 * including compilation, execution, HTTP requests, and data transformation.
 */

const Engine = require('../../../lib/engine');
const path = require('path');
const fs = require('fs');

// Performance test configuration
const TEST_CONFIG = {
    iterations: 100,
    warmupIterations: 10,
    timeoutMs: 30000,
    concurrency: [1, 5, 10, 20],
    dataSizes: ['small', 'medium', 'large']
};

// Test scenarios - focused on engine execution, not compilation
const TEST_SCENARIOS = {
    simpleSelect: {
        name: 'Simple SELECT Query',
        script: 'select * from users where id = 1',
        expectedLatency: 100, // ms
        description: 'Basic single-table query with simple WHERE clause'
    },
    
    assignment: {
        name: 'Variable Assignment',
        script: `
            user = select * from users where id = 1;
            return "{user}";
        `,
        expectedLatency: 150, // ms
        description: 'Simple variable assignment and return'
    },
    
    multiStep: {
        name: 'Multi-Step Query',
        script: `
            user = select * from users where id = 1;
            profile = select * from profiles where user_id = 1;
            return {
                "user": "{user}",
                "profile": "{profile}"
            };
        `,
        expectedLatency: 250, // ms
        description: 'Multi-step query with dependency resolution'
    }
};

/**
 * Performance measurement utilities
 */
class PerformanceMeasurer {
    constructor() {
        this.measurements = {};
    }
    
    startTimer(label) {
        this.measurements[label] = {
            start: process.hrtime.bigint(),
            memory: process.memoryUsage()
        };
    }
    
    endTimer(label) {
        if (!this.measurements[label]) {
            throw new Error(`Timer '${label}' was not started`);
        }
        
        const end = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        const measurement = this.measurements[label];
        
        return {
            duration: Number(end - measurement.start) / 1000000, // Convert to milliseconds
            memoryDelta: {
                heapUsed: endMemory.heapUsed - measurement.memory.heapUsed,
                heapTotal: endMemory.heapTotal - measurement.memory.heapTotal,
                external: endMemory.external - measurement.memory.external
            }
        };
    }
}

/**
 * Mock Engine Setup for Performance Testing
 */
function createTestEngine() {
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
 * Execute Single Performance Test
 */
async function executeSingleTest(engine, scenario, iteration = 0) {
    const measurer = new PerformanceMeasurer();
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Test timed out after ${TEST_CONFIG.timeoutMs}ms`));
        }, TEST_CONFIG.timeoutMs);
        
        measurer.startTimer('total');
        
        engine.execute(scenario.script, (emitter) => {
            let compilationTime = null;
            let executionStartTime = null;
            
            emitter.on('compile-start', () => {
                measurer.startTimer('compilation');
            });
            
            emitter.on('compile-end', () => {
                compilationTime = measurer.endTimer('compilation');
            });
            
            emitter.on('execution-start', () => {
                executionStartTime = Date.now();
                measurer.startTimer('execution');
            });
            
            emitter.on('end', (err, results) => {
                clearTimeout(timeout);
                
                if (err) {
                    return reject(err);
                }
                
                const totalTime = measurer.endTimer('total');
                const executionTime = executionStartTime ? measurer.endTimer('execution') : null;
                
                resolve({
                    iteration,
                    scenario: scenario.name,
                    success: true,
                    timing: {
                        total: totalTime.duration,
                        compilation: compilationTime?.duration || 0,
                        execution: executionTime?.duration || 0
                    },
                    memory: totalTime.memoryDelta,
                    resultSize: JSON.stringify(results).length
                });
            });
            
            emitter.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    });
}

/**
 * Execute Performance Test Suite
 */
async function executeTestSuite(scenario, iterations = TEST_CONFIG.iterations) {
    console.log(`\n🚀 Running ${scenario.name} (${iterations} iterations)...`);
    
    const engine = createTestEngine();
    const results = [];
    const errors = [];
    
    // Warmup iterations
    console.log(`  🔥 Warming up (${TEST_CONFIG.warmupIterations} iterations)...`);
    for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
        try {
            await executeSingleTest(engine, scenario, -i - 1);
        } catch (error) {
            console.warn(`    ⚠️ Warmup iteration ${i + 1} failed:`, error.message);
        }
    }
    
    // Actual test iterations
    console.log(`  📊 Measuring performance (${iterations} iterations)...`);
    for (let i = 0; i < iterations; i++) {
        try {
            const result = await executeSingleTest(engine, scenario, i);
            results.push(result);
            
            if ((i + 1) % 10 === 0) {
                console.log(`    ✓ Completed ${i + 1}/${iterations} iterations`);
            }
        } catch (error) {
            errors.push({ iteration: i, error: error.message });
            console.warn(`    ❌ Iteration ${i + 1} failed:`, error.message);
        }
    }
    
    return { results, errors };
}

/**
 * Calculate Performance Statistics
 */
function calculateStatistics(results) {
    if (results.length === 0) {
        return null;
    }
    
    const timings = results.map(r => r.timing.total).sort((a, b) => a - b);
    const compilationTimes = results.map(r => r.timing.compilation).sort((a, b) => a - b);
    const executionTimes = results.map(r => r.timing.execution).sort((a, b) => a - b);
    const memorySizes = results.map(r => r.memory.heapUsed);
    
    const percentile = (arr, p) => {
        const index = Math.ceil(arr.length * p / 100) - 1;
        return arr[Math.max(0, index)];
    };
    
    return {
        total: {
            min: Math.min(...timings),
            max: Math.max(...timings),
            mean: timings.reduce((a, b) => a + b, 0) / timings.length,
            p50: percentile(timings, 50),
            p95: percentile(timings, 95),
            p99: percentile(timings, 99)
        },
        compilation: {
            min: Math.min(...compilationTimes),
            max: Math.max(...compilationTimes),
            mean: compilationTimes.reduce((a, b) => a + b, 0) / compilationTimes.length,
            p95: percentile(compilationTimes, 95)
        },
        execution: {
            min: Math.min(...executionTimes),
            max: Math.max(...executionTimes),
            mean: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
            p95: percentile(executionTimes, 95)
        },
        memory: {
            avgHeapDelta: memorySizes.reduce((a, b) => a + b, 0) / memorySizes.length,
            maxHeapDelta: Math.max(...memorySizes)
        },
        successRate: (results.length / TEST_CONFIG.iterations) * 100
    };
}

/**
 * Generate Performance Report
 */
function generatePerformanceReport(allResults) {
    const reportPath = path.join(__dirname, '../reports/end-to-end-performance-report.md');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    let report = `# End-to-End Performance Test Report

## 📊 Test Summary (${new Date().toISOString()})

**Configuration:**
- Iterations per test: ${TEST_CONFIG.iterations}
- Warmup iterations: ${TEST_CONFIG.warmupIterations}
- Timeout: ${TEST_CONFIG.timeoutMs}ms
- Node.js version: ${process.version}

## 📈 Performance Results

`;
    
    Object.entries(allResults).forEach(([scenarioName, data]) => {
        const stats = data.statistics;
        const scenario = TEST_SCENARIOS[scenarioName];
        
        if (!stats) {
            report += `### ❌ ${scenario.name}
**Status:** All tests failed
**Errors:** ${data.errors.length}

`;
            return;
        }
        
        const passedTarget = stats.total.p95 <= scenario.expectedLatency;
        const statusIcon = passedTarget ? '✅' : '⚠️';
        
        report += `### ${statusIcon} ${scenario.name}

**Description:** ${scenario.description}

**Latency (ms):**
- Mean: ${stats.total.mean.toFixed(2)}ms
- P50: ${stats.total.p50.toFixed(2)}ms
- P95: ${stats.total.p95.toFixed(2)}ms (target: ≤${scenario.expectedLatency}ms)
- P99: ${stats.total.p99.toFixed(2)}ms

**Compilation Performance:**
- Mean: ${stats.compilation.mean.toFixed(2)}ms
- P95: ${stats.compilation.p95.toFixed(2)}ms

**Execution Performance:**
- Mean: ${stats.execution.mean.toFixed(2)}ms
- P95: ${stats.execution.p95.toFixed(2)}ms

**Memory Usage:**
- Average heap delta: ${(stats.memory.avgHeapDelta / 1024 / 1024).toFixed(2)}MB
- Max heap delta: ${(stats.memory.maxHeapDelta / 1024 / 1024).toFixed(2)}MB

**Reliability:**
- Success rate: ${stats.successRate.toFixed(1)}%
- Failed iterations: ${data.errors.length}

`;
    });
    
    // Add recommendations
    report += `## 🎯 Performance Analysis

### Targets Met
${Object.entries(allResults).map(([name, data]) => {
        const scenario = TEST_SCENARIOS[name];
        const stats = data.statistics;
        if (!stats) return null;
        const passed = stats.total.p95 <= scenario.expectedLatency;
        return passed ? `- ✅ ${scenario.name}: ${stats.total.p95.toFixed(2)}ms ≤ ${scenario.expectedLatency}ms` : null;
    }).filter(Boolean).join('\n') || '- None'}

### Targets Missed
${Object.entries(allResults).map(([name, data]) => {
        const scenario = TEST_SCENARIOS[name];
        const stats = data.statistics;
        if (!stats) return `- ❌ ${scenario.name}: All tests failed`;
        const passed = stats.total.p95 <= scenario.expectedLatency;
        return !passed ? `- ⚠️ ${scenario.name}: ${stats.total.p95.toFixed(2)}ms > ${scenario.expectedLatency}ms (${((stats.total.p95 / scenario.expectedLatency - 1) * 100).toFixed(1)}% slower)` : null;
    }).filter(Boolean).join('\n') || '- None'}

### Recommendations
${Object.entries(allResults).map(([name, data]) => {
        const stats = data.statistics;
        if (!stats) return null;
        const recommendations = [];
        
        if (stats.compilation.p95 > 20) {
            recommendations.push(`- **${TEST_SCENARIOS[name].name}**: Compilation is slow (${stats.compilation.p95.toFixed(2)}ms). Consider query optimization.`);
        }
        
        if (stats.memory.maxHeapDelta > 50 * 1024 * 1024) {
            recommendations.push(`- **${TEST_SCENARIOS[name].name}**: High memory usage (${(stats.memory.maxHeapDelta / 1024 / 1024).toFixed(2)}MB). Check for memory leaks.`);
        }
        
        if (stats.successRate < 95) {
            recommendations.push(`- **${TEST_SCENARIOS[name].name}**: Low success rate (${stats.successRate.toFixed(1)}%). Investigate error causes.`);
        }
        
        return recommendations.join('\n');
    }).filter(Boolean).join('\n') || '- No specific recommendations. Performance looks good!'}

---
*Generated by ql.io Performance Testing Framework*
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📊 Performance report generated: ${reportPath}`);
    
    return reportPath;
}

/**
 * Main Test Runner
 */
async function runEndToEndPerformanceTests() {
    console.log('🚀 Starting End-to-End Performance Tests...');
    console.log(`📋 Testing ${Object.keys(TEST_SCENARIOS).length} scenarios with ${TEST_CONFIG.iterations} iterations each\n`);
    
    const allResults = {};
    
    for (const [scenarioKey, scenario] of Object.entries(TEST_SCENARIOS)) {
        try {
            const { results, errors } = await executeTestSuite(scenario);
            const statistics = calculateStatistics(results);
            
            allResults[scenarioKey] = {
                scenario,
                results,
                errors,
                statistics
            };
            
            if (statistics) {
                const passedTarget = statistics.total.p95 <= scenario.expectedLatency;
                const statusIcon = passedTarget ? '✅' : '⚠️';
                console.log(`  ${statusIcon} P95 latency: ${statistics.total.p95.toFixed(2)}ms (target: ≤${scenario.expectedLatency}ms)`);
                console.log(`  📊 Success rate: ${statistics.successRate.toFixed(1)}%`);
            } else {
                console.log(`  ❌ All tests failed (${errors.length} errors)`);
            }
        } catch (error) {
            console.error(`❌ Failed to run ${scenario.name}:`, error.message);
            allResults[scenarioKey] = {
                scenario,
                results: [],
                errors: [{ error: error.message }],
                statistics: null
            };
        }
    }
    
    // Generate comprehensive report
    const reportPath = generatePerformanceReport(allResults);
    
    // Summary
    const totalTests = Object.keys(TEST_SCENARIOS).length;
    const passedTests = Object.values(allResults).filter(r => 
        r.statistics && r.statistics.total.p95 <= r.scenario.expectedLatency
    ).length;
    
    console.log(`\n✅ End-to-End Performance Tests Complete!`);
    console.log(`📊 Results: ${passedTests}/${totalTests} scenarios met performance targets`);
    console.log(`📄 Detailed report: ${reportPath}`);
    
    return allResults;
}

// Export for use in other test files
module.exports = {
    runEndToEndPerformanceTests,
    executeTestSuite,
    calculateStatistics,
    TEST_SCENARIOS,
    TEST_CONFIG
};

// Run tests if called directly
if (require.main === module) {
    runEndToEndPerformanceTests().catch(console.error);
}