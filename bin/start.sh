#!/bin/bash

# ql.io Server Startup Script
# Starts the modern React console with backend API

echo "🚀 Starting ql.io Modern Console..."
echo ""

# Check if modern console is available
if [ -d "console-ui" ]; then
    echo "✨ Starting modern console with React UI..."
    exec bin/start-modern.sh
else
    echo "❌ Modern console not available"
    echo "💡 The console-ui directory is missing"
    echo "💡 Make sure you have the complete ql.io repository with console-ui/"
    exit 1
fi
