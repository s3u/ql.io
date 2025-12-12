#!/bin/bash
# Phase 0 Setup Script - Automated baseline establishment

set -e

echo "=========================================="
echo "ql.io Modernization - Phase 0 Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check for nvm
echo "Step 1: Checking for nvm..."
if [ -f ~/.nvm/nvm.sh ]; then
    echo -e "${GREEN}✓ nvm is installed${NC}"
    source ~/.nvm/nvm.sh
elif command -v nvm &> /dev/null; then
    echo -e "${GREEN}✓ nvm is installed${NC}"
else
    echo -e "${YELLOW}⚠ nvm is not installed${NC}"
    echo ""
    echo "Please install nvm first:"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo ""
    echo "Then restart your terminal and run this script again."
    exit 1
fi

# Step 2: Create directories
echo ""
echo "Step 2: Creating directories..."
mkdir -p modernization/docs modernization/test-reports modernization/backups
echo -e "${GREEN}✓ Directories created${NC}"

# Step 3: Document current Node.js version
echo ""
echo "Step 3: Documenting current Node.js version..."
node --version > modernization/docs/current-node-version.txt
echo "Current Node.js: $(cat modernization/docs/current-node-version.txt)"

# Step 4: Install Node.js versions
echo ""
echo "Step 4: Installing Node.js versions..."
echo "This may take a few minutes..."

for version in 14 16 20; do
    echo ""
    echo "Installing Node.js $version..."
    if nvm install $version; then
        echo -e "${GREEN}✓ Node.js $version installed${NC}"
    else
        echo -e "${RED}✗ Failed to install Node.js $version${NC}"
    fi
done

# Step 5: Test each version
echo ""
echo "=========================================="
echo "Step 5: Testing each Node.js version"
echo "=========================================="

for version in 14 16 20; do
    echo ""
    echo "Testing with Node.js $version..."
    echo "----------------------------------------"
    
    nvm use $version
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    
    echo "Cleaning and installing..."
    make clean > /dev/null 2>&1 || true
    
    if make install > modernization/test-reports/node${version}-install.log 2>&1; then
        echo -e "${GREEN}✓ Install successful${NC}"
        
        echo "Running tests..."
        if make test > modernization/test-reports/node${version}-test.log 2>&1; then
            echo -e "${GREEN}✓✓✓ TESTS PASSED on Node.js $version ✓✓✓${NC}"
            echo "$version" > modernization/docs/working-node-version.txt
            echo "$(node --version)" > .nvmrc
            WORKING_VERSION=$version
            break
        else
            echo -e "${RED}✗ Tests failed${NC}"
            echo "See modernization/test-reports/node${version}-test.log for details"
        fi
    else
        echo -e "${RED}✗ Install failed${NC}"
        echo "See modernization/test-reports/node${version}-install.log for details"
    fi
done

# Step 6: Summary
echo ""
echo "=========================================="
echo "Phase 0 Setup Complete"
echo "=========================================="
echo ""

if [ -f modernization/docs/working-node-version.txt ]; then
    WORKING=$(cat modernization/docs/working-node-version.txt)
    echo -e "${GREEN}✓ Found working Node.js version: $WORKING${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review test results: cat modernization/test-reports/node${WORKING}-test.log"
    echo "2. Switch to working version: nvm use $WORKING"
    echo "3. Read modernization/PHASE_0_GUIDE.md for next steps"
    echo "4. Create git branch: git checkout -b modernization-main"
else
    echo -e "${YELLOW}⚠ No working Node.js version found${NC}"
    echo ""
    echo "Tests failed on all versions (14, 16, 20)."
    echo "This means we need to update nodeunit first."
    echo ""
    echo "Next steps:"
    echo "1. Review test logs in modernization/test-reports/"
    echo "2. We'll need to migrate to Jest immediately"
    echo "3. Contact me for the alternative modernization path"
fi

echo ""
echo "Baseline documentation created in modernization/docs/"
echo "Test results saved in modernization/test-reports/"
