#!/bin/bash

# ql.io Server Startup Script
# This script starts the ql.io server with the web console

echo "🚀 Starting ql.io server..."
echo "📁 Tables directory: $PWD/tables/"
echo "🛣️  Routes directory: $PWD/routes/"
echo "⚙️  Config file: $PWD/config/dev.json"
echo ""

# Ensure directories exist
mkdir -p tables routes logs pids

# Start the server
echo "🌐 Starting server on http://localhost:3000"
echo "🖥️  Web console available at: http://localhost:3000/console"
echo "📊 Monitoring available at: http://localhost:3001"
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
