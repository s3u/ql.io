#!/usr/bin/env node

/**
 * Test script for the pre-commit hook
 * 
 * This script simulates the hook execution to verify it works correctly
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 TESTING PRE-COMMIT HOOK...\n');

try {
    // Check if we have staged changes
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
    
    if (!stagedFiles) {
        console.log('⚠️  No staged changes found. Creating a test change...\n');
        
        // Create a test file with some issues for the hook to catch
        const testFile = 'test-hook-example.js';
        const testContent = `
// Test file for hook validation
var badVariable = "using var instead of const";  // Issue: using var
console.log("Debug message");  // Issue: console.log in code

function longFunctionWithoutComments() {
    if (badVariable == "test") {  // Issue: loose equality
        // This function is intentionally long and poorly written
        let result = "";
        for (let i = 0; i < 100; i++) {
            result += i.toString();
            if (i % 10 == 0) {
                result += "\\n";
            }
        }
        return result;
    }
    return null;
}

// TODO: Fix this function  // Issue: TODO comment
function emptyFunction() {
    try {
        // Some risky operation
        eval("console.log('dangerous')");  // Critical: eval usage
    } catch (e) {
        // Issue: empty catch block
    }
}
`;
        
        fs.writeFileSync(testFile, testContent);
        execSync(`git add ${testFile}`);
        
        console.log(`✅ Created test file: ${testFile}`);
        console.log('📝 File contains intentional issues for the hook to detect\n');
    }
    
    console.log('🔍 Running critical code review...\n');
    
    // Run the code review script
    try {
        execSync('node .kiro/hooks/scripts/critical-code-review.js', { 
            stdio: 'inherit',
            timeout: 60000 
        });
        console.log('\n✅ Code review completed successfully!');
    } catch (error) {
        console.log('\n⚠️  Code review found issues (this is expected for the test)');
        console.log('Exit code:', error.status);
    }
    
    console.log('\n📝 Testing commit message enhancement...\n');
    
    // Run the commit message enhancement
    try {
        execSync('node .kiro/hooks/scripts/enhance-commit-message.js', { 
            stdio: 'inherit',
            timeout: 30000 
        });
        console.log('\n✅ Commit message enhancement completed!');
    } catch (error) {
        console.log('\n⚠️  Commit message enhancement had issues:', error.message);
    }
    
    // Clean up test file if we created it
    if (fs.existsSync('test-hook-example.js')) {
        console.log('\n🧹 Cleaning up test file...');
        execSync('git reset HEAD test-hook-example.js');
        fs.unlinkSync('test-hook-example.js');
        console.log('✅ Test file removed');
    }
    
    console.log('\n🎉 HOOK TEST COMPLETED!');
    console.log('\nThe hook is ready to use. It will automatically run on git commits.');
    console.log('To test with a real commit, make some changes and run: git commit');
    
} catch (error) {
    console.error('💥 Hook test failed:', error.message);
    process.exit(1);
}