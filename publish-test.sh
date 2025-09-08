#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting publish test..."

# 1. Build and test is implicitly handled by bun, but we keep these for clarity
npm run build > /dev/null
npm run test > /dev/null

# 2. Pack the package
echo "├── 📦 Packing package..."
PACKAGE_FILE=$(npm pack 2> /dev/null | tail -n 1)

# 3. Create a test directory
TEST_DIR="test-publish"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
mv "$PACKAGE_FILE" "$TEST_DIR/"
cd "$TEST_DIR"

# 4. Setup test environment
echo "├── 🪛  Setting up test environment..."
npm init -y > /dev/null
npm install "$PACKAGE_FILE" > /dev/null
jq '.type = "module"' package.json > package.json.tmp && mv package.json.tmp package.json

# Kill any existing server on port 8989
lsof -ti:8989 | xargs -r kill -9

# 5. Start test server
echo "├── ⚙️  Starting test server on port 8989..."
cp -r ../tests/site ./site
cp ../tests/test_server.ts ./test_server.ts
# 5. Start test server
echo "├── ⚙️  Starting test server on port 8989..."
cp -r ../tests/site ./site
cp ../tests/test_server.ts ./test_server.ts
bun run test_server.ts &> server.log &
sleep 2
SERVER_PID=$(lsof -ti:8989)
if [ -z "$SERVER_PID" ]; then
  echo "❌ Server failed to start. Log:"
  cat server.log
  exit 1
fi
echo "│   ├── ✅ Server started with PID $SERVER_PID"

# 6. Run the integration test
echo "├── 🏃 Running integration tests..."
cp ../tests/publish_test_integration.ts ./test.ts
TEST_OUTPUT=$(bun run test.ts)

# 7. Check the output and print it
echo "├── 🧪 Test output..."
echo "$TEST_OUTPUT"
if [[ "$TEST_OUTPUT" != *"✅ Tests passed!"* ]]; then
  kill $SERVER_PID
  exit 1
fi

# 8. Clean up
echo "├── 🧽 Cleaning up..."
kill $SERVER_PID
echo "│   ├── 🛑 Stopped test server"
cd ..
rm -rf "$TEST_DIR"
echo "│   ├── 🗑️  Removed test directory"
rm -f "$PACKAGE_FILE"
echo "│   └── 🗑️  Removed package file"

echo "└── ✅ 🚢 Ship it!"