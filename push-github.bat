@echo off
chcp 65001 >nul
title LineCheck+ GitHub Auto-Uploader
cd /d "%~dp0"

:: ตรวจหา Git จากทุกแหล่งที่เป็นไปได้ หากยังไม่ได้เซ็ต PATH ในระบบ
where git >nul 2>nul
if errorlevel 1 (
    for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do (
        if exist "%%D\resources\app\git\cmd\git.exe" (
            set "PATH=%%D\resources\app\git\cmd;%%D\resources\app\git\bin;%PATH%"
        )
    )
    for /d %%D in ("%LOCALAPPDATA%\github-copilot-git-*") do (
        if exist "%%D\cmd\git.exe" (
            set "PATH=%%D\cmd;%PATH%"
        )
    )
    if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
    )
    if exist "%ProgramFiles%\Git\cmd\git.exe" (
        set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
    )
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

node "%~dp0scripts\push-to-github.js"
pause
