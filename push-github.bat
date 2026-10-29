@echo off
title LineCheck+ GitHub Auto-Uploader
cd /d "%~dp0"
node "%~dp0scripts\push-to-github.js"
pause
