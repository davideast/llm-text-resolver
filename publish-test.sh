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


# Kill any existing server on port 8989
lsof -ti:8989 | xargs -r kill -9

# Start test server
echo "Starting test server..."
cp ../tests/test-server.js ./server.js
node server.js &> /dev/null &
echo $! > server.pid

# Wait for server to start
sleep 2

# 7. Run the integration test
echo "Running integration test..."
cp ../tests/publish-test-integration.js ./test.js
TEST_OUTPUT=$(node test.js)

# 8. Check the output and print it
echo "Test output:"
echo "$TEST_OUTPUT"
if [[ "$TEST_OUTPUT" != *"Test passed!"* ]]; then
  echo -e "${RED}Library test failed!${NC}"
  kill $(cat server.pid)
  exit 1
fi

# 9. Test the CLI
echo "Testing the CLI..."
npx llm-resolver http://localhost:8989 output.txt
if [ ! -f "output.txt" ]; then
    echo -e "${RED}CLI test failed: output.txt not created.${NC}"
    kill $(cat server.pid)
    exit 1
fi
if [ ! -s "output.txt" ]; then
    echo -e "${RED}CLI test failed: output.txt is empty.${NC}"
    kill $(cat server.pid)
    exit 1
fi
echo "CLI test passed!"

# 10. Clean up
echo "Cleaning up..."
kill $(cat server.pid)
cd ..
rm -rf "$TEST_DIR"
rm -f "$PACKAGE_FILE"

echo -e "${GREEN}Publish test passed! Ready to publish.${NC}"
