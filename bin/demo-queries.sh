#!/bin/bash

# ql.io Museum API Demo Queries
# This script demonstrates various museum API queries

echo "🎨 ql.io Museum API Demo"
echo "========================"
echo ""

BASE_URL="http://localhost:3000"

echo "📋 1. List all available tables:"
curl -s $BASE_URL/tables | jq -r '.[] | "   - \(.name)"'
echo ""

echo "🏛️  2. Get Met Museum departments:"
curl -s -X POST -H "Content-Type: application/json" \
     -d '{"q":"select * from met.departments limit 5"}' \
     $BASE_URL/q | head -c 200
echo "..."
echo ""

echo "🎭 3. Search for Vermeer paintings at Rijksmuseum:"
curl -s -X POST -H "Content-Type: application/json" \
     -d '{"q":"select * from rijks.collection where query=\"Vermeer\" limit 2"}' \
     $BASE_URL/q | head -c 300
echo "..."
echo ""

echo "🖼️  4. Raw JSON response example:"
echo "   Full Vermeer artwork data available via API"
echo ""

echo "💡 Try these queries yourself:"
echo "   curl -X POST -H \"Content-Type: application/json\" \\"
echo "        -d '{\"q\":\"select * from met.departments\"}' \\"
echo "        $BASE_URL/q"
echo ""
echo "   curl -X POST -H \"Content-Type: application/json\" \\"
echo "        -d '{\"q\":\"select title, principalOrFirstMaker from rijks.collection where query=\\\"Monet\\\"\"}' \\"
echo "        $BASE_URL/q"