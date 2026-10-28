@echo off
chcp 65001 >nul
title Deploy LineCheck+ to Vercel

echo =====================================================================
echo    ▲ DEPLOY LINECHECK+ TO VERCEL (Production)
echo =====================================================================
echo.

cd /d "%~dp0"
call npx.cmd vercel --prod --yes

echo.
echo เสร็จสิ้น! กดปุ่มใดก็ได้เพื่อปิดหน้าต่างนี้...
pause >nul
