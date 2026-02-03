@echo off
echo UniMap - Restarting (clear cache)...

REM Kill port 8081
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8081" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

REM Start with clear cache
npx expo start --clear

