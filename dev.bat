@echo off
chcp 65001 >nul
title LineCheck+ Dev Runner (Port 3088)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo =====================================================================
    echo [ERROR] Node.js is not installed or not found in system PATH!
    echo Please download and install Node.js LTS from:
    echo    https://nodejs.org/
    echo =====================================================================
    echo.
    pause
    exit /b 1
)

node "%~dp0scripts\dev-runner.js"
if errorlevel 1 (
    echo.
    echo [!] Server exited with an error.
    pause
)
