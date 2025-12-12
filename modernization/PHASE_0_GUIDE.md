# Phase 0 Execution Guide - Step by Step

## Current Situation
- ✅ You're on Node.js 23.11.0
- ❌ Tests don't run (nodeunit incompatibility)
- 🎯 Goal: Find a Node.js version where tests pass, then modernize from there

## Step-by-Step Instructions

### Step 0.1: Install nvm (Node Version Manager)

**Check if you have nvm:**
```bash
nvm --version
```

**If not installed, install it:**
```bash
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart your terminal, then verify
nvm --version
```

---

### Step 0.2: Install Multiple Node.js Versions

We'll install several versions to find which one works:

```bash
# Install Node.js 20.x LTS (our target)
nvm install 20

# Install Node.js 16.x (fallback)
nvm install 16

# Install Node.js 14.x (older fallback)
nvm install 14

# List installed versions
nvm list
```

---

### Step 0.3: Test with Node.js 20.x

```bash
# Switch to Node.js 20
nvm use 20

# Verify
node --version  # Should show v20.x.x

# Try to run tests
make clean
make install
make test 2>&1 | tee test-reports/node20-test-results.txt

# Check if tests passed
echo "Exit code: $?"
```

**Expected outcome:** Tests might fail due to nodeunit issues.

---

### Step 0.4: Test with Node.js 16.x (if 20 failed)

```bash
# Switch to Node.js 16
nvm use 16

# Verify
node --version  # Should show v16.x.x

# Clean and reinstall
make clean
make install
make test 2>&1 | tee test-reports/node16-test-results.txt

# Check if tests passed
echo "Exit code: $?"
```

---

### Step 0.5: Test with Node.js 14.x (if 16 failed)

```bash
# Switch to Node.js 14
nvm use 14

# Verify
node --version  # Should show v14.x.x

# Clean and reinstall
make clean
make install
make test 2>&1 | tee test-reports/node14-test-results.txt

# Check if tests passed
echo "Exit code: $?"
```

---

### Step 0.6: Document Working Version

Once you find a Node.js version where tests pass:

```bash
# Save the working version
node --version > docs/working-node-version.txt

# Create .nvmrc file
node --version | sed 's/v//' > .nvmrc

# Update baseline report
echo "Working Node.js version: $(cat .nvmrc)" >> docs/baseline-report.md
```

---

### Step 0.7: Run Full Test Suite on Working Version

```bash
# Make sure you're on the working version
nvm use

# Run all tests and save results
./scripts/test-all.sh

# Review results
cat test-reports/test-report-latest.txt
```

---

### Step 0.8: Create Git Branch for Modernization

```bash
# Create and switch to modernization branch
git checkout -b modernization-main

# Commit baseline
git add docs/ .nvmrc test-reports/
git commit -m "Phase 0: Establish baseline

- Documented current state
- Found working Node.js version
- Saved test results
- Ready to begin modernization"

# Push branch
git push -u origin modernization-main
```

---

### Step 0.9: Setup Modern Tooling (Parallel to Old)

Now we'll add modern tools WITHOUT breaking the existing setup:

```bash
# Create root package.json for workspace
cat > package.json << 'EOF'
{
  "name": "ql.io-monorepo",
  "private": true,
  "workspaces": [
    "modules/*"
  ],
  "engines": {
    "node": ">=14.0.0"
  },
  "scripts": {
    "test": "make test",
    "test:all": "./scripts/test-all.sh",
    "check": "./scripts/check-progress.sh",
    "lint": "echo 'Linting not yet configured'",
    "format": "echo 'Formatting not yet configured'"
  },
  "devDependencies": {}
}
EOF

# Install root dependencies (we'll add tools later)
npm install

# Commit
git add package.json
git commit -m "Phase 0: Add root package.json for workspace"
```

---

### Step 0.10: Create GitHub Actions Workflow (Optional)

```bash
# Create GitHub Actions directory
mkdir -p .github/workflows

# Create basic workflow
cat > .github/workflows/test.yml << 'EOF'
name: Tests

on:
  push:
    branches: [ main, modernization-main ]
  pull_request:
    branches: [ main, modernization-main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [14, 16, 20]
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - name: Install dependencies
        run: make install
      - name: Run tests
        run: make test
        continue-on-error: true
EOF

# Commit
git add .github/
git commit -m "Phase 0: Add GitHub Actions workflow"
```

---

## Phase 0 Completion Checklist

- [ ] nvm installed
- [ ] Multiple Node.js versions installed (14, 16, 20)
- [ ] Found Node.js version where tests pass
- [ ] Documented working version in .nvmrc
- [ ] Ran full test suite successfully
- [ ] Created modernization-main branch
- [ ] Added root package.json
- [ ] Committed all baseline documentation
- [ ] (Optional) Setup GitHub Actions

---

## What You Should Have Now

```
ql.io/
├── .nvmrc                          # Working Node.js version
├── package.json                    # Root workspace config
├── docs/
│   ├── baseline-report.md          # Current state
│   ├── working-node-version.txt    # Version where tests pass
│   └── ...
├── test-reports/
│   ├── node14-test-results.txt     # Test results per version
│   ├── node16-test-results.txt
│   ├── node20-test-results.txt
│   └── test-report-latest.txt      # Latest full run
└── .github/
    └── workflows/
        └── test.yml                # CI workflow
```

---

## Next Steps After Phase 0

Once Phase 0 is complete:

1. **Review results:** Check which Node.js version works
2. **Read Phase 1:** Open MODERNIZATION_PLAN.md and read Phase 1
3. **Plan approach:** 
   - If tests pass on Node.js 14-16: Follow Phase 1 to upgrade to 20
   - If tests only pass on very old Node.js: May need to update nodeunit first
4. **Begin Phase 1:** Start Node.js upgrade process

---

## Troubleshooting

### Tests fail on all Node.js versions
**Solution:** We may need to update nodeunit first. See "Alternative Path" below.

### npm install fails
**Solution:** 
```bash
# Clear cache
npm cache clean --force

# Try again
make clean
make install
```

### Module linking errors
**Solution:**
```bash
# Manually link modules in order
cd modules/str-template && npm link
cd ../uri-template && npm link
cd ../mutable-uri && npm link
cd ../compiler && npm link
cd ../engine && npm link
cd ../..
```

---

## Alternative Path: If Tests Fail Everywhere

If tests don't pass on any Node.js version 14+, we'll need to:

1. **Update nodeunit first** (before other changes)
2. **Or migrate to Jest immediately** (skip gradual approach)

I can help you with this if needed. Let me know what you find!

---

## Summary

Phase 0 is about **establishing a working baseline**. We need:
- ✅ A Node.js version where tests pass
- ✅ Documentation of current state
- ✅ Modern tooling setup (parallel to old)
- ✅ Git branch for modernization work

Once you have this, you're ready for Phase 1!

---

**Ready to start? Run these commands:**

```bash
# 1. Check for nvm
nvm --version

# 2. If you have it, start testing Node.js versions
nvm install 20
nvm use 20
make clean && make install && make test

# 3. Let me know what happens!
```
