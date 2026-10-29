@echo off
chcp 65001 >nul
title LineCheck+ Dev Runner (Port 3088)
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo =====================================================================
    echo  [ERROR] ไม่พบ Node.js ในเครื่องคอมพิวเตอร์เครื่องนี้!
    echo.
    echo  กรุณาดาวน์โหลดและติดตั้ง Node.js จาก https://nodejs.org/ (LTS Version)
    echo  หลังจากติดตั้งเสร็จ ให้ดับเบิ้ลคลิก dev.bat นี้ใหม่อีกครั้ง
    echo =====================================================================
    pause
    exit /b 1
)

node "%~dp0scripts\dev-runner.js"
pause
