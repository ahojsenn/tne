#!/usr/bin/env bash
set -e

# Playwright manages the dev server via webServer config.
# This script is a thin wrapper to pass arguments through.

echo "▶ Running tests..."
npx playwright test "$@"
