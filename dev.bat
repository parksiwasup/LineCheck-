@echo off
title LineCheck+ Dev Runner (Port 3088)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node "%~dp0scripts\dev-runner.js"
pause
