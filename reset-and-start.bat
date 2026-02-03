@echo off
echo UniWay - SDK 54 Fixed - Starting...

echo Cleaning caches...
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Killing port 8081...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8081" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo Starting server...
npx expo start --clear

pause
