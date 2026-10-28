@echo off
chcp 65001 >nul
title LineCheck+ Dev Runner (Port 3088)
cd /d "%~dp0"
node "%~dp0scripts\dev-runner.js"
pause
