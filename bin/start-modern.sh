#!/bin/bash

# ql.io Modern Console Startup Script
# This script starts both the backend API and modern React console

echo "🚀 Starting ql.io Modern Console..."
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "console-modern" ]; then
    echo "⚠️  Switching to console-modern branch..."
    git checkout console-modern
    if [ $? -ne 0 ]; then
        echo "❌ Failed to switch to console-modern branch"
        echo "💡 Make sure the branch exists: git branch -a"
        exit 1
    fi
fi

# Check if console-ui directory exists
if [ ! -d "console-ui" ]; then
    echo "❌ console-ui directory not found"
    echo "💡 Make sure you're on the console-modern branch"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "console-ui/node_modules" ]; then
    echo "📦 Installing modern console dependencies..."
    cd console-ui
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    cd ..
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "🔧 Starting backend API server..."
node bin/minimal-server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend server failed to start"
    exit 1
fi

echo "✅ Backend running on http://localhost:3000"
echo ""

echo "🎨 Starting modern console frontend..."
cd console-ui
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

echo ""
echo "🎉 Modern Console is ready!"
echo ""
echo "📱 Modern Console: http://localhost:3001"
echo "🔧 Backend API: http://localhost:3000"
echo "📋 Tables API: http://localhost:3000/tables"
echo ""
echo "💡 Try these queries in the modern console:"
echo "   show tables"
echo "   select title, principalOrFirstMaker from rijks.collection where query=\"Van Gogh\" limit 5"
echo "   select * from met.departments"
echo ""
echo "⌨️  Keyboard shortcuts:"
echo "   Ctrl+Enter: Execute query"
echo "   Ctrl+C: Stop servers"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "----------------------------------------"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID