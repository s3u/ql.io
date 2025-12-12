#!/bin/bash

# ql.io Server Startup Script
# Choose between modern React console or legacy console

echo "🚀 ql.io Server Startup"
echo ""

# Check if modern console is available
if [ -d "console-ui" ]; then
    echo "📱 Choose your console experience:"
    echo ""
    echo "1️⃣  Modern Console (React + TypeScript) - RECOMMENDED"
    echo "   ✨ Modern UI with syntax highlighting"
    echo "   🚀 Fast development server"
    echo "   📊 Better query results visualization"
    echo ""
    echo "2️⃣  Legacy Console (Traditional)"
    echo "   🔧 Integrated server-side console"
    echo "   📋 Classic ql.io interface"
    echo ""
    
    # Check for command line argument
    if [ "$1" = "--legacy" ] || [ "$1" = "-l" ]; then
        CHOICE="2"
        echo "🔧 Starting legacy console (--legacy flag detected)..."
    elif [ "$1" = "--modern" ] || [ "$1" = "-m" ]; then
        CHOICE="1"
        echo "✨ Starting modern console (--modern flag detected)..."
    else
        echo -n "Enter your choice (1 or 2) [default: 1]: "
        read CHOICE
        CHOICE=${CHOICE:-1}
    fi
    
    echo ""
    
    if [ "$CHOICE" = "1" ]; then
        echo "🎨 Starting Modern Console..."
        exec bin/start-modern.sh
    elif [ "$CHOICE" = "2" ]; then
        echo "🔧 Starting Legacy Console..."
        exec bin/start-legacy.sh
    else
        echo "❌ Invalid choice. Starting Modern Console (default)..."
        exec bin/start-modern.sh
    fi
else
    echo "⚠️  Modern console not available, starting legacy console..."
    exec bin/start-legacy.sh
fi
