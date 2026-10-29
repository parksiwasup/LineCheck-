@echo off
title LineCheck+ - Production Launcher (Port 3088)
cd /d "%~dp0"
echo =====================================================================
echo    LINECHECK+ ATTENDANCE AND REMEDIAL MANAGEMENT SYSTEM (Port 3088)
echo =====================================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    pause
    exit /b 1
)
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" copy "%~dp0.env.example" "%~dp0.env" >nul
)
echo [1/4] Checking dependencies...
call npm.cmd install --legacy-peer-deps
echo [2/4] Syncing Prisma and Database...
call npx.cmd prisma generate
call npx.cmd prisma db push
echo [3/4] Building Next.js Production App...
call npm.cmd run build
echo [4/4] Starting Production Server on http://localhost:3088 ...
start "LineCheck+ Server (Port 3088)" cmd /k "cd /d "%~dp0" && npm.cmd run start"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3088"
echo [SUCCESS] LineCheck+ is running on http://localhost:3088
pause >nul
