#!/bin/bash

# ql.io Development Server (Single Process)
# This script starts ql.io in development mode without clustering

echo "🚀 Starting ql.io in development mode..."
echo "📁 Tables directory: $PWD/tables/"
echo "🛣️  Routes directory: $PWD/routes/"
echo "⚙️  Config file: $PWD/config/dev.json"
echo ""

# Ensure directories exist
mkdir -p tables routes logs pids

# Create a simple example table if none exist
if [ ! "$(ls -A tables)" ]; then
    echo "📝 Creating example table..."
    cat > tables/example.ql << 'EOF'
create table example.geocoder
  on select get from 'http://maps.googleapis.com/maps/api/geocode/json?address={address}&sensor=true'
  resultset 'results.geometry.location'
EOF
    echo "✅ Created tables/example.ql"
fi

# Start the server in development mode (no cluster)
echo ""
echo "🌐 Starting development server on http://localhost:3000"
echo "🖥️  Web console: http://localhost:3000/console"
echo "📊 Monitoring: http://localhost:3001"
echo "📋 Tables: http://localhost:3000/tables"
echo ""
echo "💡 Try this query in the console:"
echo "   select * from example.geocoder where address='San Francisco'"
echo ""
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------"

node node_modules/.bin/ql.io.app \
  --tables $PWD/tables/ \
  --routes $PWD/routes/ \
  --config $PWD/config/dev.json \
  --port 3000 \
  --monPort 3001 \
  $@