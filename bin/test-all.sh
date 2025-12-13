#!/bin/bash

# ql.io Tables and Routes Test Script
# Simple wrapper for the Node.js test script

echo "🧪 ql.io Tables and Routes Test Suite"
echo ""

# Check if server is running
echo "Checking if ql.io server is running..."
if curl -s -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✓ Server is running"
else
    echo "❌ Server is not running on http://localhost:3000"
    echo ""
    echo "Please start the server first:"
    echo "  npm start"
    echo "  # or"
    echo "  bin/start.sh"
    echo ""
    exit 1
fi

echo ""

# Run the Node.js test script
node bin/test-tables-routes.js "$@"