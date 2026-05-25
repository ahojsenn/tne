#!/usr/bin/env bash
set -e

# Start the dev server and run Playwright tests.
# Handles startup, readiness wait, and cleanup automatically.

echo "▶ Starting dev server..."
npm run dev > /tmp/tne-test-server.log 2>&1 &
DEV_PID=$!

# Kill the server on exit (success or failure)
trap "kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null; echo '■ Dev server stopped.'" EXIT

# Wait for the server to respond (up to 60s)
for i in $(seq 1 60); do
  sleep 1
  if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
    echo "✔ Server ready (${i}s)"
    # Extra wait for full Nitro/Socket.io init to complete
    sleep 3
    break
  fi
  if [ $i -eq 60 ]; then
    echo "✘ Server did not start within 60s. Check /tmp/tne-test-server.log"
    exit 1
  fi
done

echo "▶ Running tests..."
npx playwright test "$@"
