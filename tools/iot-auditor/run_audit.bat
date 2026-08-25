@echo off
title IoT & Camera/PA Security Auditor
chcp 65001 >nul
echo ======================================================================
echo       IoT & Camera/PA System Security Auditor (One-Click)
echo ======================================================================
echo.
echo [*] Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python is not found on your system! Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo [*] Launching Smart Auto-Discovery and Vulnerability Audit...
python run.py

echo.
echo ======================================================================
echo [*] Audit finished.
pause
