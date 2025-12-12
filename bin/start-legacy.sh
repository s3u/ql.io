#!/bin/bash

# ql.io Legacy Console Startup Script
# This script starts the ql.io server with the traditional web console

echo "🚀 Starting ql.io server with legacy console..."
echo "📁 Tables directory: $PWD/tables/"
echo "🛣️  Routes directory: $PWD/routes/"
echo "⚙️  Config file: $PWD/config/dev.json"
echo ""

# Ensure directories exist
mkdir -p tables routes logs pids

# Start the server
echo "🌐 Starting server on http://localhost:3000"
echo "🖥️  Legacy console available at: http://localhost:3000/console"
echo "📊 Monitoring available at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------"

node modules/app/bin/ql.io-app.js \
  --tables $PWD/tables/ \
  --routes $PWD/routes/ \
  --config $PWD/config/dev.json \
  --port 3000 \
  --monPort 3001 \
  $@