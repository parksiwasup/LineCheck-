@echo off
chcp 65001 >nul
title LineCheck+ - ติดตั้งฐานข้อมูล (Setup Database)
color 0b
cd /d "%~dp0"

echo ===================================================
echo   LineCheck+ ^| นำเข้าฐานข้อมูลและข้อมูลเริ่มต้น
echo ===================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH!
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

echo กำลังนำเข้าตารางและข้อมูลตัวอย่าง...
echo.

call npx.cmd tsx scripts\import-database.ts

if %ERRORLEVEL% equ 0 (
  echo.
  echo [OK] นำเข้าฐานข้อมูลสำเร็จเรียบร้อย!
  echo พร้อมเปิดใช้งานผ่าน dev.bat หรือ Navicat ได้ทันที
) else (
  echo.
  echo [ERROR] ไม่สามารถนำเข้าฐานข้อมูลได้ กรุณาตรวจสอบสถานะของฐานข้อมูล หรือค่าใน .env
)

echo.
pause
