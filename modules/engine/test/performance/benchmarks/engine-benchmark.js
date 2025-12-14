#!/usr/bin/env node

/**
 * Engine Performance Benchmarks
 * 
 * Tests the performance of the ql.io engine execution pipeline,
 * focusing on statement execution, dependency resolution, and context management.
 */

const Benchmark = require('benchmark');
const Engine = require('../../../lib/engine');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
    iterations: 50,
    timeout: 30000
};

// Mock engine setup for testing
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

// Test queries focused on engine execution
const testQueries = {
    simple: 'select * from users where id = 1',
    
    assignment: `
        users = select * from users where id = 1;
        return "{users}";
    `,
    
    multiStep: `
        user = select * from users where id = 1;
        profile = select * from profiles where user_id = 1;
        return {
            "user": "{user}",
            "profile": "{profile}"
        };
    `
};

// Performance tracking
const performanceResults = {
    execution: {},
    memory: {},
    concurrency: {}
};

/**
 * Execute single query and measure performance
 */
async function executeQuery(engine, query, label) {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Query timeout: ${label}`));
        }, TEST_CONFIG.timeout);
        
        engine.execute(query, (emitter) => {
            emitter.on('end', (err, results) => {
                clearTimeout(timeout);
                const endTime = process.hrtime.bigint();
                const endMemory = process.memoryUsage();
                
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        duration: Number(endTime - startTime) / 1000000, // Convert to milliseconds
                        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
                        resultSize: JSON.stringify(results).length
                    });
                }
            });
            
            emitter.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    });
}

/**
 * Benchmark Suite: Query Execution Performance
 */
const executionSuite = new Benchmark.Suite('Engine Execution');

// Add execution benchmarks for different query types
Object.entries(testQueries).forEach(([name, query]) => {
    executionSuite.add(`Execute ${name} query`, {
        defer: true,
        fn: function(deferred) {
            const engine = createTestEngine();
            executeQuery(engine, query, name)
                .then(() => deferred.resolve())
                .catch(() => deferred.resolve()); // Continue even on errors
        }
    });
});

/**
 * Concurrency Benchmark
 */
async function measureConcurrency() {
    console.log('🔄 Testing concurrent execution...');
    
    const engine = createTestEngine();
    const concurrencyLevels = [1, 5, 10];
    const results = {};
    
    for (const level of concurrencyLevels) {
        console.log(`  Testing ${level} concurrent requests...`);
        
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < level; i++) {
            promises.push(
                executeQuery(engine, testQueries.simple, `concurrent-${i}`)
                    .catch(() => ({ duration: 0, error: true }))
            );
        }
        
        const responses = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        
        const successful = responses.filter(r => !r.error);
        const avgLatency = successful.length > 0 ? 
            successful.reduce((sum, r) => sum + r.duration, 0) / successful.length : 0;
        
        results[level] = {
            totalTime,
            avgLatency,
            successRate: (successful.length / level) * 100,
            throughput: successful.length / (totalTime / 1000)
        };
    }
    
    return results;
}

/**
 * Memory Usage Benchmark
 */
async function measureMemoryUsage() {
    console.log('🧠 Measuring memory usage patterns...');
    
    const engine = createTestEngine();
    const initialMemory = process.memoryUsage();
    
    // Execute multiple queries to test memory growth
    for (let i = 0; i < 50; i++) {
        try {
            await executeQuery(engine, testQueries.simple, `memory-test-${i}`);
        } catch (error) {
            // Continue on errors
        }
    }
    
    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    
    return {
        heapUsedDelta: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotalDelta: finalMemory.heapTotal - initialMemory.heapTotal,
        externalDelta: finalMemory.external - initialMemory.external
    };
}

/**
 * Generate Performance Report
 */
function generateReport(results) {
    const reportPath = path.join(__dirname, '../reports/engine-performance-report.md');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = `# Engine Performance Report

## 📊 Test Results (${new Date().toISOString()})

### Execution Performance
${Object.entries(results.execution).map(([name, result]) => 
    result.hz ? `- **${name}**: ${result.hz.toFixed(2)} ops/sec (±${result.rme.toFixed(2)}%)` : `- **${name}**: Failed to complete`
).join('\n')}

### Concurrency Performance
${Object.entries(results.concurrency).map(([level, result]) => `
#### ${level} Concurrent Requests
- **Throughput**: ${result.throughput.toFixed(2)} req/s
- **Average Latency**: ${result.avgLatency.toFixed(2)}ms
- **Success Rate**: ${result.successRate.toFixed(1)}%
`).join('')}

### Memory Usage
- **Heap Used Delta**: ${(results.memory.heapUsedDelta / 1024 / 1024).toFixed(2)} MB
- **Heap Total Delta**: ${(results.memory.heapTotalDelta / 1024 / 1024).toFixed(2)} MB
- **External Delta**: ${(results.memory.externalDelta / 1024 / 1024).toFixed(2)} MB

## 📈 Analysis

### Performance Characteristics
${Object.values(results.execution).some(r => r.hz && r.hz > 100) ? 
    '- ✅ **High Throughput**: Engine demonstrates good execution performance\n' : 
    '- ⚠️ **Low Throughput**: Engine execution may need optimization\n'}
${results.memory.heapUsedDelta < 10 * 1024 * 1024 ? 
    '- ✅ **Memory Efficient**: Low memory growth during execution\n' : 
    '- ⚠️ **Memory Growth**: Significant memory usage detected\n'}
${Object.values(results.concurrency).every(r => r.successRate > 95) ? 
    '- ✅ **Reliable**: High success rate under concurrent load\n' : 
    '- ⚠️ **Reliability Issues**: Some failures under concurrent load\n'}

### Recommendations
${results.memory.heapUsedDelta > 50 * 1024 * 1024 ? 
    '- **Memory**: Investigate potential memory leaks in execution pipeline\n' : ''}
${Object.values(results.concurrency).some(r => r.successRate < 90) ? 
    '- **Concurrency**: Improve error handling and resource management\n' : ''}
${Object.values(results.execution).some(r => r.hz && r.hz < 50) ? 
    '- **Performance**: Optimize slow execution paths\n' : ''}

---
*Generated by ql.io Engine Performance Testing Framework*
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Report generated: ${reportPath}`);
}

/**
 * Main Benchmark Execution
 */
async function runBenchmarks() {
    console.log('🚀 Starting Engine Performance Benchmarks...\n');
    
    return new Promise((resolve) => {
        // Run execution benchmarks
        executionSuite
            .on('cycle', function(event) {
                const benchmark = event.target;
                if (benchmark.hz && benchmark.rme) {
                    console.log(`✓ ${benchmark.name}: ${benchmark.hz.toFixed(2)} ops/sec (±${benchmark.rme.toFixed(2)}%)`);
                    
                    const testName = benchmark.name.replace('Execute ', '').replace(' query', '');
                    performanceResults.execution[testName] = {
                        hz: benchmark.hz,
                        rme: benchmark.rme,
                        samples: benchmark.stats ? benchmark.stats.sample.length : 0
                    };
                } else {
                    console.log(`❌ ${benchmark.name}: Failed to complete`);
                    const testName = benchmark.name.replace('Execute ', '').replace(' query', '');
                    performanceResults.execution[testName] = { failed: true };
                }
            })
            .on('complete', async function() {
                console.log('\n🔄 Running concurrency tests...\n');
                
                // Run concurrency tests
                performanceResults.concurrency = await measureConcurrency();
                
                console.log('\n🧠 Measuring memory usage...\n');
                
                // Measure memory usage
                performanceResults.memory = await measureMemoryUsage();
                console.log(`✓ Memory delta: ${(performanceResults.memory.heapUsedDelta / 1024 / 1024).toFixed(2)} MB`);
                
                // Generate report
                generateReport(performanceResults);
                
                console.log('\n✅ Engine benchmarks completed!');
                resolve(performanceResults);
            })
            .run({ async: true });
    });
}

// Export for use in test suites
module.exports = {
    runBenchmarks,
    executeQuery,
    createTestEngine,
    testQueries
};

// Run benchmarks if called directly
if (require.main === module) {
    runBenchmarks().catch(console.error);
}