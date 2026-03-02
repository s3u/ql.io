#!/usr/bin/env node

/**
 * Security Test Suite for ql.io AWS Serverless Deployment
 * 
 * This script validates that no sensitive information is exposed
 * in source control, deployment logs, or client-side storage.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, patterns, description) {
    if (!fs.existsSync(filePath)) {
        log(`⚠️  File not found: ${filePath}`, 'yellow');
        return true; // Not found is OK for security
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    patterns.forEach(pattern => {
        const regex = new RegExp(pattern.regex, 'gi');
        const matches = content.match(regex);
        if (matches) {
            issues.push({
                pattern: pattern.name,
                matches: matches.length,
                description: pattern.description
            });
        }
    });

    if (issues.length > 0) {
        log(`❌ ${description}: ${filePath}`, 'red');
        issues.forEach(issue => {
            log(`   - ${issue.pattern}: ${issue.matches} matches (${issue.description})`, 'red');
        });
        return false;
    } else {
        log(`✅ ${description}: ${filePath}`, 'green');
        return true;
    }
}

function checkDirectory(dirPath, patterns, description, extensions = ['.js', '.json', '.md', '.yml', '.yaml', '.sh']) {
    if (!fs.existsSync(dirPath)) {
        log(`⚠️  Directory not found: ${dirPath}`, 'yellow');
        return true;
    }

    let allPassed = true;
    const files = fs.readdirSync(dirPath, { recursive: true });

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
            const passed = checkFile(filePath, patterns, description);
            allPassed = allPassed && passed;
        }
    });

    return allPassed;
}

// Security patterns to detect
const securityPatterns = [
    {
        name: 'API Keys',
        regex: 'AKIA[0-9A-Z]{16}|[0-9a-zA-Z/+]{40}==?',
        description: 'AWS API keys or similar base64 encoded secrets'
    },
    {
        name: 'AWS Secret Keys',
        regex: '[0-9a-zA-Z/+]{40}',
        description: 'Potential AWS secret access keys'
    },
    {
        name: 'Private Keys',
        regex: '-----BEGIN [A-Z ]+PRIVATE KEY-----',
        description: 'Private key headers'
    },
    {
        name: 'Passwords',
        regex: 'password["\']?\\s*[:=]\\s*["\'][^"\'\\s]{8,}',
        description: 'Hardcoded passwords'
    },
    {
        name: 'Tokens',
        regex: 'token["\']?\\s*[:=]\\s*["\'][^"\'\\s]{20,}',
        description: 'Authentication tokens'
    }
];

// Specific patterns for deployment files
const deploymentPatterns = [
    {
        name: 'API Key Values',
        regex: 'apiKey["\']?\\s*[:=]\\s*["\'][^"\'\\s]{20,}',
        description: 'API key values in deployment files'
    },
    {
        name: 'Console API Key Output',
        regex: 'API_KEY_VALUE=\\$\\([^)]+\\)',
        description: 'API key value extraction in scripts'
    }
];

// Console-specific patterns
const consolePatterns = [
    {
        name: 'LocalStorage API Keys',
        regex: 'localStorage\\.setItem\\([^)]*apiKey[^)]*\\)',
        description: 'API keys stored in localStorage'
    },
    {
        name: 'Hardcoded API URLs',
        regex: 'https://[a-z0-9]+\\.execute-api\\.[a-z0-9-]+\\.amazonaws\\.com',
        description: 'Hardcoded API Gateway URLs'
    }
];

async function runSecurityTests() {
    log('🔒 ql.io AWS Serverless Security Test Suite', 'blue');
    log('=' .repeat(50), 'blue');
    
    let allTestsPassed = true;

    // Test 1: Check source files for secrets
    log('\n📁 Testing source files for hardcoded secrets...', 'blue');
    const sourcesPassed = checkDirectory('.', securityPatterns, 'Source files');
    allTestsPassed = allTestsPassed && sourcesPassed;

    // Test 2: Check deployment scripts specifically
    log('\n🚀 Testing deployment scripts...', 'blue');
    const deploymentFiles = [
        'aws/deploy.sh',
        'aws/deploy-sequential.sh',
        'aws/cleanup.sh'
    ];
    
    deploymentFiles.forEach(file => {
        const passed = checkFile(file, deploymentPatterns, 'Deployment script');
        allTestsPassed = allTestsPassed && passed;
    });

    // Test 3: Check console files
    log('\n🌐 Testing console UI files...', 'blue');
    const consolePassed = checkFile('aws/console/index.html', consolePatterns, 'Console UI');
    allTestsPassed = allTestsPassed && consolePassed;

    // Test 4: Check for deployment artifacts
    log('\n📄 Checking for sensitive deployment artifacts...', 'blue');
    const sensitiveFiles = [
        'aws/deployment-info.json',
        'aws/.aws-sam/',
        '.env',
        '.env.local',
        'config/production.json'
    ];

    sensitiveFiles.forEach(file => {
        if (fs.existsSync(file)) {
            log(`❌ Sensitive file found in source control: ${file}`, 'red');
            allTestsPassed = false;
        } else {
            log(`✅ Sensitive file properly excluded: ${file}`, 'green');
        }
    });

    // Test 5: Check .gitignore
    log('\n🚫 Validating .gitignore configuration...', 'blue');
    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    const requiredIgnores = [
        'aws/deployment-info.json',
        'aws/.aws-sam/',
        '*.log'
    ];

    requiredIgnores.forEach(pattern => {
        if (gitignoreContent.includes(pattern)) {
            log(`✅ .gitignore includes: ${pattern}`, 'green');
        } else {
            log(`❌ .gitignore missing: ${pattern}`, 'red');
            allTestsPassed = false;
        }
    });

    // Test 6: Check GitHub Actions workflow
    log('\n⚙️  Testing GitHub Actions workflow security...', 'blue');
    const workflowFile = '.github/workflows/aws-deploy.yml';
    if (fs.existsSync(workflowFile)) {
        const workflowContent = fs.readFileSync(workflowFile, 'utf8');
        
        // Check for secure secret usage
        if (workflowContent.includes('${{ secrets.AWS_ACCESS_KEY_ID }}')) {
            log('✅ GitHub Actions uses secrets for AWS credentials', 'green');
        } else {
            log('❌ GitHub Actions not using secrets for AWS credentials', 'red');
            allTestsPassed = false;
        }

        // Check that API keys are not logged
        if (!workflowContent.includes('echo') || !workflowContent.includes('API_KEY')) {
            log('✅ GitHub Actions does not log API keys', 'green');
        } else {
            // More specific check
            const apiKeyEchoPattern = /echo.*API_KEY.*\$/;
            if (!apiKeyEchoPattern.test(workflowContent)) {
                log('✅ GitHub Actions does not log API key values', 'green');
            } else {
                log('❌ GitHub Actions may be logging API key values', 'red');
                allTestsPassed = false;
            }
        }
    } else {
        log('⚠️  GitHub Actions workflow not found', 'yellow');
    }

    // Test 7: Validate SAM template security
    log('\n📋 Testing SAM template security...', 'blue');
    const templateFile = 'aws/template.yaml';
    if (fs.existsSync(templateFile)) {
        const templateContent = fs.readFileSync(templateFile, 'utf8');
        
        // Check for hardcoded values
        const hardcodedPatterns = [
            /BucketName:\s*['"]\w+['"]/, // Hardcoded bucket names
            /Value:\s*['"]\w{20,}['"]/, // Hardcoded long values
        ];

        let templateSecure = true;
        hardcodedPatterns.forEach((pattern, index) => {
            if (pattern.test(templateContent)) {
                log(`❌ SAM template may contain hardcoded values (pattern ${index + 1})`, 'red');
                templateSecure = false;
            }
        });

        if (templateSecure) {
            log('✅ SAM template appears secure', 'green');
        }
        allTestsPassed = allTestsPassed && templateSecure;
    }

    // Final results
    log('\n' + '=' .repeat(50), 'blue');
    if (allTestsPassed) {
        log('🎉 All security tests passed!', 'green');
        log('✅ No sensitive information detected in source control', 'green');
        log('✅ Deployment scripts follow security best practices', 'green');
        log('✅ Console UI implements secure credential handling', 'green');
        process.exit(0);
    } else {
        log('❌ Security tests failed!', 'red');
        log('🔧 Please review and fix the issues above before deployment', 'yellow');
        process.exit(1);
    }
}

// Run the tests
runSecurityTests().catch(error => {
    log(`💥 Test suite error: ${error.message}`, 'red');
    process.exit(1);
});