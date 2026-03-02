Review all uncommitted code changes in this repository and provide a structured code review.

## Steps

1. **Gather the diff** — Run `git diff HEAD` to capture all uncommitted changes (both staged and unstaged). If the diff is empty, inform the user there are no changes to review and stop.

2. **Read changed files** — For each file that appears in the diff, read the full file contents so you have surrounding context beyond just the changed lines.

3. **Analyze the changes** — Review every change checking for:

   - **Bugs & logic errors** — off-by-one errors, null/undefined access, race conditions, unhandled promise rejections, incorrect boolean logic, missing break/return statements
   - **Security** — command injection, SQL injection, XSS, hardcoded secrets or credentials, unsafe input handling, prototype pollution
   - **Performance** — unnecessary allocations inside loops, missing early returns, O(n²) patterns where O(n) is possible, synchronous I/O in hot paths
   - **Style & conventions** — consistency with the project's ESLint rules (no-var, prefer-const, ES2022+ idioms), naming conventions used in surrounding code
   - **Error handling** — missing try/catch on async calls, swallowed errors, unclear or missing error messages, unhandled rejection paths
   - **Test coverage** — whether new or changed logic has corresponding test updates; flag any untested code paths

4. **Output a structured review** — Group findings by severity:

   ### Critical
   Issues that will cause bugs, security vulnerabilities, or data loss. Each entry must include the file path, line number(s), a description of the problem, and a concrete fix.

   ### Warning
   Issues that may cause problems under certain conditions or deviate significantly from best practices. Same format as critical.

   ### Suggestion
   Non-blocking improvements for readability, performance, or maintainability. Same format as above.

   If a severity category has no findings, omit it. If there are no findings at all, say the changes look good.

5. **Summary** — End with a short summary: total number of findings per severity, and an overall assessment of whether the changes are ready to commit.
