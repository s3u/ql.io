#!/bin/bash

# ql.io Demo Integration Test Runner
# This script runs the comprehensive demo integration tests

echo "🧪 Running ql.io Demo Integration Tests"
echo "========================================"
echo "📁 Demo directory: demos/"
echo "🧪 Test location: demos/test/"
echo ""

# Check if Jest is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js and npm."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

echo "🚀 Starting integration tests..."
echo ""

# Run the integration tests
npm run test:demo

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ All demo integration tests passed!"
    echo ""
    echo "🎉 Demo functionality is working correctly:"
    echo "   • All demo routes are accessible"
    echo "   • ql.io language syntax is working"
    echo "   • API integrations are functional"
    echo "   • Error handling is working"
    echo "   • Performance is within acceptable limits"
else
    echo "❌ Some integration tests failed"
    echo ""
    echo "🔍 Check the test output above for details"
    echo "💡 Common issues:"
    echo "   • Network connectivity problems"
    echo "   • External API rate limits"
    echo "   • Port conflicts (ensure no other servers on port 3000)"
fi

echo ""
echo "📋 To run specific test categories:"
echo "   npm run test:demo -- --testNamePattern=\"Core API\""
echo "   npm run test:demo -- --testNamePattern=\"Demo Routes\""
echo "   npm run test:demo -- --testNamePattern=\"Language Syntax\""

exit $exit_code