#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"

# Backend window: use venv Python (no --reload to ensure venv is used)
osascript -e "tell application \"Terminal\"
  do script \"echo '=== Backend ===' && cd '$DIR/backend' && venv/bin/python -m uvicorn app.main:app --port 8000\"
end tell"

# Frontend window: npm install if node_modules missing, then start dev server
osascript -e "tell application \"Terminal\"
  do script \"echo '=== Frontend ===' && cd '$DIR/frontend' && ([ ! -d node_modules ] && npm install); npm run dev\"
end tell"

# Wait for servers to boot, then open browser
sleep 5
open http://localhost:5173
