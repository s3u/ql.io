#!/usr/bin/env node

/**
 * Critical Code Review Script
 * 
 * This script performs an extremely thorough and critical review of git changes.
 * It acts like an annoying but thorough code reviewer who catches everything.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CriticalCodeReviewer {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.suggestions = [];
        this.criticalIssues = [];
    }

    async performReview() {
        console.log('🔍 STARTING CRITICAL CODE REVIEW...\n');
        
        try {
            // Get git diff of staged changes
            const stagedDiff = this.getStagedChanges();
            const changedFiles = this.getChangedFiles();
            
            console.log(`📁 Reviewing ${changedFiles.length} changed files...\n`);
            
            // Perform various code quality checks
            this.reviewCodeQuality(changedFiles, stagedDiff);
            this.reviewSecurity(changedFiles, stagedDiff);
            this.reviewPerformance(changedFiles, stagedDiff);
            this.reviewTestCoverage(changedFiles);
            this.reviewDocumentation(changedFiles);
            this.reviewArchitecture(changedFiles, stagedDiff);
            
            // Generate review report
            this.generateReviewReport();
            
            // Fail if critical issues found
            if (this.criticalIssues.length > 0) {
                console.error('\n❌ CRITICAL ISSUES FOUND - COMMIT BLOCKED!\n');
                process.exit(1);
            }
            
            console.log('\n✅ Code review passed (somehow)...\n');
            
        } catch (error) {
            console.error('💥 Code review failed:', error.message);
            process.exit(1);
        }
    }

    getStagedChanges() {
        try {
            return execSync('git diff --cached', { encoding: 'utf8' });
        } catch (error) {
            throw new Error('Failed to get staged changes');
        }
    }

    getChangedFiles() {
        try {
            const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
            return output.trim().split('\n').filter(file => file.length > 0);
        } catch (error) {
            return [];
        }
    }

    reviewCodeQuality(files, diff) {
        console.log('🧐 REVIEWING CODE QUALITY (prepare for pain)...');
        
        files.forEach(file => {
            if (!fs.existsSync(file)) return;
            
            const content = fs.readFileSync(file, 'utf8');
            const ext = path.extname(file);
            
            if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
                this.reviewJavaScriptQuality(file, content);
            }
            
            if (['.md', '.txt'].includes(ext)) {
                this.reviewDocumentationQuality(file, content);
            }
        });
        
        // Check for common anti-patterns in diff
        this.checkAntiPatterns(diff);
    }

    reviewJavaScriptQuality(file, content) {
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            
            // Check for console.log (the horror!)
            if (line.includes('console.log') && !file.includes('test')) {
                this.issues.push(`${file}:${lineNum} - Really? console.log? What is this, 2010? Use proper logging!`);
            }
            
            // Check for var usage
            if (line.match(/\bvar\s+/)) {
                this.issues.push(`${file}:${lineNum} - Using 'var'? Did you time travel from ES5? Use 'const' or 'let'!`);
            }
            
            // Check for == instead of ===
            if (line.includes('==') && !line.includes('===') && !line.includes('!==')) {
                this.issues.push(`${file}:${lineNum} - Loose equality (==)? Are you trying to introduce bugs? Use ===!`);
            }
            
            // Check for long lines
            if (line.length > 120) {
                this.warnings.push(`${file}:${lineNum} - Line too long (${line.length} chars). Break it up, this isn't a novel!`);
            }
            
            // Check for TODO comments
            if (line.includes('TODO') || line.includes('FIXME')) {
                this.warnings.push(`${file}:${lineNum} - TODO/FIXME found. Stop procrastinating and fix it!`);
            }
            
            // Check for empty catch blocks
            if (line.trim() === 'catch (e) {}' || line.trim() === 'catch (error) {}') {
                this.criticalIssues.push(`${file}:${lineNum} - Empty catch block! This is how bugs hide. Handle the error properly!`);
            }
            
            // Check for magic numbers
            const magicNumberRegex = /\b\d{2,}\b/;
            if (magicNumberRegex.test(line) && !line.includes('//')) {
                this.warnings.push(`${file}:${lineNum} - Magic number detected. Use named constants, not random numbers!`);
            }
            
            // Check for function complexity (rough estimate)
            if (line.includes('function') || line.includes('=>')) {
                const functionContent = this.extractFunction(content, index);
                if (functionContent && functionContent.split('\n').length > 50) {
                    this.issues.push(`${file}:${lineNum} - Function is too long (${functionContent.split('\n').length} lines). Break it down!`);
                }
            }
        });
        
        // Check for missing semicolons (if not using a formatter)
        const missingSemicolons = content.match(/\n[^\/\*\s].*[^;{}\s]\s*\n/g);
        if (missingSemicolons && missingSemicolons.length > 0) {
            this.warnings.push(`${file} - Potential missing semicolons detected. Use a linter!`);
        }
    }

    reviewSecurity(files, diff) {
        console.log('🔒 REVIEWING SECURITY (looking for vulnerabilities)...');
        
        files.forEach(file => {
            if (!fs.existsSync(file)) return;
            
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for potential security issues
            if (content.includes('eval(')) {
                this.criticalIssues.push(`${file} - eval() usage detected! This is a security nightmare!`);
            }
            
            if (content.includes('innerHTML') && !file.includes('test')) {
                this.warnings.push(`${file} - innerHTML usage. Potential XSS risk. Use textContent or proper sanitization!`);
            }
            
            if (content.match(/password.*=.*['"]/i)) {
                this.criticalIssues.push(`${file} - Hardcoded password detected! Never commit passwords!`);
            }
            
            if (content.match(/api[_-]?key.*=.*['"]/i)) {
                this.criticalIssues.push(`${file} - API key in source code! Use environment variables!`);
            }
            
            if (content.includes('http://') && !file.includes('test') && !file.includes('demo')) {
                this.warnings.push(`${file} - HTTP URL detected. Use HTTPS for security!`);
            }
        });
    }

    reviewPerformance(files, diff) {
        console.log('⚡ REVIEWING PERFORMANCE (finding your inefficiencies)...');
        
        files.forEach(file => {
            if (!fs.existsSync(file)) return;
            
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for performance anti-patterns
            if (content.includes('for (') && content.includes('.length')) {
                const forLoops = content.match(/for\s*\([^)]*\.length[^)]*\)/g);
                if (forLoops) {
                    this.warnings.push(`${file} - Accessing .length in for loop condition. Cache it for better performance!`);
                }
            }
            
            if (content.includes('document.getElementById') && content.match(/document\.getElementById.*document\.getElementById/)) {
                this.warnings.push(`${file} - Multiple DOM queries. Cache DOM elements for better performance!`);
            }
            
            if (content.includes('JSON.parse(JSON.stringify(')) {
                this.issues.push(`${file} - Deep cloning with JSON.parse/stringify? Use a proper cloning library!`);
            }
            
            // Check for synchronous operations that should be async
            if (content.includes('fs.readFileSync') && !file.includes('test') && !file.includes('script')) {
                this.warnings.push(`${file} - Synchronous file operations. Consider using async versions!`);
            }
        });
    }

    reviewTestCoverage(files) {
        console.log('🧪 REVIEWING TEST COVERAGE (where are your tests?)...');
        
        const codeFiles = files.filter(f => 
            ['.js', '.ts', '.jsx', '.tsx'].includes(path.extname(f)) && 
            !f.includes('test') && 
            !f.includes('spec') &&
            !f.includes('node_modules')
        );
        
        const testFiles = files.filter(f => 
            f.includes('test') || f.includes('spec')
        );
        
        if (codeFiles.length > 0 && testFiles.length === 0) {
            this.issues.push('No test files in this commit! Are you allergic to testing?');
        }
        
        // Check if new functions have tests
        codeFiles.forEach(file => {
            if (!fs.existsSync(file)) return;
            
            const content = fs.readFileSync(file, 'utf8');
            const functions = content.match(/function\s+\w+|const\s+\w+\s*=.*=>/g);
            
            if (functions && functions.length > 0) {
                const testFile = this.findTestFile(file);
                if (!testFile) {
                    this.warnings.push(`${file} - New functions added but no corresponding test file found!`);
                }
            }
        });
    }

    reviewDocumentation(files) {
        console.log('📚 REVIEWING DOCUMENTATION (probably non-existent)...');
        
        files.forEach(file => {
            if (!fs.existsSync(file)) return;
            
            const content = fs.readFileSync(file, 'utf8');
            const ext = path.extname(file);
            
            if (['.js', '.ts'].includes(ext)) {
                // Check for JSDoc comments on functions
                const functions = content.match(/(?:export\s+)?(?:async\s+)?function\s+\w+/g);
                const jsdocs = content.match(/\/\*\*[\s\S]*?\*\//g);
                
                if (functions && functions.length > 0 && (!jsdocs || jsdocs.length < functions.length)) {
                    this.warnings.push(`${file} - Functions without JSDoc comments. Document your code!`);
                }
                
                // Check for complex functions without comments
                const lines = content.split('\n');
                let inFunction = false;
                let functionLines = 0;
                let hasComments = false;
                
                lines.forEach(line => {
                    if (line.includes('function') || line.includes('=>')) {
                        inFunction = true;
                        functionLines = 0;
                        hasComments = false;
                    }
                    
                    if (inFunction) {
                        functionLines++;
                        if (line.includes('//') || line.includes('/*')) {
                            hasComments = true;
                        }
                        
                        if (line.includes('}') && functionLines > 20 && !hasComments) {
                            this.warnings.push(`${file} - Complex function without comments. Explain your logic!`);
                            inFunction = false;
                        }
                    }
                });
            }
        });
    }

    reviewArchitecture(files, diff) {
        console.log('🏗️  REVIEWING ARCHITECTURE (checking your design decisions)...');
        
        // Check for circular dependencies
        const jsFiles = files.filter(f => ['.js', '.ts'].includes(path.extname(f)));
        
        jsFiles.forEach(file => {
            if (!fs.existsSync(file)) return;
            
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for overly complex imports
            const imports = content.match(/require\(.*\)|import.*from/g);
            if (imports && imports.length > 20) {
                this.warnings.push(`${file} - Too many imports (${imports.length}). Consider refactoring!`);
            }
            
            // Check for god objects/classes
            const classMatch = content.match(/class\s+\w+/);
            if (classMatch) {
                const methods = content.match(/\w+\s*\([^)]*\)\s*{/g);
                if (methods && methods.length > 15) {
                    this.issues.push(`${file} - Class has too many methods (${methods.length}). Break it down!`);
                }
            }
            
            // Check for deep nesting
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                const indentation = line.match(/^\s*/)[0].length;
                if (indentation > 24) { // More than 6 levels of nesting
                    this.warnings.push(`${file}:${index + 1} - Deep nesting detected. Refactor for readability!`);
                }
            });
        });
    }

    checkAntiPatterns(diff) {
        // Check for common anti-patterns in the diff
        if (diff.includes('+    console.log')) {
            this.issues.push('Adding console.log statements. Use proper logging instead!');
        }
        
        if (diff.includes('+ *') && diff.includes('TODO')) {
            this.warnings.push('Adding TODO comments. Either implement it now or create a proper issue!');
        }
        
        if (diff.includes('catch (e) {}')) {
            this.criticalIssues.push('Empty catch blocks added. This is unacceptable!');
        }
    }

    extractFunction(content, startIndex) {
        const lines = content.split('\n');
        let braceCount = 0;
        let functionContent = '';
        let started = false;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            functionContent += line + '\n';
            
            if (line.includes('{')) {
                started = true;
                braceCount += (line.match(/{/g) || []).length;
            }
            
            if (started && line.includes('}')) {
                braceCount -= (line.match(/}/g) || []).length;
                if (braceCount <= 0) break;
            }
        }
        
        return functionContent;
    }

    findTestFile(file) {
        const dir = path.dirname(file);
        const name = path.basename(file, path.extname(file));
        
        const possibleTestFiles = [
            path.join(dir, `${name}.test.js`),
            path.join(dir, `${name}.spec.js`),
            path.join(dir, 'test', `${name}.test.js`),
            path.join(dir, '__tests__', `${name}.test.js`)
        ];
        
        return possibleTestFiles.find(f => fs.existsSync(f));
    }

    generateReviewReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 CRITICAL CODE REVIEW REPORT');
        console.log('='.repeat(80));
        
        if (this.criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES (MUST FIX):');
            this.criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`));
        }
        
        if (this.issues.length > 0) {
            console.log('\n⚠️  ISSUES (SHOULD FIX):');
            this.issues.forEach(issue => console.log(`   🔸 ${issue}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n💡 WARNINGS (CONSIDER FIXING):');
            this.warnings.forEach(warning => console.log(`   🔹 ${warning}`));
        }
        
        if (this.suggestions.length > 0) {
            console.log('\n💭 SUGGESTIONS:');
            this.suggestions.forEach(suggestion => console.log(`   💡 ${suggestion}`));
        }
        
        console.log('\n' + '='.repeat(80));
        console.log(`📊 REVIEW SUMMARY:`);
        console.log(`   Critical Issues: ${this.criticalIssues.length}`);
        console.log(`   Issues: ${this.issues.length}`);
        console.log(`   Warnings: ${this.warnings.length}`);
        console.log(`   Suggestions: ${this.suggestions.length}`);
        console.log('='.repeat(80));
        
        if (this.criticalIssues.length === 0 && this.issues.length === 0) {
            console.log('\n🎉 Congratulations! Your code passed the brutal review!');
            console.log('   (I\'m honestly surprised...)');
        } else if (this.criticalIssues.length === 0) {
            console.log('\n😤 Your code is acceptable, but barely...');
            console.log('   Fix those issues before I change my mind!');
        }
    }
}

// Run the review
const reviewer = new CriticalCodeReviewer();
reviewer.performReview().catch(error => {
    console.error('💥 Review failed:', error);
    process.exit(1);
});