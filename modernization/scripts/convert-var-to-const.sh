#!/bin/bash
# Convert var to const/let using lebab

if [ -z "$1" ]; then
  echo "Usage: ./scripts/convert-var-to-const.sh <module-path>"
  echo "Example: ./scripts/convert-var-to-const.sh modules/engine"
  exit 1
fi

MODULE_PATH="$1"

if [ ! -d "$MODULE_PATH" ]; then
  echo "Error: Directory $MODULE_PATH does not exist"
  exit 1
fi

echo "Converting var to const/let in $MODULE_PATH..."
echo ""

# Install lebab if not present
if ! command -v lebab &> /dev/null; then
  echo "Installing lebab..."
  npm install -g lebab
fi

# Backup
BACKUP_DIR="backups/$(basename $MODULE_PATH)-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$MODULE_PATH" "$BACKUP_DIR/"
echo "✅ Backup created: $BACKUP_DIR"
echo ""

# Convert
echo "Running lebab transformation..."
lebab --replace "$MODULE_PATH" --transform let

echo ""
echo "✅ Conversion complete"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff $MODULE_PATH"
echo "2. Run tests: cd $MODULE_PATH && npm test"
echo "3. If tests pass: git commit -am 'Convert var to const/let in $MODULE_PATH'"
echo "4. If tests fail: git checkout $MODULE_PATH (restore from backup)"
