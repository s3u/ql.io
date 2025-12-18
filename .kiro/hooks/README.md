# ql.io Agent Hooks

This directory contains agent hooks that automate code quality and development workflows.

## 🔍 Pre-Commit Review Hook

**File**: `pre-commit-review.json`

A comprehensive git pre-commit hook that acts as an extremely thorough (and slightly annoying) code reviewer.

### What It Does

1. **Critical Code Review** 🧐
   - Analyzes all staged changes with brutal honesty
   - Checks for code quality issues, anti-patterns, and security vulnerabilities
   - Reviews performance, documentation, and architecture
   - Blocks commits with critical issues

2. **Comprehensive Testing** 🧪
   - Runs all unit tests across modules
   - Executes integration tests (API + Browser)
   - Runs demo tests for validation
   - Ensures nothing is broken before commit

3. **Commit Message Enhancement** 📝
   - Analyzes changes to generate meaningful commit messages
   - Follows conventional commit standards
   - Includes impact analysis and file statistics
   - Replaces generic messages with descriptive ones

### Code Review Criteria

The hook checks for:

#### 🚨 Critical Issues (Blocks Commit)
- Empty catch blocks
- Hardcoded passwords or API keys
- Use of `eval()`
- Security vulnerabilities

#### ⚠️ Issues (Should Fix)
- Use of `console.log` in production code
- Use of `var` instead of `const`/`let`
- Loose equality (`==`) instead of strict (`===`)
- Long functions (>50 lines)
- Missing error handling

#### 💡 Warnings (Consider Fixing)
- Long lines (>120 characters)
- TODO/FIXME comments
- Magic numbers without constants
- Missing semicolons
- Performance anti-patterns
- Missing documentation

### Usage

The hook automatically triggers on `git commit`. To enable:

1. **Automatic**: The hook is configured to trigger on git pre-commit events
2. **Manual**: Run the review script directly:
   ```bash
   node .kiro/hooks/scripts/critical-code-review.js
   ```

### Configuration

Edit `pre-commit-review.json` to customize:

- **Timeout**: Adjust the 300-second timeout if needed
- **Fail on Error**: Set to `false` to allow commits with warnings
- **Log Level**: Change verbosity of output

### Example Output

```
🔍 CRITICAL CODE REVIEW INITIATED

I'm about to perform an extremely thorough and critical review of your changes...

📁 Reviewing 5 changed files...

🧐 REVIEWING CODE QUALITY (prepare for pain)...
🔒 REVIEWING SECURITY (looking for vulnerabilities)...
⚡ REVIEWING PERFORMANCE (finding your inefficiencies)...
🧪 REVIEWING TEST COVERAGE (where are your tests?)...
📚 REVIEWING DOCUMENTATION (probably non-existent)...
🏗️ REVIEWING ARCHITECTURE (checking your design decisions)...

================================================================================
📋 CRITICAL CODE REVIEW REPORT
================================================================================

⚠️ ISSUES (SHOULD FIX):
   🔸 src/utils.js:42 - Using 'var'? Did you time travel from ES5? Use 'const' or 'let'!
   🔸 src/api.js:15 - Really? console.log? What is this, 2010? Use proper logging!

💡 WARNINGS (CONSIDER FIXING):
   🔹 src/component.js:128 - Line too long (145 chars). Break it up, this isn't a novel!
   🔹 src/service.js:67 - TODO/FIXME found. Stop procrastinating and fix it!

================================================================================
📊 REVIEW SUMMARY:
   Critical Issues: 0
   Issues: 2
   Warnings: 2
   Suggestions: 0
================================================================================

😤 Your code is acceptable, but barely...
   Fix those issues before I change my mind!

🧪 RUNNING COMPREHENSIVE TEST SUITE

✅ All tests passed (754 tests)

📝 COMMIT MESSAGE ENHANCEMENT

✅ Commit message enhanced successfully!

📋 New commit message:
────────────────────────────────────────────────────────────
feat(integration): implement comprehensive browser automation tests

Changes across 8 files:
• Added: test/browser/browser-integration-simple.test.js, .kiro/hooks/pre-commit-review.json
• Modified: package.json, test/README.md

Impact:
• Improves test coverage and reliability
• Enhances development workflow automation

Stats: +847 -12 lines | Files: 8 changed
────────────────────────────────────────────────────────────

✅ PRE-COMMIT REVIEW COMPLETE

If you're seeing this message, congratulations - your code somehow passed my brutal review process!
```

### Bypassing the Hook

In emergencies, you can bypass the hook:

```bash
git commit --no-verify -m "Emergency commit"
```

**Note**: Only use this for genuine emergencies. The hook exists to maintain code quality!

### Customizing Reviews

To add custom review rules, edit `scripts/critical-code-review.js`:

1. Add new check methods to the `CriticalCodeReviewer` class
2. Call them from `performReview()`
3. Use `this.criticalIssues.push()` for blocking issues
4. Use `this.issues.push()` for important warnings
5. Use `this.warnings.push()` for suggestions

### Troubleshooting

#### Hook Not Triggering
- Check that the hook file exists: `.kiro/hooks/pre-commit-review.json`
- Verify the trigger type is set to `"git-pre-commit"`
- Ensure `"enabled": true` in the configuration

#### Tests Failing
- Run tests manually: `npm test`
- Check specific test suites: `npm run test:integration:all`
- Review test output for specific failures

#### Script Errors
- Check Node.js version (requires Node 18+)
- Verify script permissions: `chmod +x .kiro/hooks/scripts/*.js`
- Run scripts manually to debug issues

## 🎯 Best Practices

1. **Write Tests First**: The hook expects test coverage for new code
2. **Document Your Code**: Add JSDoc comments for complex functions
3. **Use Conventional Commits**: The hook enhances but doesn't replace good commit messages
4. **Fix Issues Promptly**: Don't accumulate technical debt
5. **Review Hook Output**: Learn from the feedback to improve your coding

## 🔮 Future Enhancements

Planned improvements:
- Visual regression testing integration
- Performance regression detection
- Security vulnerability scanning
- Code complexity metrics
- Automated refactoring suggestions
- Integration with external code quality tools

---

*Remember: The hook is your friend, even when it's being brutally honest about your code! 😏*