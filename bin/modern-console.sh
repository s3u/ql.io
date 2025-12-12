#!/bin/bash

# Quick Modern Console Launcher
# Simple script to switch branch and start modern console

echo "🚀 ql.io Modern Console Launcher"
echo ""

# Switch to modern console branch
echo "📂 Switching to console-modern branch..."
git checkout console-modern

if [ $? -ne 0 ]; then
    echo "❌ Failed to switch to console-modern branch"
    echo "💡 Available branches:"
    git branch -a
    exit 1
fi

echo "✅ Switched to console-modern branch"
echo ""
echo "🎯 Choose your startup method:"
echo ""
echo "1️⃣  Automatic (recommended):"
echo "   ./bin/start-modern.sh"
echo ""
echo "2️⃣  Manual (two terminals):"
echo "   Terminal 1: node bin/minimal-server.js"
echo "   Terminal 2: cd console-ui && npm run dev"
echo ""
echo "3️⃣  Quick test:"
echo "   node bin/minimal-server.js &"
echo "   cd console-ui && npm run dev"
echo ""
echo "📱 Modern Console will be available at: http://localhost:3001"
echo "🔧 Backend API will be available at: http://localhost:3000"