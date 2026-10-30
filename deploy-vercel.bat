@echo off
chcp 65001 >nul
title Deploy LineCheck+ to Vercel
cd /d "%~dp0"

echo =====================================================================
echo    DEPLOY LINECHECK+ TO VERCEL (Production: linecheck-plus)
echo =====================================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] Checking Vercel login...
call npx.cmd vercel whoami >nul 2>&1
if errorlevel 1 (
    echo [!] You are not logged into Vercel. Opening browser for login...
    call npx.cmd vercel login
)

echo.
echo [2/2] Deploying to Vercel (Production)...
call npx.cmd vercel --prod --yes

echo.
echo =====================================================================
echo [SUCCESS] LineCheck+ deployment completed!
echo =====================================================================
pause
