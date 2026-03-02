Review uncommitted changes, fix critical issues, then commit and push. Follow this loop strictly:

## Step 1: Review

Follow the instructions in `.claude/commands/review.md` to review all uncommitted changes.

## Step 2: Critical findings exist

If the review produced any **Critical** findings:

1. Fix every critical finding by editing the code directly.
2. Run the full test suite with `npm test`.
3. If any tests fail, fix the failures.
4. Go back to **Step 1** and re-review all uncommitted changes (including your fixes).

## Step 3: No critical findings

If the review produced no critical findings (warnings and suggestions are acceptable):

1. Show a short summary of what changed (files modified, nature of changes).
2. Stage all relevant changed files by name — do NOT use `git add -A` or `git add .`.
3. Craft a concise commit message that describes the "why" not the "what". Do NOT include any AI or Claude attribution.
4. Commit using a heredoc for the message.
5. Push to the current remote tracking branch.
6. Report the commit hash and confirm the push succeeded.
