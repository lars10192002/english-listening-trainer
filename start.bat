@echo off
start "Backend" cmd /k "cd /d D:\english-listening-trainer\backend && venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"
start "Frontend" cmd /k "cd /d D:\english-listening-trainer\frontend && npm run dev"
echo Both servers starting...
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
timeout /t 3
start http://localhost:5173
