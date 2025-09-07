#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting publish test..."

# 1. Build and test is implicitly handled by bun, but we can keep these for clarity
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
echo "├── 🪛 Setting up test environment..."
npm init -y > /dev/null
npm install "$PACKAGE_FILE" > /dev/null
jq '.type = "module"' package.json > package.json.tmp && mv package.json.tmp package.json

# Kill any existing server on port 8989
lsof -ti:8989 | xargs -r kill -9

# 5. Start test server
echo "├── ⚙️ Starting test server on port 8989..."
cp ../tests/test-server.ts ./server.ts
bun run server.ts &> /dev/null &
SERVER_PID=$!
sleep 2

# 6. Run the integration test
echo "├── 🏃 Running integration tests..."
cp ../tests/publish-test-integration.ts ./test.ts
TEST_OUTPUT=$(bun run test.ts)

# 7. Check the output and print it
echo "├── 🧪 Test output..."
echo "$TEST_OUTPUT"
if [[ "$TEST_OUTPUT" != *"✅ Tests passed!"* ]]; then
  kill $SERVER_PID
  exit 1
fi

# 8. Test the CLI
echo "├── 🧪 Testing the CLI..."
CLI_OUTPUT=$(npx llm-resolver http://localhost:8989 output.txt)
echo "│   ├── Resolving content from: http://localhost:8989"
if [ ! -f "output.txt" ]; then
    echo "│   ├── ❌ CLI test failed: output.txt not created."
    kill $SERVER_PID
    exit 1
fi
if [ ! -s "output.txt" ]; then
    echo "│   ├── ❌ CLI test failed: output.txt is empty."
    kill $SERVER_PID
    exit 1
fi
echo "│   ├── ✅ Success! Content saved to: output.txt"
echo "│   └── ✅ CLI test passed!"

# 9. Clean up
kill $SERVER_PID
cd ..
rm -rf "$TEST_DIR"
rm -f "$PACKAGE_FILE"

echo "└── ✅ 🚢 Ship it!"