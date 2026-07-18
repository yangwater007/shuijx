@echo off
:: ???????? ? ????????????????

cd /d D:\quicktiny

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ?????????...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ============================================
echo   ???? ????????
echo ============================================
echo.

schtasks /Delete /TN "QuickTinyUpdateAM" /F 2>nul
schtasks /Delete /TN "QuickTinyUpdatePM" /F 2>nul

schtasks /Create /TN "QuickTinyUpdateAM" /SC DAILY /ST 11:35 /TR "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File D:\quicktiny\auto_update.ps1" /F /RL HIGHEST
schtasks /Create /TN "QuickTinyUpdatePM" /SC DAILY /ST 15:05 /TR "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File D:\quicktiny\auto_update.ps1" /F /RL HIGHEST

echo.
echo ============================================
echo   ???:
echo   ?? 11:35 ? K??? + ????
echo   ?? 15:05 ? K??? + ???? + MCP??
echo   ??: logs\auto_update.log
echo ============================================
pause
