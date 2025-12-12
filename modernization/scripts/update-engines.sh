#!/bin/bash
# Update Node.js engine version in all package.json files

if [ -z "$1" ]; then
  echo "Usage: ./scripts/update-engines.sh <node-version>"
  echo "Example: ./scripts/update-engines.sh '>=18.0.0'"
  exit 1
fi

NODE_VERSION="$1"

echo "Updating Node.js engine to: $NODE_VERSION"
echo ""

MODULES=(
  "modules/str-template"
  "modules/uri-template"
  "modules/mutable-uri"
  "modules/compiler"
  "modules/engine"
  "modules/console"
  "modules/app"
  "modules/mem-cache-local"
)

for module in "${MODULES[@]}"; do
  if [ -f "$module/package.json" ]; then
    echo "Updating $module/package.json..."
    
    cd "$module"
    npm pkg set engines.node="$NODE_VERSION"
    cd ../..
  fi
done

echo ""
echo "✅ All package.json files updated"
echo ""
echo "Next steps:"
echo "1. Run: make install"
echo "2. Run: make test"
echo "3. Commit: git commit -am 'Update Node.js engine to $NODE_VERSION'"
