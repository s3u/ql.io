#!/usr/bin/env node

/**
 * Simple Engine Performance Benchmark
 * 
 * Focused performance test for the ql.io engine that measures
 * basic execution performance without external dependencies.
 */

const Engine = require('../../lib/engine');
const path = require('path');
const fs = require('fs');

// Simple test configuration
const TEST_CONFIG = {
    iterations: 100,
    timeout: 5000
};

/**
 * Create a minimal test engine
 */
function createTestEngine() {
    return new Engine({
        config: {
            maxNestedRequests: 50,
            maxResponseLength: 10000000
        }
    });
}

/**
 * Simple performance test for basic engine operations
 */
async function runSimplePerformanceTest() {
    console.log('🚀 Starting Simple Engine Performance Test...\n');
    
    const engine = createTestEngine();
    const results = {
        simpleReturn: { success: 0, failed: 0, totalTime: 0 },
        assignment: { success: 0, failed: 0, totalTime: 0 },
        multipleStatements: { success: 0, failed: 0, totalTime: 0 }
    };
    
    // Test 1: Simple return statement
    console.log('Testing simple return statements...');
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const startTime = Date.now();
        
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), TEST_CONFIG.timeout);
                
                engine.execute('return "hello world"', (emitter) => {
                    emitter.on('end', (err, result) => {
                        clearTimeout(timeout);
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                    
                    emitter.on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });
            });
            
            results.simpleReturn.success++;
            results.simpleReturn.totalTime += Date.now() - startTime;
        } catch (error) {
            results.simpleReturn.failed++;
        }
    }
    
    // Test 2: Variable assignment
    console.log('Testing variable assignments...');
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const startTime = Date.now();
        
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), TEST_CONFIG.timeout);
                
                engine.execute(`
                    message = "hello world";
                    return "{message}";
                `, (emitter) => {
                    emitter.on('end', (err, result) => {
                        clearTimeout(timeout);
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                    
                    emitter.on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });
            });
            
            results.assignment.success++;
            results.assignment.totalTime += Date.now() - startTime;
        } catch (error) {
            results.assignment.failed++;
        }
    }
    
    // Test 3: Multiple statements
    console.log('Testing multiple statements...');
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const startTime = Date.now();
        
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), TEST_CONFIG.timeout);
                
                engine.execute(`
                    greeting = "hello";
                    target = "world";
                    return "{greeting} {target}";
                `, (emitter) => {
                    emitter.on('end', (err, result) => {
                        clearTimeout(timeout);
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                    
                    emitter.on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });
            });
            
            results.multipleStatements.success++;
            results.multipleStatements.totalTime += Date.now() - startTime;
        } catch (error) {
            results.multipleStatements.failed++;
        }
    }
    
    return results;
}

/**
 * Calculate and display performance metrics
 */
function displayResults(results) {
    console.log('\n📊 Performance Results:\n');
    
    Object.entries(results).forEach(([testName, result]) => {
        const total = result.success + result.failed;
        const successRate = total > 0 ? (result.success / total) * 100 : 0;
        const avgTime = result.success > 0 ? result.totalTime / result.success : 0;
        const throughput = result.success > 0 ? (result.success / (result.totalTime / 1000)) : 0;
        
        console.log(`${testName}:`);
        console.log(`  ✓ Success Rate: ${successRate.toFixed(1)}% (${result.success}/${total})`);
        console.log(`  ⏱️  Average Time: ${avgTime.toFixed(2)}ms`);
        console.log(`  🚀 Throughput: ${throughput.toFixed(2)} ops/sec`);
        console.log('');
    });
}

/**
 * Generate performance report
 */
function generateReport(results) {
    const reportPath = path.join(__dirname, 'reports/simple-engine-performance-report.md');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = `# Simple Engine Performance Report

## 📊 Test Results (${new Date().toISOString()})

### Performance Summary
${Object.entries(results).map(([testName, result]) => {
    const total = result.success + result.failed;
    const successRate = total > 0 ? (result.success / total) * 100 : 0;
    const avgTime = result.success > 0 ? result.totalTime / result.success : 0;
    const throughput = result.success > 0 ? (result.success / (result.totalTime / 1000)) : 0;
    
    return `
#### ${testName}
- **Success Rate**: ${successRate.toFixed(1)}% (${result.success}/${total})
- **Average Latency**: ${avgTime.toFixed(2)}ms
- **Throughput**: ${throughput.toFixed(2)} ops/sec
`;
}).join('')}

## 📈 Analysis

### Performance Characteristics
${Object.values(results).some(r => (r.success / (r.success + r.failed)) > 0.9) ? 
    '- ✅ **High Reliability**: Good success rates across tests\n' : 
    '- ⚠️ **Reliability Issues**: Some tests showing failures\n'}
${Object.values(results).some(r => r.success > 0 && (r.success / (r.totalTime / 1000)) > 50) ? 
    '- ✅ **Good Throughput**: Acceptable performance levels\n' : 
    '- ⚠️ **Low Throughput**: Performance may need optimization\n'}

### Recommendations
${Object.values(results).some(r => (r.success / (r.success + r.failed)) < 0.9) ? 
    '- **Reliability**: Investigate and fix execution failures\n' : ''}
${Object.values(results).some(r => r.success > 0 && (r.totalTime / r.success) > 100) ? 
    '- **Performance**: Optimize slow execution paths\n' : ''}

---
*Generated by Simple Engine Performance Testing Framework*
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Report generated: ${reportPath}`);
}

/**
 * Main execution
 */
async function main() {
    try {
        const results = await runSimplePerformanceTest();
        displayResults(results);
        generateReport(results);
        console.log('✅ Simple engine performance test completed!');
    } catch (error) {
        console.error('❌ Performance test failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { runSimplePerformanceTest, createTestEngine };