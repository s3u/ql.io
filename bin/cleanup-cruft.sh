#!/bin/bash

# ql.io Project Cleanup Script
# Removes cruft and outdated files after modernization

echo "🧹 Cleaning up ql.io project cruft..."
echo ""

# Confirm before proceeding
read -p "This will delete outdated files. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo "🗑️  Removing empty directories..."
rmdir backups/ 2>/dev/null || echo "   backups/ already removed or not empty"
rmdir pids/ 2>/dev/null || echo "   pids/ already removed or not empty"

echo "🗑️  Removing redundant startup scripts..."
rm -f bin/simple-start.js
rm -f bin/debug.sh  
rm -f bin/shutdown.sh
rm -f bin/stop.sh

echo "🗑️  Removing outdated documentation..."
rm -f modernization/docs/baseline-node-version.txt
rm -f modernization/docs/baseline-report.md
rm -f modernization/docs/console-400-fix-report.md
rm -f modernization/docs/console-dependency-audit.md
rm -f modernization/docs/console-phase1-completion.md
rm -f modernization/docs/console-update-plan.md
rm -f modernization/docs/console-var-conversion-final.md
rm -f modernization/docs/current-state.md
rm -f modernization/docs/engine-module-completion-report.md
rm -f modernization/docs/engine-module-final-status.md
rm -f modernization/docs/jest-migration-*.md
rm -f modernization/docs/phase2-engine-progress.md
rm -f modernization/docs/var-conversion-completion-report.md
rm -f modernization/docs/week1-completion-report.md

echo "🗑️  Removing unused console template files..."
rm -f modules/console/public/views/console-simple.ejs
rm -f modules/console/public/css/all.css

echo "🗑️  Clearing log files..."
> logs/access.log 2>/dev/null || true
> logs/error.log 2>/dev/null || true
> logs/proxy.log 2>/dev/null || true
> logs/ql.io.log 2>/dev/null || true
rm -f server.log

echo "🗑️  Removing outdated phase documentation..."
rm -f modernization/PHASE_0_COMPLETE.md
rm -f modernization/PHASE_0_GUIDE.md
rm -f modernization/PHASE_1_PROGRESS.md
rm -f modernization/PHASE_2_PLAN.md
rm -f modernization/PHASE_2_PROGRESS.md
rm -f modernization/PLAN.md
rm -f modernization/FAST_TRACK_PLAN.md

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Remaining essential files:"
echo "   📁 modules/ - Core ql.io modules"
echo "   📁 console-ui/ - Modern React console"
echo "   📁 tables/ - Museum API tables"
echo "   📁 test/ - Test suites"
echo "   📄 README.md, MODERNIZATION.md - Documentation"
echo "   📄 CONSOLE_DEMO.md, MUSEUM_API_DEMO.md - Demos"
echo ""
echo "🚀 Essential startup scripts:"
echo "   ./bin/start-modern.sh - Modern console"
echo "   ./bin/console-server.js - Legacy console"
echo "   ./bin/minimal-server.js - API only"
echo "   ./bin/demo-queries.sh - Museum demo"
echo ""
echo "💡 Run 'git status' to see what was removed"