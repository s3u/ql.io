#!/bin/bash
# Test all modules and generate report

set -e

# Get the project root (two levels up from scripts/)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/modernization/test-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/test-report-$TIMESTAMP.txt"

# Create report directory
mkdir -p "$REPORT_DIR"

echo "========================================" | tee "$REPORT_FILE"
echo "ql.io Test Report" | tee -a "$REPORT_FILE"
echo "Date: $(date)" | tee -a "$REPORT_FILE"
echo "Node.js: $(node --version)" | tee -a "$REPORT_FILE"
echo "npm: $(npm --version)" | tee -a "$REPORT_FILE"
echo "========================================" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# Test each module (relative to project root)
MODULES=(
  "$PROJECT_ROOT/modules/str-template"
  "$PROJECT_ROOT/modules/uri-template"
  "$PROJECT_ROOT/modules/mutable-uri"
  "$PROJECT_ROOT/modules/compiler"
  "$PROJECT_ROOT/modules/engine"
  "$PROJECT_ROOT/modules/console"
  "$PROJECT_ROOT/modules/app"
  "$PROJECT_ROOT/modules/mem-cache-local"
)

TOTAL=0
PASSED=0
FAILED=0

for module in "${MODULES[@]}"; do
  if [ -d "$module" ]; then
    MODULE_NAME=$(basename "$module")
    echo "Testing $MODULE_NAME..." | tee -a "$REPORT_FILE"
    
    if (cd "$module" && npm test >> "$REPORT_FILE" 2>&1); then
      echo "✅ $MODULE_NAME: PASSED" | tee -a "$REPORT_FILE"
      ((PASSED++))
    else
      echo "❌ $MODULE_NAME: FAILED" | tee -a "$REPORT_FILE"
      ((FAILED++))
    fi
    
    ((TOTAL++))
    echo "" | tee -a "$REPORT_FILE"
  fi
done

# Summary
echo "========================================" | tee -a "$REPORT_FILE"
echo "Summary:" | tee -a "$REPORT_FILE"
echo "Total modules: $TOTAL" | tee -a "$REPORT_FILE"
echo "Passed: $PASSED" | tee -a "$REPORT_FILE"
echo "Failed: $FAILED" | tee -a "$REPORT_FILE"
echo "========================================" | tee -a "$REPORT_FILE"

# Save as latest
cp "$REPORT_FILE" "$REPORT_DIR/test-report-latest.txt"

echo ""
echo "Report saved to: $REPORT_FILE"

# Exit with error if any tests failed
if [ $FAILED -gt 0 ]; then
  exit 1
fi
