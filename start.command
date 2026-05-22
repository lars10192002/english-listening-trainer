#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"

# Backend window: install deps (skipped if already installed) then start server
osascript -e "tell application \"Terminal\"
  do script \"echo '=== Backend ===' && cd '$DIR/backend' && pip install -r requirements.txt -q && python -m uvicorn app.main:app --reload --port 8000\"
end tell"

# Frontend window: npm install if node_modules missing, then start dev server
osascript -e "tell application \"Terminal\"
  do script \"echo '=== Frontend ===' && cd '$DIR/frontend' && ([ ! -d node_modules ] && npm install); npm run dev\"
end tell"

# Wait for servers to boot, then open browser
sleep 5
open http://localhost:5173
