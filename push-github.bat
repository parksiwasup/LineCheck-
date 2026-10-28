@echo off
chcp 65001 >nul
title LineCheck+ GitHub Auto-Uploader
cd /d "%~dp0"
node "%~dp0scripts\push-to-github.js"
pause
