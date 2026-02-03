@echo off
echo UniMap - Starting...

REM Kill port 8081 quickly
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8081" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

REM Start server
npm start


