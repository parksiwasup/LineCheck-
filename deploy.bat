@echo off
chcp 65001 >nul
title LineCheck+ - Deployment & Service Launcher (Port 3088)

echo =====================================================================
echo    🎓 LINECHECK+ ATTENDANCE & REMEDIAL MANAGEMENT SYSTEM
echo    ระบบเช็คชื่อเข้าแถวและจัดการแก้กิจกรรมเข้าแถว (Port 3088)
echo =====================================================================
echo.

:: 1. Version Info
set APP_VERSION=v1.0.0
echo [INFO] Current Release Version: %APP_VERSION%
echo.

:: 2. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

cd /d "%~dp0"

:: 3. Check .env
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        echo [INFO] ไม่พบไฟล์ .env กำลังสร้างจาก .env.example...
        copy "%~dp0.env.example" "%~dp0.env" >nul
    )
)

echo [1/4] Checking and installing dependencies...
call npm.cmd install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [WARN] npm install encountered warnings, continuing...
)

echo [2/4] Generating Prisma Client and Syncing MySQL Database...
call npx.cmd prisma generate
echo [INFO] กำลังตรวจสอบ/ซิงค์โมเดลกับฐานข้อมูล MySQL (linecheck_plus)...
call npx.cmd prisma db push
if %errorlevel% neq 0 (
    echo [WARN] ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้ กรุณาตรวจสอบว่าเปิด MAMP / MySQL แล้ว
)

echo [3/4] Building Next.js Production App...
call npm.cmd run build

echo.
echo =====================================================================
echo    🚀 STARTING LINECHECK+ SERVER...
echo    • Web Application: http://localhost:3088
echo =====================================================================
echo.

:: Start Next.js Server in separate window
start "LineCheck+ Web Server (Port 3088)" cmd /k "cd /d "%~dp0" && npm.cmd run start"

:: Wait 3 seconds and open default browser
timeout /t 3 /nobreak >nul
start http://localhost:3088

echo [SUCCESS] LineCheck+ is up and running on port 3088!
echo Press any key to close this launcher.
pause >nul
