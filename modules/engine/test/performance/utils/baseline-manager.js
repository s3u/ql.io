#!/usr/bin/env node

/**
 * Performance Baseline Management Utility
 * 
 * Manages performance baselines for regression detection.
 * Supports saving new baselines and comparing current results against baselines.
 */

const fs = require('fs');
const path = require('path');

const BASELINE_DIR = path.join(__dirname, '../baselines');
const REPORTS_DIR = path.join(__dirname, '../reports');

/**
 * Baseline Manager Class
 */
class BaselineManager {
    constructor() {
        this.ensureDirectories();
    }
    
    ensureDirectories() {
        [BASELINE_DIR, REPORTS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    /**
     * Save current performance results as baseline
     */
    saveBaseline(testName, results) {
        const baselinePath = path.join(BASELINE_DIR, `${testName}-baseline.json`);
        
        const baseline = {
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: `${process.platform} ${process.arch}`,
            results: results
        };
        
        fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
        console.log(`✅ Baseline saved: ${baselinePath}`);
        
        return baselinePath;
    }
    
    /**
     * Load baseline for comparison
     */
    loadBaseline(testName) {
        const baselinePath = path.join(BASELINE_DIR, `${testName}-baseline.json`);
        
        if (!fs.existsSync(baselinePath)) {
            return null;
        }
        
        try {
            const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
            return baseline;
        } catch (error) {
            console.warn(`⚠️ Failed to load baseline ${baselinePath}:`, error.message);
            return null;
        }
    }
    
    /**
     * Compare current results against baseline
     */
    compareAgainstBaseline(testName, currentResults, threshold = 0.1) {
        const baseline = this.loadBaseline(testName);
        
        if (!baseline) {
            return {
                hasBaseline: false,
                message: 'No baseline found for comparison'
            };
        }
        
        const regressions = [];
        const improvements = [];
        
        // Compare performance metrics
        this.compareMetrics(baseline.results, currentResults, regressions, improvements, threshold);
        
        return {
            hasBaseline: true,
            baseline: baseline,
            regressions: regressions,
            improvements: improvements,
            summary: {
                regressionsCount: regressions.length,
                improvementsCount: improvements.length,
                overallStatus: regressions.length === 0 ? 'PASS' : 'FAIL'
            }
        };
    }
    
    /**
     * Recursively compare metrics
     */
    compareMetrics(baseline, current, regressions, improvements, threshold, path = '') {
        Object.keys(baseline).forEach(key => {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof baseline[key] === 'number' && typeof current[key] === 'number') {
                const change = (current[key] - baseline[key]) / baseline[key];
                
                if (Math.abs(change) > threshold) {
                    const changeData = {
                        metric: currentPath,
                        baseline: baseline[key],
                        current: current[key],
                        change: change,
                        changePercent: (change * 100).toFixed(1) + '%'
                    };
                    
                    if (change > 0) {
                        // For latency metrics, increase is bad (regression)
                        // For throughput metrics, increase is good (improvement)
                        if (currentPath.includes('latency') || currentPath.includes('time') || currentPath.includes('duration')) {
                            regressions.push(changeData);
                        } else {
                            improvements.push(changeData);
                        }
                    } else {
                        // For latency metrics, decrease is good (improvement)
                        // For throughput metrics, decrease is bad (regression)
                        if (currentPath.includes('latency') || currentPath.includes('time') || currentPath.includes('duration')) {
                            improvements.push(changeData);
                        } else {
                            regressions.push(changeData);
                        }
                    }
                }
            } else if (typeof baseline[key] === 'object' && typeof current[key] === 'object') {
                this.compareMetrics(baseline[key], current[key], regressions, improvements, threshold, currentPath);
            }
        });
    }
    
    /**
     * Generate comparison report
     */
    generateComparisonReport(testName, comparison) {
        const reportPath = path.join(REPORTS_DIR, `${testName}-comparison-report.md`);
        
        let report = `# Performance Comparison Report: ${testName}

## 📊 Comparison Summary (${new Date().toISOString()})

**Baseline:** ${comparison.baseline.timestamp} (${comparison.baseline.nodeVersion})  
**Current:** ${new Date().toISOString()} (${process.version})

**Overall Status:** ${comparison.summary.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}  
**Regressions:** ${comparison.summary.regressionsCount}  
**Improvements:** ${comparison.summary.improvementsCount}

`;

        if (comparison.regressions.length > 0) {
            report += `## 🚨 Performance Regressions

${comparison.regressions.map(r => 
    `- **${r.metric}**: ${r.current.toFixed(2)} vs ${r.baseline.toFixed(2)} (${r.changePercent} ${r.change > 0 ? 'slower' : 'faster'})`
).join('\n')}

`;
        }

        if (comparison.improvements.length > 0) {
            report += `## 🎉 Performance Improvements

${comparison.improvements.map(i => 
    `- **${i.metric}**: ${i.current.toFixed(2)} vs ${i.baseline.toFixed(2)} (${i.changePercent} ${i.change > 0 ? 'faster' : 'slower'})`
).join('\n')}

`;
        }

        if (comparison.regressions.length === 0 && comparison.improvements.length === 0) {
            report += `## ✅ No Significant Changes

Performance metrics are within acceptable variance (±10%) compared to baseline.

`;
        }

        report += `## 📈 Recommendations

`;

        if (comparison.regressions.length > 0) {
            report += `- **Action Required:** ${comparison.regressions.length} performance regression(s) detected
- Review recent changes that may have impacted performance
- Consider optimizations for regressed metrics
- Update baseline only after addressing regressions

`;
        } else {
            report += `- **Status:** Performance is stable or improved
- Consider updating baseline if improvements are significant and intentional

`;
        }

        report += `---
*Generated by ql.io Performance Testing Framework*
`;

        fs.writeFileSync(reportPath, report);
        console.log(`📊 Comparison report generated: ${reportPath}`);
        
        return reportPath;
    }
    
    /**
     * List all available baselines
     */
    listBaselines() {
        if (!fs.existsSync(BASELINE_DIR)) {
            return [];
        }
        
        return fs.readdirSync(BASELINE_DIR)
            .filter(file => file.endsWith('-baseline.json'))
            .map(file => {
                const testName = file.replace('-baseline.json', '');
                const filePath = path.join(BASELINE_DIR, file);
                const stats = fs.statSync(filePath);
                
                try {
                    const baseline = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    return {
                        testName,
                        file,
                        created: stats.mtime,
                        timestamp: baseline.timestamp,
                        nodeVersion: baseline.nodeVersion,
                        platform: baseline.platform
                    };
                } catch (error) {
                    return {
                        testName,
                        file,
                        created: stats.mtime,
                        error: 'Invalid JSON'
                    };
                }
            });
    }
}

/**
 * CLI Interface
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const manager = new BaselineManager();
    
    switch (command) {
        case 'save':
            const testName = args[1];
            if (!testName) {
                console.error('Usage: baseline-manager.js save <test-name>');
                process.exit(1);
            }
            
            // This would typically be called programmatically with actual results
            console.log(`To save baseline for ${testName}, call saveBaseline() programmatically with test results`);
            break;
            
        case 'compare':
            const compareTestName = args[1];
            if (!compareTestName) {
                console.error('Usage: baseline-manager.js compare <test-name>');
                process.exit(1);
            }
            
            console.log(`To compare against baseline for ${compareTestName}, call compareAgainstBaseline() programmatically`);
            break;
            
        case 'list':
            const baselines = manager.listBaselines();
            
            if (baselines.length === 0) {
                console.log('No baselines found');
            } else {
                console.log('\n📊 Available Performance Baselines:\n');
                baselines.forEach(baseline => {
                    if (baseline.error) {
                        console.log(`❌ ${baseline.testName}: ${baseline.error}`);
                    } else {
                        console.log(`✅ ${baseline.testName}`);
                        console.log(`   Created: ${baseline.created.toISOString()}`);
                        console.log(`   Node.js: ${baseline.nodeVersion}`);
                        console.log(`   Platform: ${baseline.platform}\n`);
                    }
                });
            }
            break;
            
        case 'clean':
            if (fs.existsSync(BASELINE_DIR)) {
                const files = fs.readdirSync(BASELINE_DIR);
                files.forEach(file => {
                    fs.unlinkSync(path.join(BASELINE_DIR, file));
                });
                console.log(`🧹 Cleaned ${files.length} baseline files`);
            } else {
                console.log('No baselines to clean');
            }
            break;
            
        default:
            console.log(`
ql.io Performance Baseline Manager

Usage: node baseline-manager.js <command> [options]

Commands:
  save <test-name>     Save current results as baseline (programmatic use)
  compare <test-name>  Compare against baseline (programmatic use)
  list                 List all available baselines
  clean                Remove all baseline files

Examples:
  node baseline-manager.js list
  node baseline-manager.js clean
`);
            break;
    }
}

// Export for programmatic use
module.exports = BaselineManager;

// Run CLI if called directly
if (require.main === module) {
    main();
}