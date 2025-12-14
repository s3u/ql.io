#!/usr/bin/env node

/**
 * Query Compiler Performance Benchmarks
 * 
 * Tests the performance of query compilation, parsing, and optimization.
 * These micro-benchmarks help identify bottlenecks in the compilation pipeline.
 */

const Benchmark = require('benchmark');
const compiler = require('../../lib/compiler.js');
const fs = require('fs');
const path = require('path');

// Test data - various query complexities (working queries only)
const testQueries = {
    simple: 'select * from users',
    
    withWhere: 'select id, name from users where status = "active"',
    
    basicReturn: 'return "hello world"',
    
    simpleAssignment: 'myusers = select * from users; return "{myusers}"'
};

// Mock table definitions for compilation (empty object works for basic compilation)
const mockTables = {};

// Performance tracking
const performanceResults = {
    compilation: {},
    memory: {},
    caching: {}
};

/**
 * Benchmark Suite: Query Compilation Performance
 */
const compilationSuite = new Benchmark.Suite('Query Compilation');

// Add compilation benchmarks for different query complexities
Object.entries(testQueries).forEach(([name, query]) => {
    compilationSuite.add(`Compile ${name} query`, function() {
        // Don't catch errors in benchmarks - let them fail properly
        compiler.compile(query, mockTables);
    });
});

/**
 * Benchmark Suite: Compilation Caching Performance  
 */
const cachingSuite = new Benchmark.Suite('Compilation Caching');

cachingSuite
    .add('First compilation (cache miss)', function() {
        // Clear cache and compile
        const uniqueQuery = testQueries.simple + ` -- ${Date.now()}`;
        compiler.compile(uniqueQuery, mockTables);
    })
    .add('Cached compilation (cache hit)', function() {
        // This should hit the cache
        compiler.compile(testQueries.simple, mockTables);
    });

/**
 * Memory Usage Benchmark
 */
function measureMemoryUsage() {
    const initialMemory = process.memoryUsage();
    
    // Compile many queries to test memory growth
    for (let i = 0; i < 100; i++) {
        const query = testQueries.simple + ` -- iteration ${i}`;
        compiler.compile(query, mockTables);
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
 * Performance Regression Detection
 */
function checkPerformanceRegression(results) {
    const baselinePath = path.join(__dirname, 'baselines/compiler-baseline.json');
    let baseline = {};
    
    try {
        if (fs.existsSync(baselinePath)) {
            baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        }
    } catch (error) {
        console.warn('Could not load baseline data:', error.message);
    }
    
    const regressions = [];
    const threshold = 0.1; // 10% regression threshold
    
    Object.entries(results.compilation).forEach(([testName, result]) => {
        const baselineResult = baseline.compilation?.[testName];
        if (baselineResult && result.hz && baselineResult.hz) {
            const regression = (result.hz - baselineResult.hz) / baselineResult.hz;
            if (regression < -threshold) {
                regressions.push({
                    test: testName,
                    regression: Math.abs(regression * 100).toFixed(1) + '%',
                    current: result.hz.toFixed(2),
                    baseline: baselineResult.hz.toFixed(2)
                });
            }
        }
    });
    
    return regressions;
}

/**
 * Save Performance Baseline
 */
function saveBaseline(results) {
    const baselinePath = path.join(__dirname, 'baselines/compiler-baseline.json');
    const baselineDir = path.dirname(baselinePath);
    
    if (!fs.existsSync(baselineDir)) {
        fs.mkdirSync(baselineDir, { recursive: true });
    }
    
    const baseline = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        ...results
    };
    
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    console.log(`✅ Baseline saved to ${baselinePath}`);
}

/**
 * Generate Performance Report
 */
function generateReport(results, regressions) {
    const reportPath = path.join(__dirname, 'reports/compiler-performance-report.md');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = `# Query Compiler Performance Report

## 📊 Test Results (${new Date().toISOString()})

### Compilation Performance
${Object.entries(results.compilation).map(([name, result]) => 
    result.hz ? `- **${name}**: ${result.hz.toFixed(2)} ops/sec (±${result.rme.toFixed(2)}%)` : `- **${name}**: Failed to complete`
).join('\n')}

### Caching Performance  
${Object.entries(results.caching).map(([name, result]) =>
    result.hz ? `- **${name}**: ${result.hz.toFixed(2)} ops/sec (±${result.rme.toFixed(2)}%)` : `- **${name}**: Failed to complete`
).join('\n')}

### Memory Usage
- **Heap Used Delta**: ${(results.memory.heapUsedDelta / 1024 / 1024).toFixed(2)} MB
- **Heap Total Delta**: ${(results.memory.heapTotalDelta / 1024 / 1024).toFixed(2)} MB
- **External Delta**: ${(results.memory.externalDelta / 1024 / 1024).toFixed(2)} MB

${regressions.length > 0 ? `
### 🚨 Performance Regressions Detected
${regressions.map(r => 
    `- **${r.test}**: ${r.regression} slower (${r.current} vs ${r.baseline} ops/sec)`
).join('\n')}
` : '### ✅ No Performance Regressions Detected'}

## 📈 Recommendations

${results.memory.heapUsedDelta > 50 * 1024 * 1024 ? 
    '- ⚠️ **Memory Usage**: Significant memory growth detected. Consider cache size limits.\n' : ''}
${Object.values(results.compilation).some(r => r.hz && r.hz < 1000) ?
    '- ⚠️ **Compilation Speed**: Some queries compile slowly. Consider optimization.\n' : ''}
${regressions.length > 0 ?
    '- 🚨 **Regressions**: Performance regressions detected. Review recent changes.\n' : ''}

---
*Generated by ql.io Compiler Performance Testing Framework*
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Report generated: ${reportPath}`);
}

/**
 * Main Benchmark Execution
 */
async function runBenchmarks() {
    console.log('🚀 Starting Query Compiler Performance Benchmarks...\n');
    
    return new Promise((resolve) => {
        // Run compilation benchmarks
        compilationSuite
            .on('cycle', function(event) {
                const benchmark = event.target;
                if (benchmark.hz) {
                    const rme = benchmark.stats && benchmark.stats.rme ? benchmark.stats.rme : 0;
                    console.log(`✓ ${benchmark.name}: ${benchmark.hz.toFixed(2)} ops/sec (±${rme.toFixed(2)}%)`);
                    
                    const testName = benchmark.name.replace('Compile ', '').replace(' query', '');
                    performanceResults.compilation[testName] = {
                        hz: benchmark.hz,
                        rme: rme,
                        samples: benchmark.stats ? benchmark.stats.sample.length : 0
                    };
                } else {
                    console.log(`❌ ${benchmark.name}: Failed to complete`);
                    const testName = benchmark.name.replace('Compile ', '').replace(' query', '');
                    performanceResults.compilation[testName] = { failed: true };
                }
            })
            .on('complete', function() {
                console.log('\n🔄 Running caching benchmarks...\n');
                
                // Run caching benchmarks
                cachingSuite
                    .on('cycle', function(event) {
                        const benchmark = event.target;
                        if (benchmark.hz) {
                            const rme = benchmark.stats && benchmark.stats.rme ? benchmark.stats.rme : 0;
                            console.log(`✓ ${benchmark.name}: ${benchmark.hz.toFixed(2)} ops/sec (±${rme.toFixed(2)}%)`);
                            
                            performanceResults.caching[benchmark.name] = {
                                hz: benchmark.hz,
                                rme: rme,
                                samples: benchmark.stats ? benchmark.stats.sample.length : 0
                            };
                        } else {
                            console.log(`❌ ${benchmark.name}: Failed to complete`);
                            performanceResults.caching[benchmark.name] = { failed: true };
                        }
                    })
                    .on('complete', function() {
                        console.log('\n🧠 Measuring memory usage...\n');
                        
                        // Measure memory usage
                        performanceResults.memory = measureMemoryUsage();
                        console.log(`✓ Memory delta: ${(performanceResults.memory.heapUsedDelta / 1024 / 1024).toFixed(2)} MB`);
                        
                        // Check for regressions
                        const regressions = checkPerformanceRegression(performanceResults);
                        
                        // Generate report
                        generateReport(performanceResults, regressions);
                        
                        // Save baseline if no regressions
                        if (regressions.length === 0) {
                            saveBaseline(performanceResults);
                        }
                        
                        console.log('\n✅ Compiler benchmarks completed!');
                        resolve({ results: performanceResults, regressions });
                    })
                    .run({ async: false });
            })
            .run({ async: false });
    });
}

// Export for use in test suites
module.exports = {
    runBenchmarks,
    testQueries,
    mockTables,
    measureMemoryUsage
};

// Run benchmarks if called directly
if (require.main === module) {
    runBenchmarks().catch(console.error);
}