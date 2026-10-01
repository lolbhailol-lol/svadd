@echo off
cd /d "%~dp0"
title Svvad Pro Stall
echo ========================================================
echo   SVVAD PRO stall counter
echo   Stock, sales, samples, and the official billing Excel
echo ========================================================
echo.
where python >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Install Python, then double-click this file again.
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo First-time setup: building the stall screen...
  call npm run build
  if errorlevel 1 (
    echo Build failed. Install Node.js, then double-click this file again.
    pause
    exit /b 1
  )
)
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo Stall counter is already running.
  echo Open this on the stall laptop:  http://localhost:5000
  echo.
  echo Use the same browser for the whole event.
  echo At the end of the day, click Download Excel.
  start "" "http://localhost:5000"
  exit /b 0
)
echo Open this on the stall laptop:  http://localhost:5000
echo.
echo Use the same browser for the whole event.
echo At the end of the day, click Download Excel.
echo The file uses the same Biling Sheet as Billing_Format.xlsx.
echo.
start "" "http://localhost:5000"
python server.py
pause
