#!/bin/bash

# Test if ql.io server is running and accessible

echo "🧪 Testing ql.io server..."

# Test if server is running on port 3000
if curl -s http://localhost:3000/tables > /dev/null; then
    echo "✅ Server is running on http://localhost:3000"
    echo "🖥️  Web console: http://localhost:3000/console"
    echo "📋 Tables endpoint: http://localhost:3000/tables"
    
    # Test tables endpoint
    echo ""
    echo "📊 Available tables:"
    curl -s http://localhost:3000/tables | head -10
    
else
    echo "❌ Server is not running on http://localhost:3000"
    echo "💡 Start the server with: ./bin/start-dev.sh"
fi