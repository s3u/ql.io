#!/usr/bin/env node

/**
 * Commit Message Enhancement Script
 * 
 * This script analyzes git changes and enhances the commit message
 * to be more descriptive and follow conventional commit standards.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CommitMessageEnhancer {
    constructor() {
        this.changedFiles = [];
        this.additions = 0;
        this.deletions = 0;
        this.modifications = [];
        this.newFiles = [];
        this.deletedFiles = [];
    }

    async enhanceCommitMessage() {
        console.log('📝 ENHANCING COMMIT MESSAGE...\n');
        
        try {
            // Analyze the changes
            this.analyzeChanges();
            
            // Get current commit message (if any)
            const currentMessage = this.getCurrentCommitMessage();
            
            // Generate enhanced message
            const enhancedMessage = this.generateEnhancedMessage(currentMessage);
            
            // Update the commit message
            this.updateCommitMessage(enhancedMessage);
            
            console.log('✅ Commit message enhanced successfully!\n');
            console.log('📋 New commit message:');
            console.log('─'.repeat(60));
            console.log(enhancedMessage);
            console.log('─'.repeat(60));
            
        } catch (error) {
            console.error('💥 Failed to enhance commit message:', error.message);
            // Don't fail the commit for message enhancement issues
        }
    }

    analyzeChanges() {
        // Get changed files with status
        try {
            const statusOutput = execSync('git diff --cached --name-status', { encoding: 'utf8' });
            const lines = statusOutput.trim().split('\n').filter(line => line.length > 0);
            
            lines.forEach(line => {
                const [status, file] = line.split('\t');
                this.changedFiles.push({ status, file });
                
                switch (status) {
                    case 'A':
                        this.newFiles.push(file);
                        break;
                    case 'D':
                        this.deletedFiles.push(file);
                        break;
                    case 'M':
                        this.modifications.push(file);
                        break;
                }
            });
            
            // Get diff stats
            const diffStats = execSync('git diff --cached --numstat', { encoding: 'utf8' });
            const statLines = diffStats.trim().split('\n').filter(line => line.length > 0);
            
            statLines.forEach(line => {
                const [additions, deletions] = line.split('\t');
                this.additions += parseInt(additions) || 0;
                this.deletions += parseInt(deletions) || 0;
            });
            
        } catch (error) {
            console.warn('Warning: Could not analyze git changes');
        }
    }

    getCurrentCommitMessage() {
        try {
            // Try to get the commit message from COMMIT_EDITMSG
            const commitMsgFile = '.git/COMMIT_EDITMSG';
            if (fs.existsSync(commitMsgFile)) {
                return fs.readFileSync(commitMsgFile, 'utf8').trim();
            }
        } catch (error) {
            // Ignore errors, we'll generate a new message
        }
        return '';
    }

    generateEnhancedMessage(currentMessage) {
        // Analyze the type of changes
        const changeType = this.determineChangeType();
        const scope = this.determineScope();
        const description = this.generateDescription(currentMessage);
        const body = this.generateBody();
        const footer = this.generateFooter();
        
        // Build conventional commit message
        let message = `${changeType}`;
        
        if (scope) {
            message += `(${scope})`;
        }
        
        message += `: ${description}`;
        
        if (body) {
            message += `\n\n${body}`;
        }
        
        if (footer) {
            message += `\n\n${footer}`;
        }
        
        return message;
    }

    determineChangeType() {
        // Analyze files to determine commit type
        const testFiles = this.changedFiles.filter(f => 
            f.file.includes('test') || f.file.includes('spec')
        );
        
        const docFiles = this.changedFiles.filter(f => 
            f.file.endsWith('.md') || f.file.includes('doc')
        );
        
        const configFiles = this.changedFiles.filter(f => 
            f.file.includes('config') || 
            f.file.endsWith('.json') || 
            f.file.endsWith('.yml') || 
            f.file.endsWith('.yaml')
        );
        
        const buildFiles = this.changedFiles.filter(f => 
            f.file.includes('package.json') || 
            f.file.includes('Makefile') || 
            f.file.includes('webpack') ||
            f.file.includes('babel')
        );
        
        // Determine type based on file patterns
        if (this.newFiles.length > 0 && this.modifications.length === 0) {
            return 'feat';
        }
        
        if (testFiles.length > 0 && testFiles.length === this.changedFiles.length) {
            return 'test';
        }
        
        if (docFiles.length > 0 && docFiles.length === this.changedFiles.length) {
            return 'docs';
        }
        
        if (configFiles.length > 0 || buildFiles.length > 0) {
            return 'chore';
        }
        
        if (this.deletedFiles.length > 0) {
            return 'refactor';
        }
        
        // Check for performance-related changes
        if (this.hasPerformanceChanges()) {
            return 'perf';
        }
        
        // Check for bug fixes
        if (this.hasBugFixes()) {
            return 'fix';
        }
        
        // Default to feat for new functionality
        return 'feat';
    }

    determineScope() {
        // Determine scope based on changed files
        const scopes = new Set();
        
        this.changedFiles.forEach(({ file }) => {
            if (file.startsWith('modules/')) {
                const module = file.split('/')[1];
                scopes.add(module);
            } else if (file.startsWith('test/')) {
                scopes.add('test');
            } else if (file.startsWith('docs/')) {
                scopes.add('docs');
            } else if (file.startsWith('bin/')) {
                scopes.add('cli');
            } else if (file.startsWith('aws/')) {
                scopes.add('aws');
            } else if (file.includes('integration')) {
                scopes.add('integration');
            } else if (file.includes('browser')) {
                scopes.add('browser');
            }
        });
        
        if (scopes.size === 1) {
            return Array.from(scopes)[0];
        } else if (scopes.size > 1) {
            return Array.from(scopes).slice(0, 2).join(',');
        }
        
        return null;
    }

    generateDescription(currentMessage) {
        // If there's a current message and it's decent, use it
        if (currentMessage && currentMessage.length > 10 && !this.isGenericMessage(currentMessage)) {
            const firstLine = currentMessage.split('\n')[0];
            // Remove conventional commit prefix if it exists
            return firstLine.replace(/^(feat|fix|docs|style|refactor|test|chore|perf)(\([^)]+\))?: /, '');
        }
        
        // Generate description based on changes
        const descriptions = [];
        
        if (this.newFiles.length > 0) {
            descriptions.push(`add ${this.newFiles.length} new file${this.newFiles.length > 1 ? 's' : ''}`);
        }
        
        if (this.modifications.length > 0) {
            descriptions.push(`update ${this.modifications.length} file${this.modifications.length > 1 ? 's' : ''}`);
        }
        
        if (this.deletedFiles.length > 0) {
            descriptions.push(`remove ${this.deletedFiles.length} file${this.deletedFiles.length > 1 ? 's' : ''}`);
        }
        
        // Make it more specific based on file types
        const specificChanges = this.getSpecificChanges();
        if (specificChanges.length > 0) {
            return specificChanges.join(' and ');
        }
        
        return descriptions.join(' and ') || 'update codebase';
    }

    getSpecificChanges() {
        const changes = [];
        
        // Check for test additions
        const testFiles = this.changedFiles.filter(f => 
            f.file.includes('test') && f.status === 'A'
        );
        if (testFiles.length > 0) {
            changes.push(`add ${testFiles.length} new test${testFiles.length > 1 ? 's' : ''}`);
        }
        
        // Check for integration test changes
        const integrationTests = this.changedFiles.filter(f => 
            f.file.includes('integration') && f.file.includes('test')
        );
        if (integrationTests.length > 0) {
            changes.push('enhance integration test suite');
        }
        
        // Check for browser test changes
        const browserTests = this.changedFiles.filter(f => 
            f.file.includes('browser') && f.file.includes('test')
        );
        if (browserTests.length > 0) {
            changes.push('implement browser automation tests');
        }
        
        // Check for performance improvements
        if (this.hasPerformanceChanges()) {
            changes.push('optimize performance');
        }
        
        // Check for security improvements
        if (this.hasSecurityChanges()) {
            changes.push('enhance security');
        }
        
        // Check for documentation updates
        const docFiles = this.changedFiles.filter(f => f.file.endsWith('.md'));
        if (docFiles.length > 0) {
            changes.push('update documentation');
        }
        
        return changes;
    }

    generateBody() {
        const bodyParts = [];
        
        // Add file change summary
        if (this.changedFiles.length > 3) {
            bodyParts.push(`Changes across ${this.changedFiles.length} files:`);
            
            if (this.newFiles.length > 0) {
                bodyParts.push(`• Added: ${this.newFiles.slice(0, 3).join(', ')}${this.newFiles.length > 3 ? ` (+${this.newFiles.length - 3} more)` : ''}`);
            }
            
            if (this.modifications.length > 0) {
                bodyParts.push(`• Modified: ${this.modifications.slice(0, 3).join(', ')}${this.modifications.length > 3 ? ` (+${this.modifications.length - 3} more)` : ''}`);
            }
            
            if (this.deletedFiles.length > 0) {
                bodyParts.push(`• Deleted: ${this.deletedFiles.join(', ')}`);
            }
        }
        
        // Add impact summary
        const impact = this.generateImpactSummary();
        if (impact) {
            bodyParts.push('');
            bodyParts.push(impact);
        }
        
        return bodyParts.length > 0 ? bodyParts.join('\n') : null;
    }

    generateImpactSummary() {
        const impacts = [];
        
        if (this.hasTestChanges()) {
            impacts.push('• Improves test coverage and reliability');
        }
        
        if (this.hasPerformanceChanges()) {
            impacts.push('• Enhances application performance');
        }
        
        if (this.hasSecurityChanges()) {
            impacts.push('• Strengthens security posture');
        }
        
        if (this.hasDocumentationChanges()) {
            impacts.push('• Improves code documentation');
        }
        
        if (impacts.length > 0) {
            return `Impact:\n${impacts.join('\n')}`;
        }
        
        return null;
    }

    generateFooter() {
        const footerParts = [];
        
        // Add diff stats
        if (this.additions > 0 || this.deletions > 0) {
            footerParts.push(`Stats: +${this.additions} -${this.deletions} lines`);
        }
        
        // Add file count
        footerParts.push(`Files: ${this.changedFiles.length} changed`);
        
        return footerParts.join(' | ');
    }

    hasPerformanceChanges() {
        return this.changedFiles.some(({ file }) => 
            file.includes('performance') || 
            file.includes('benchmark') || 
            file.includes('optimization') ||
            file.includes('cache')
        );
    }

    hasBugFixes() {
        return this.changedFiles.some(({ file }) => 
            file.includes('fix') || 
            file.includes('bug') ||
            file.includes('patch')
        );
    }

    hasSecurityChanges() {
        return this.changedFiles.some(({ file }) => 
            file.includes('security') || 
            file.includes('auth') || 
            file.includes('crypto') ||
            file.includes('sanitiz')
        );
    }

    hasTestChanges() {
        return this.changedFiles.some(({ file }) => 
            file.includes('test') || file.includes('spec')
        );
    }

    hasDocumentationChanges() {
        return this.changedFiles.some(({ file }) => 
            file.endsWith('.md') || file.includes('doc')
        );
    }

    isGenericMessage(message) {
        const genericMessages = [
            'update',
            'fix',
            'changes',
            'wip',
            'work in progress',
            'temp',
            'temporary',
            'test',
            'debug'
        ];
        
        return genericMessages.some(generic => 
            message.toLowerCase().includes(generic) && message.length < 20
        );
    }

    updateCommitMessage(message) {
        try {
            // Write to COMMIT_EDITMSG if it exists
            const commitMsgFile = '.git/COMMIT_EDITMSG';
            if (fs.existsSync(commitMsgFile)) {
                fs.writeFileSync(commitMsgFile, message);
            }
            
            // Also prepare the message for git commit --amend if needed
            fs.writeFileSync('.git/ENHANCED_COMMIT_MSG', message);
            
        } catch (error) {
            console.warn('Warning: Could not update commit message file');
        }
    }
}

// Run the enhancement
const enhancer = new CommitMessageEnhancer();
enhancer.enhanceCommitMessage().catch(error => {
    console.error('💥 Enhancement failed:', error);
    // Don't exit with error for message enhancement
});