#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting publish test...${NC}"

# 1. Build the package
echo "Building package..."
npm run build

# 2. Run tests
echo "Running tests..."
npm run test

# 3. Pack the package
echo "Packing package..."
PACKAGE_FILE=$(npm pack | tail -n 1)

# 4. Create a test directory
TEST_DIR="test-publish"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
mv "$PACKAGE_FILE" "$TEST_DIR/"
cd "$TEST_DIR"

# 5. Setup test environment
echo "Setting up test environment..."
npm init -y > /dev/null
npm install "$PACKAGE_FILE" > /dev/null
# Set type to module for ESM support
jq '.type = "module"' package.json > package.json.tmp && mv package.json.tmp package.json


# 6. Copy test file
echo "Copying test file..."
cp ../tests/publish-test-integration.js ./test.js

# 7. Run the test file
echo "Running test file..."
TEST_OUTPUT=$(node test.js)

# 8. Check the output and print it
echo "Test output:"
echo "$TEST_OUTPUT"
if [[ "$TEST_OUTPUT" != *"Test passed!"* ]]; then
  echo -e "${RED}Publish test failed!${NC}"
  exit 1
fi

# 9. Clean up
echo "Cleaning up..."
cd ..
rm -rf "$TEST_DIR"
rm -f "$PACKAGE_FILE"

echo -e "${GREEN}Publish test passed! Ready to publish.${NC}"
