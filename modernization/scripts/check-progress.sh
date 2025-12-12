#!/bin/bash
# Check modernization progress

echo "=========================================="
echo "ql.io Modernization Progress"
echo "=========================================="
echo ""

# Node.js version
echo "📦 Environment:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo ""

# Git status
echo "🔀 Git Status:"
BRANCH=$(git branch --show-current)
echo "  Current branch: $BRANCH"
echo "  Uncommitted changes: $(git status --short | wc -l | tr -d ' ')"
echo ""

# Test status
echo "🧪 Test Status:"
if [ -f "test-reports/test-report-latest.txt" ]; then
  PASSED=$(grep "Passed:" test-reports/test-report-latest.txt | awk '{print $2}')
  FAILED=$(grep "Failed:" test-reports/test-report-latest.txt | awk '{print $2}')
  echo "  Last test run:"
  echo "    Passed: $PASSED"
  echo "    Failed: $FAILED"
else
  echo "  No test reports found. Run: ./scripts/test-all.sh"
fi
echo ""

# Checklist progress
echo "📋 Checklist Progress:"
CHECKLIST_PATH="$(dirname "$0")/../docs/migration-checklist.md"
if [ -f "$CHECKLIST_PATH" ]; then
  TOTAL=$(grep -c "\[ \]" "$CHECKLIST_PATH")
  COMPLETED=$(grep -c "\[x\]" "$CHECKLIST_PATH")
  IN_PROGRESS=$(grep -c "🔄" "$CHECKLIST_PATH")
  
  echo "  Total items: $TOTAL"
  echo "  Completed: $COMPLETED"
  echo "  In progress: $IN_PROGRESS"
  
  if [ $TOTAL -gt 0 ]; then
    PERCENT=$((COMPLETED * 100 / TOTAL))
    echo "  Progress: $PERCENT%"
  fi
else
  echo "  Checklist not found"
fi
echo ""

# Dependencies
echo "📚 Dependencies:"
echo "  Checking for outdated packages..."
OUTDATED=$(npm outdated --workspaces 2>/dev/null | wc -l | tr -d ' ')
echo "  Outdated packages: $OUTDATED"
echo ""

# Security
echo "🔒 Security:"
echo "  Running npm audit..."
VULNERABILITIES=$(npm audit --workspaces 2>/dev/null | grep "vulnerabilities" | head -1)
if [ -n "$VULNERABILITIES" ]; then
  echo "  $VULNERABILITIES"
else
  echo "  No vulnerabilities found ✅"
fi
echo ""

# Current phase
echo "🎯 Current Phase:"
if [ -f "$CHECKLIST_PATH" ]; then
  CURRENT_PHASE=$(grep -B 1 "🔄" "$CHECKLIST_PATH" | head -1 | sed 's/##//' | xargs)
  if [ -n "$CURRENT_PHASE" ]; then
    echo "  $CURRENT_PHASE"
  else
    echo "  No phase in progress"
  fi
fi
echo ""

echo "=========================================="
echo "For detailed plan: cat modernization/PLAN.md"
echo "For checklist: cat modernization/docs/migration-checklist.md"
echo "=========================================="
