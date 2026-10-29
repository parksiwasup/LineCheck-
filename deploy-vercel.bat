@echo off
title Deploy LineCheck+ to Vercel
cd /d "%~dp0"
echo =====================================================================
echo    DEPLOY LINECHECK+ TO VERCEL (Production: linecheck-plus)
echo =====================================================================
echo.
call npx.cmd vercel --prod --yes --name linecheck-plus
echo.
echo Done! Press any key to close...
pause >nul
