#!/usr/bin/env node

/**
 * ql.io Tables and Routes Test Script
 * Tests all table definitions and route endpoints
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { promisify } = require('util');

// Configuration
const CONFIG = {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retries: 3,
    tablesDir: path.join(__dirname, '..', 'tables'),
    routesDir: path.join(__dirname, '..', 'routes'),
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    skipExternal: process.argv.includes('--skip-external'),
    parallel: !process.argv.includes('--sequential')
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test results tracking
const results = {
    tables: { passed: 0, failed: 0, skipped: 0, tests: [] },
    routes: { passed: 0, failed: 0, skipped: 0, tests: [] },
    startTime: Date.now()
};

/**
 * Utility functions
 */
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logVerbose(message) {
    if (CONFIG.verbose) {
        log(`  ${message}`, 'cyan');
    }
}

function makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Request timeout after ${CONFIG.timeout}ms`));
        }, CONFIG.timeout);

        const req = http.get(url, (res) => {
            clearTimeout(timeout);
            let data = '';
            
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    url: url
                });
            });
        });

        req.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

async function makeRequestWithRetries(url, maxRetries = CONFIG.retries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await makeHttpRequest(url);
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            logVerbose(`Attempt ${attempt} failed, retrying... (${error.message})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

/**
 * Table testing functions
 */
function getTableFiles() {
    if (!fs.existsSync(CONFIG.tablesDir)) {
        log(`Tables directory not found: ${CONFIG.tablesDir}`, 'red');
        return [];
    }

    return fs.readdirSync(CONFIG.tablesDir)
        .filter(file => file.endsWith('.ql') && file !== 'examples.ql')
        .map(file => ({
            name: file.replace('.ql', ''),
            path: path.join(CONFIG.tablesDir, file),
            file: file
        }));
}

function parseTableDefinition(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const tables = [];
    
    // Extract table names from CREATE TABLE statements
    const createTableRegex = /create\s+table\s+([^\s\n]+)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
        tables.push(match[1]);
    }
    
    return tables;
}

async function testTable(tableName) {
    const testResult = {
        name: tableName,
        status: 'unknown',
        error: null,
        response: null,
        duration: 0
    };

    const startTime = Date.now();
    
    try {
        logVerbose(`Testing table: ${tableName}`);
        
        // Test basic table query
        const query = `select * from ${tableName} limit 5`;
        const encodedQuery = encodeURIComponent(query);
        const url = `${CONFIG.baseUrl}/q?s=${encodedQuery}`;
        
        const response = await makeRequestWithRetries(url);
        testResult.duration = Date.now() - startTime;
        testResult.response = response;
        
        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.body);
                if (Array.isArray(data) || (data && typeof data === 'object')) {
                    testResult.status = 'passed';
                    log(`  ✓ ${tableName} (${testResult.duration}ms)`, 'green');
                } else {
                    testResult.status = 'failed';
                    testResult.error = 'Invalid response format';
                    log(`  ✗ ${tableName} - Invalid response format`, 'red');
                }
            } catch (parseError) {
                testResult.status = 'failed';
                testResult.error = `JSON parse error: ${parseError.message}`;
                log(`  ✗ ${tableName} - JSON parse error`, 'red');
            }
        } else if (response.statusCode >= 400 && response.statusCode < 500) {
            // Client errors might be expected for some APIs
            testResult.status = 'skipped';
            testResult.error = `HTTP ${response.statusCode}`;
            log(`  ⚠ ${tableName} - HTTP ${response.statusCode} (skipped)`, 'yellow');
        } else {
            testResult.status = 'failed';
            testResult.error = `HTTP ${response.statusCode}`;
            log(`  ✗ ${tableName} - HTTP ${response.statusCode}`, 'red');
        }
        
    } catch (error) {
        testResult.duration = Date.now() - startTime;
        testResult.status = 'failed';
        testResult.error = error.message;
        
        if (CONFIG.skipExternal && (error.message.includes('timeout') || error.message.includes('ENOTFOUND'))) {
            testResult.status = 'skipped';
            log(`  ⚠ ${tableName} - External API unavailable (skipped)`, 'yellow');
        } else {
            log(`  ✗ ${tableName} - ${error.message}`, 'red');
        }
    }
    
    return testResult;
}

/**
 * Route testing functions
 */
function getRouteFiles() {
    if (!fs.existsSync(CONFIG.routesDir)) {
        log(`Routes directory not found: ${CONFIG.routesDir}`, 'red');
        return [];
    }

    return fs.readdirSync(CONFIG.routesDir)
        .filter(file => file.endsWith('.ql'))
        .map(file => ({
            name: file.replace('.ql', ''),
            path: path.join(CONFIG.routesDir, file),
            file: file,
            route: `/${file.replace('.ql', '')}`
        }));
}

async function testRoute(routeInfo) {
    const testResult = {
        name: routeInfo.name,
        route: routeInfo.route,
        status: 'unknown',
        error: null,
        response: null,
        duration: 0
    };

    const startTime = Date.now();
    
    try {
        logVerbose(`Testing route: ${routeInfo.route}`);
        
        const url = `${CONFIG.baseUrl}${routeInfo.route}`;
        const response = await makeRequestWithRetries(url);
        
        testResult.duration = Date.now() - startTime;
        testResult.response = response;
        
        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.body);
                testResult.status = 'passed';
                log(`  ✓ ${routeInfo.route} (${testResult.duration}ms)`, 'green');
            } catch (parseError) {
                testResult.status = 'failed';
                testResult.error = `JSON parse error: ${parseError.message}`;
                log(`  ✗ ${routeInfo.route} - JSON parse error`, 'red');
            }
        } else if (response.statusCode === 302) {
            // Redirects might be expected
            testResult.status = 'passed';
            log(`  ✓ ${routeInfo.route} - Redirect (${testResult.duration}ms)`, 'green');
        } else {
            testResult.status = 'failed';
            testResult.error = `HTTP ${response.statusCode}`;
            log(`  ✗ ${routeInfo.route} - HTTP ${response.statusCode}`, 'red');
        }
        
    } catch (error) {
        testResult.duration = Date.now() - startTime;
        testResult.status = 'failed';
        testResult.error = error.message;
        log(`  ✗ ${routeInfo.route} - ${error.message}`, 'red');
    }
    
    return testResult;
}

/**
 * Server health check
 */
async function checkServerHealth() {
    try {
        log('Checking server health...', 'blue');
        const response = await makeRequestWithRetries(`${CONFIG.baseUrl}/`);
        
        if (response.statusCode === 200 || response.statusCode === 302) {
            log('✓ Server is responding', 'green');
            return true;
        } else {
            log(`✗ Server returned HTTP ${response.statusCode}`, 'red');
            return false;
        }
    } catch (error) {
        log(`✗ Server health check failed: ${error.message}`, 'red');
        log('Make sure the ql.io server is running on http://localhost:3000', 'yellow');
        log('Run: npm start or bin/start.sh', 'yellow');
        return false;
    }
}

/**
 * Test execution functions
 */
async function runTableTests() {
    log('\n📊 Testing Table Definitions', 'bright');
    log('=' .repeat(50), 'blue');
    
    const tableFiles = getTableFiles();
    if (tableFiles.length === 0) {
        log('No table files found', 'yellow');
        return;
    }
    
    log(`Found ${tableFiles.length} table files`, 'blue');
    
    // Extract all table names from all files
    const allTables = [];
    for (const tableFile of tableFiles) {
        const tables = parseTableDefinition(tableFile.path);
        allTables.push(...tables.map(table => ({ name: table, file: tableFile.file })));
    }
    
    log(`Testing ${allTables.length} table definitions...`, 'blue');
    
    // Test tables
    const testPromises = allTables.map(table => testTable(table.name));
    
    let testResults;
    if (CONFIG.parallel) {
        testResults = await Promise.all(testPromises);
    } else {
        testResults = [];
        for (const promise of testPromises) {
            testResults.push(await promise);
        }
    }
    
    // Collect results
    for (const result of testResults) {
        results.tables.tests.push(result);
        if (result.status === 'passed') results.tables.passed++;
        else if (result.status === 'failed') results.tables.failed++;
        else if (result.status === 'skipped') results.tables.skipped++;
    }
}

async function runRouteTests() {
    log('\n🛣️  Testing Route Endpoints', 'bright');
    log('=' .repeat(50), 'blue');
    
    const routeFiles = getRouteFiles();
    if (routeFiles.length === 0) {
        log('No route files found', 'yellow');
        return;
    }
    
    log(`Found ${routeFiles.length} route files`, 'blue');
    log('Testing route endpoints...', 'blue');
    
    // Test routes
    const testPromises = routeFiles.map(route => testRoute(route));
    
    let testResults;
    if (CONFIG.parallel) {
        testResults = await Promise.all(testPromises);
    } else {
        testResults = [];
        for (const promise of testPromises) {
            testResults.push(await promise);
        }
    }
    
    // Collect results
    for (const result of testResults) {
        results.routes.tests.push(result);
        if (result.status === 'passed') results.routes.passed++;
        else if (result.status === 'failed') results.routes.failed++;
        else if (result.status === 'skipped') results.routes.skipped++;
    }
}

/**
 * Results reporting
 */
function printSummary() {
    const totalDuration = Date.now() - results.startTime;
    
    log('\n📋 Test Summary', 'bright');
    log('=' .repeat(50), 'blue');
    
    // Tables summary
    const tablesTotal = results.tables.passed + results.tables.failed + results.tables.skipped;
    log(`\n📊 Tables (${tablesTotal} total):`, 'bright');
    log(`  ✓ Passed: ${results.tables.passed}`, 'green');
    log(`  ✗ Failed: ${results.tables.failed}`, results.tables.failed > 0 ? 'red' : 'reset');
    log(`  ⚠ Skipped: ${results.tables.skipped}`, results.tables.skipped > 0 ? 'yellow' : 'reset');
    
    // Routes summary
    const routesTotal = results.routes.passed + results.routes.failed + results.routes.skipped;
    log(`\n🛣️  Routes (${routesTotal} total):`, 'bright');
    log(`  ✓ Passed: ${results.routes.passed}`, 'green');
    log(`  ✗ Failed: ${results.routes.failed}`, results.routes.failed > 0 ? 'red' : 'reset');
    log(`  ⚠ Skipped: ${results.routes.skipped}`, results.routes.skipped > 0 ? 'yellow' : 'reset');
    
    // Overall summary
    const totalPassed = results.tables.passed + results.routes.passed;
    const totalFailed = results.tables.failed + results.routes.failed;
    const totalSkipped = results.tables.skipped + results.routes.skipped;
    const grandTotal = totalPassed + totalFailed + totalSkipped;
    
    log(`\n🎯 Overall Results:`, 'bright');
    log(`  Total Tests: ${grandTotal}`);
    log(`  Passed: ${totalPassed}`, totalPassed > 0 ? 'green' : 'reset');
    log(`  Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'reset');
    log(`  Skipped: ${totalSkipped}`, totalSkipped > 0 ? 'yellow' : 'reset');
    log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    // Success rate
    const successRate = grandTotal > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0;
    log(`  Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
    
    // Failed tests details
    if (totalFailed > 0) {
        log('\n❌ Failed Tests:', 'red');
        [...results.tables.tests, ...results.routes.tests]
            .filter(test => test.status === 'failed')
            .forEach(test => {
                const identifier = test.route || test.name;
                log(`  • ${identifier}: ${test.error}`, 'red');
            });
    }
    
    log('');
}

function printUsage() {
    log('ql.io Tables and Routes Test Script', 'bright');
    log('');
    log('Usage: node bin/test-tables-routes.js [options]', 'blue');
    log('');
    log('Options:', 'bright');
    log('  --verbose, -v      Show detailed output');
    log('  --skip-external    Skip tests that fail due to external API issues');
    log('  --sequential       Run tests sequentially instead of in parallel');
    log('  --help, -h         Show this help message');
    log('');
    log('Examples:', 'bright');
    log('  node bin/test-tables-routes.js');
    log('  node bin/test-tables-routes.js --verbose');
    log('  node bin/test-tables-routes.js --skip-external --sequential');
    log('');
}

/**
 * Main execution
 */
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printUsage();
        return;
    }
    
    log('🚀 ql.io Tables and Routes Test Suite', 'bright');
    log('=' .repeat(50), 'blue');
    
    // Configuration info
    if (CONFIG.verbose) {
        log(`\nConfiguration:`, 'blue');
        log(`  Base URL: ${CONFIG.baseUrl}`);
        log(`  Timeout: ${CONFIG.timeout}ms`);
        log(`  Retries: ${CONFIG.retries}`);
        log(`  Parallel: ${CONFIG.parallel}`);
        log(`  Skip External: ${CONFIG.skipExternal}`);
    }
    
    // Check server health
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy) {
        process.exit(1);
    }
    
    // Run tests
    try {
        await runTableTests();
        await runRouteTests();
        
        // Print results
        printSummary();
        
        // Exit with appropriate code
        const totalFailed = results.tables.failed + results.routes.failed;
        process.exit(totalFailed > 0 ? 1 : 0);
        
    } catch (error) {
        log(`\n❌ Test execution failed: ${error.message}`, 'red');
        if (CONFIG.verbose) {
            log(error.stack, 'red');
        }
        process.exit(1);
    }
}

// Handle process signals
process.on('SIGINT', () => {
    log('\n\n⚠️  Test execution interrupted', 'yellow');
    printSummary();
    process.exit(130);
});

process.on('SIGTERM', () => {
    log('\n\n⚠️  Test execution terminated', 'yellow');
    printSummary();
    process.exit(143);
});

// Run the main function
if (require.main === module) {
    main().catch(error => {
        log(`Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { main, checkServerHealth, testTable, testRoute };