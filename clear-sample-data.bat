@echo off
chcp 65001 >nul
title LineCheck+ - ลบข้อมูลตัวอย่าง (Clear Sample Data)
color 0c
cd /d "%~dp0"

echo ===================================================
echo   LineCheck+ ^| ล้างข้อมูลตัวอย่างนักเรียนและการเช็คชื่อ
echo ===================================================
echo.
echo กำลังลบข้อมูลตัวอย่างทั้งหมด เพื่อเตรียมพร้อมนำเข้าข้อมูลจริง...
echo.

call npx.cmd tsx scripts\clear-sample-data.ts

if %ERRORLEVEL% equ 0 (
  echo.
  echo [OK] ดำเนินการลบข้อมูลตัวอย่างเรียบร้อยแล้ว!
  echo คุณสามารถเปิดระบบและนำเข้าไฟล์ Excel ของจริงได้ทันที
) else (
  echo.
  echo [ERROR] เกิดข้อผิดพลาดในการลบข้อมูล กรุณาตรวจสอบสถานะฐานข้อมูล
)

echo.
pause
