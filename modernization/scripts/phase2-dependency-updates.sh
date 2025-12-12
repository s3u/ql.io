#!/bin/bash

# Phase 2: Dependency Updates Script
# Week 3-4: Update all dependencies to modern versions

set -e

echo "🚀 Starting Phase 2: Dependency Updates"
echo "========================================"

# Week 3: Critical Blocking Dependencies
echo ""
echo "📅 Week 3: Critical Blocking Dependencies"
echo "----------------------------------------"

# Day 1-2: Engine Module Critical Updates
echo ""
echo "🔧 Day 1-2: Engine Module - Critical Blockers"
echo "Module: modules/engine"

cd modules/engine

echo "  📦 Removing problematic dependencies..."
npm uninstall websocket xml2json iconv mongodb

echo "  📦 Installing modern replacements..."
npm install ws@8 fast-xml-parser@4 iconv-lite@0.6 mongodb@6

echo "  📦 Updating other critical dependencies..."
npm install winston@3 underscore@1.13 async@3 ejs@3

echo "  ✅ Engine critical updates complete"

cd ../..

# Day 3-4: Console Module Critical Updates  
echo ""
echo "🔧 Day 3-4: Console Module - Critical Blockers"
echo "Module: modules/console"

cd modules/console

echo "  📦 Removing problematic dependencies..."
npm uninstall express connect websocket browserify

echo "  📦 Installing modern replacements..."
npm install express@4 ws@8 esbuild@0.19

echo "  📦 Updating other dependencies..."
npm install underscore@1.13 winston@3 ejs@3

echo "  ✅ Console critical updates complete"

cd ../..

# Day 5: App Module Updates
echo ""
echo "🔧 Day 5: App Module - Updates"
echo "Module: modules/app"

cd modules/app

echo "  📦 Removing problematic dependencies..."
npm uninstall cluster2

echo "  📦 Installing modern replacements..."
npm install commander@11

echo "  📦 Updating other dependencies..."
npm install underscore@1.13 winston@3

echo "  ✅ App updates complete"

cd ../..

echo ""
echo "✅ Week 3 Complete: Critical blocking dependencies updated"
echo "🔍 Running audit check..."

# Check for remaining vulnerabilities
for module in modules/*/; do
    if [ -f "$module/package.json" ]; then
        echo "Auditing $module..."
        cd "$module"
        npm audit --audit-level=high || true
        cd - > /dev/null
    fi
done

echo ""
echo "🎉 Phase 2 Week 3 Complete!"
echo "Next: Week 4 - Remaining dependency updates"