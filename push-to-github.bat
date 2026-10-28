@echo off
chcp 65001 >nul
title Push LineCheck+ to GitHub

echo =====================================================================
echo    🚀 กำลังนำโค้ด LineCheck+ ขึ้น GitHub ของ parksiwasup
echo    Target: https://github.com/parksiwasup/LineCheck-.git
echo =====================================================================
echo.

set GIT_CMD=git
if exist "C:\Users\User\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe" (
    set "GIT_CMD=C:\Users\User\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe"
)

"%GIT_CMD%" push -u origin main --tags

echo.
echo เสร็จสิ้น! กดปุ่มใดก็ได้เพื่อปิดหน้าต่างนี้...
pause >nul
