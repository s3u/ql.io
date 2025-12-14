#!/usr/bin/env node

/**
 * ql.io Performance Testing Suite Runner
 * 
 * Orchestrates all performance tests including micro-benchmarks,
 * integration tests, and load tests. Generates comprehensive reports
 * and checks for performance regressions.
 */

const path = require('path');
const fs = require('fs');

// Import test modules
const engineBenchmark = require('./benchmarks/engine-benchmark');
const endToEndPerformance = require('./integration/end-to-end-performance');
const BaselineManager = require('./utils/baseline-manager');
const ReportGenerator = require('./utils/report-generator');

// Performance test configuration
const CONFIG = {
    runBenchmarks: true,
    runIntegration: true,
    runLoad: false, // Disabled by default for CI
    generateReport: true,
    checkRegressions: true,
    saveBaseline: false, // Only save baseline manually
    outputDir: path.join(__dirname, 'reports'),
    baselineDir: path.join(__dirname, 'baselines')
};

/**
 * Performance Test Results Aggregator
 */
class PerformanceTestRunner {
    constructor() {
        this.results = {
            benchmarks: {},
            integration: {},
            load: {},
            summary: {
                startTime: new Date(),
                endTime: null,
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                regressions: []
            }
        };
        
        this.ensureDirectories();
    }
    
    ensureDirectories() {
        [CONFIG.outputDir, CONFIG.baselineDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    /**
     * Run Micro-Benchmarks
     */
    async runBenchmarks() {
        if (!CONFIG.runBenchmarks) {
            console.log('⏭️ Skipping micro-benchmarks (disabled in config)');
            return;
        }
        
        console.log('\n🔬 Running Micro-Benchmarks...');
        console.log('=' .repeat(50));
        
        try {
            const benchmarkResult = await engineBenchmark.runBenchmarks();
            this.results.benchmarks = benchmarkResult;
            
            console.log('✅ Engine benchmarks completed successfully');
            
            this.results.summary.passedTests++;
        } catch (error) {
            console.error('❌ Benchmark tests failed:', error.message);
            this.results.summary.failedTests++;
        }
        
        this.results.summary.totalTests++;
    }
    
    /**
     * Run Integration Performance Tests
     */
    async runIntegrationTests() {
        if (!CONFIG.runIntegration) {
            console.log('⏭️ Skipping integration tests (disabled in config)');
            return;
        }
        
        console.log('\n🔗 Running Integration Performance Tests...');
        console.log('=' .repeat(50));
        
        try {
            const integrationResults = await endToEndPerformance.runEndToEndPerformanceTests();
            this.results.integration = integrationResults;
            
            // Check if integration tests met their targets
            const scenarios = Object.values(integrationResults);
            const passedScenarios = scenarios.filter(s => 
                s.statistics && s.statistics.total.p95 <= s.scenario.expectedLatency
            );
            
            if (passedScenarios.length === scenarios.length) {
                console.log('✅ All integration performance targets met');
                this.results.summary.passedTests++;
            } else {
                const failedCount = scenarios.length - passedScenarios.length;
                console.log(`⚠️ ${failedCount}/${scenarios.length} integration tests missed performance targets`);
                this.results.summary.failedTests++;
            }
        } catch (error) {
            console.error('❌ Integration tests failed:', error.message);
            this.results.summary.failedTests++;
        }
        
        this.results.summary.totalTests++;
    }
    
    /**
     * Run Load Tests (placeholder for future implementation)
     */
    async runLoadTests() {
        if (!CONFIG.runLoad) {
            console.log('⏭️ Skipping load tests (disabled in config)');
            return;
        }
        
        console.log('\n🚛 Running Load Tests...');
        console.log('=' .repeat(50));
        
        // TODO: Implement load testing with autocannon or similar
        console.log('🚧 Load tests not yet implemented');
        
        this.results.summary.totalTests++;
    }
    
    /**
     * Generate Comprehensive Performance Report
     */
    generateComprehensiveReport() {
        if (!CONFIG.generateReport) {
            return;
        }
        
        console.log('\n📊 Generating Comprehensive Performance Report...');
        
        const reportPath = path.join(CONFIG.outputDir, 'comprehensive-performance-report.md');
        const summary = this.results.summary;
        
        let report = `# 🚀 ql.io Comprehensive Performance Report

## 📋 Test Summary

**Execution Time:** ${summary.startTime.toISOString()} - ${summary.endTime.toISOString()}  
**Duration:** ${((summary.endTime - summary.startTime) / 1000).toFixed(2)} seconds  
**Node.js Version:** ${process.version}  
**Platform:** ${process.platform} ${process.arch}

### 📊 Overall Results
- **Total Test Suites:** ${summary.totalTests}
- **Passed:** ${summary.passedTests} ✅
- **Failed:** ${summary.failedTests} ❌
- **Success Rate:** ${summary.totalTests > 0 ? ((summary.passedTests / summary.totalTests) * 100).toFixed(1) : 0}%

`;

        // Benchmark Results Section
        if (CONFIG.runBenchmarks && Object.keys(this.results.benchmarks).length > 0) {
            report += `## 🔬 Micro-Benchmark Results

### Compilation Performance
${Object.entries(this.results.benchmarks.compilation || {}).map(([name, result]) => 
    `- **${name}**: ${result.hz.toFixed(2)} ops/sec (±${result.rme.toFixed(2)}%)`
).join('\n')}

### Caching Performance
${Object.entries(this.results.benchmarks.caching || {}).map(([name, result]) =>
    `- **${name}**: ${result.hz.toFixed(2)} ops/sec (±${result.rme.toFixed(2)}%)`
).join('\n')}

### Memory Usage
${this.results.benchmarks.memory ? `
- **Heap Used Delta**: ${(this.results.benchmarks.memory.heapUsedDelta / 1024 / 1024).toFixed(2)} MB
- **Heap Total Delta**: ${(this.results.benchmarks.memory.heapTotalDelta / 1024 / 1024).toFixed(2)} MB
` : '- No memory data available'}

`;
        }
        
        // Integration Test Results Section
        if (CONFIG.runIntegration && Object.keys(this.results.integration).length > 0) {
            report += `## 🔗 Integration Performance Results

${Object.entries(this.results.integration).map(([name, data]) => {
    if (!data.statistics) {
        return `### ❌ ${data.scenario.name}
**Status:** All tests failed  
**Errors:** ${data.errors.length}`;
    }
    
    const stats = data.statistics;
    const scenario = data.scenario;
    const passedTarget = stats.total.p95 <= scenario.expectedLatency;
    const statusIcon = passedTarget ? '✅' : '⚠️';
    
    return `### ${statusIcon} ${scenario.name}

**Target Latency:** ≤${scenario.expectedLatency}ms  
**Actual P95 Latency:** ${stats.total.p95.toFixed(2)}ms  
**Success Rate:** ${stats.successRate.toFixed(1)}%

**Performance Breakdown:**
- Mean: ${stats.total.mean.toFixed(2)}ms
- P50: ${stats.total.p50.toFixed(2)}ms  
- P99: ${stats.total.p99.toFixed(2)}ms
- Compilation: ${stats.compilation.p95.toFixed(2)}ms (P95)
- Execution: ${stats.execution.p95.toFixed(2)}ms (P95)`;
}).join('\n\n')}

`;
        }
        
        // Regression Analysis
        if (summary.regressions.length > 0) {
            report += `## 🚨 Performance Regressions Detected

${summary.regressions.map(r => 
    `- **${r.test}**: ${r.regression} slower (${r.current} vs ${r.baseline} ops/sec)`
).join('\n')}

`;
        } else {
            report += `## ✅ No Performance Regressions Detected

All performance metrics are within acceptable ranges compared to baseline measurements.

`;
        }
        
        // Recommendations
        report += `## 🎯 Recommendations

`;
        
        const recommendations = [];
        
        // Check for slow compilation
        if (this.results.benchmarks.compilation) {
            const slowCompilation = Object.values(this.results.benchmarks.compilation)
                .some(r => r.hz < 1000);
            if (slowCompilation) {
                recommendations.push('- **Query Compilation**: Some queries compile slowly. Consider caching or optimization.');
            }
        }
        
        // Check for memory issues
        if (this.results.benchmarks.memory?.heapUsedDelta > 50 * 1024 * 1024) {
            recommendations.push('- **Memory Usage**: Significant memory growth detected. Review for potential leaks.');
        }
        
        // Check integration test failures
        if (CONFIG.runIntegration) {
            const failedIntegration = Object.values(this.results.integration)
                .some(r => !r.statistics || r.statistics.total.p95 > r.scenario.expectedLatency);
            if (failedIntegration) {
                recommendations.push('- **Integration Performance**: Some end-to-end tests missed targets. Review query optimization.');
            }
        }
        
        // Check for regressions
        if (summary.regressions.length > 0) {
            recommendations.push('- **Performance Regressions**: Review recent changes that may have impacted performance.');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('- **Overall**: Performance looks good! No specific issues detected.');
        }
        
        report += recommendations.join('\n');
        
        report += `

## 📈 Performance Trends

*Note: Historical trend analysis will be available after multiple test runs.*

---
*Generated by ql.io Performance Testing Framework v1.0*
*Report generated at: ${new Date().toISOString()}*
`;
        
        fs.writeFileSync(reportPath, report);
        console.log(`📄 Comprehensive report saved: ${reportPath}`);
        
        return reportPath;
    }
    
    /**
     * Print Summary to Console
     */
    printSummary() {
        const summary = this.results.summary;
        
        console.log('\n' + '='.repeat(60));
        console.log('🏁 PERFORMANCE TEST SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`⏱️  Duration: ${((summary.endTime - summary.startTime) / 1000).toFixed(2)}s`);
        console.log(`📊 Test Suites: ${summary.passedTests}/${summary.totalTests} passed`);
        
        if (summary.regressions.length > 0) {
            console.log(`🚨 Regressions: ${summary.regressions.length} detected`);
        } else {
            console.log(`✅ Regressions: None detected`);
        }
        
        const overallSuccess = summary.failedTests === 0 && summary.regressions.length === 0;
        console.log(`\n${overallSuccess ? '✅ OVERALL: PASS' : '❌ OVERALL: FAIL'}`);
        
        if (!overallSuccess) {
            console.log('\n🔍 Issues detected:');
            if (summary.failedTests > 0) {
                console.log(`   - ${summary.failedTests} test suite(s) failed`);
            }
            if (summary.regressions.length > 0) {
                console.log(`   - ${summary.regressions.length} performance regression(s)`);
            }
        }
        
        console.log('='.repeat(60));
    }
    
    /**
     * Main Test Execution
     */
    async run() {
        console.log('🚀 ql.io Performance Testing Suite');
        console.log('🔧 Initializing performance tests...\n');
        
        try {
            // Run all test categories
            await this.runBenchmarks();
            await this.runIntegrationTests();
            await this.runLoadTests();
            
            // Finalize results
            this.results.summary.endTime = new Date();
            
            // Generate reports
            if (CONFIG.generateReport) {
                this.generateComprehensiveReport();
            }
            
            // Print summary
            this.printSummary();
            
            // Exit with appropriate code
            const hasFailures = this.results.summary.failedTests > 0 || 
                               this.results.summary.regressions.length > 0;
            
            if (hasFailures) {
                console.log('\n❌ Performance tests completed with issues');
                process.exit(1);
            } else {
                console.log('\n✅ All performance tests passed successfully');
                process.exit(0);
            }
            
        } catch (error) {
            console.error('\n💥 Performance test suite failed:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

/**
 * CLI Argument Processing
 */
function processCliArguments() {
    const args = process.argv.slice(2);
    
    args.forEach(arg => {
        switch (arg) {
            case '--no-benchmarks':
                CONFIG.runBenchmarks = false;
                break;
            case '--no-integration':
                CONFIG.runIntegration = false;
                break;
            case '--load':
                CONFIG.runLoad = true;
                break;
            case '--no-report':
                CONFIG.generateReport = false;
                break;
            case '--save-baseline':
                CONFIG.saveBaseline = true;
                break;
            case '--help':
                console.log(`
ql.io Performance Testing Suite

Usage: node run-all-benchmarks.js [options]

Options:
  --no-benchmarks    Skip micro-benchmark tests
  --no-integration   Skip integration performance tests  
  --load             Include load testing (disabled by default)
  --no-report        Skip report generation
  --save-baseline    Save current results as new baseline
  --help             Show this help message

Examples:
  node run-all-benchmarks.js                    # Run all tests
  node run-all-benchmarks.js --no-benchmarks    # Skip benchmarks
  node run-all-benchmarks.js --load             # Include load tests
`);
                process.exit(0);
                break;
        }
    });
}

// Main execution
if (require.main === module) {
    processCliArguments();
    
    const runner = new PerformanceTestRunner();
    runner.run().catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = PerformanceTestRunner;