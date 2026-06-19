#!/usr/bin/env bash
set -e

echo "Starting Serandib Bank on http://localhost:3000"

if lsof -ti:3000 >/dev/null 2>&1; then
  echo "Port 3000 is already in use."
  echo "Stop the process using: kill -9 \$(lsof -ti:3000)"
  exit 1
fi

bun run dev
