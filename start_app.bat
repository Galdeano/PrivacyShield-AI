@echo off
echo ====================================================
echo Starting PrivacyShield AI Text Anonymizer...
echo ====================================================

cd /d "%~dp0"

:: Check virtual environment
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in venv\
    pause
    exit /b
)

:: Ensure frontend build exists
if not exist "frontend\dist\index.html" (
    echo Building frontend UI...
    cd frontend
    call npm run build:vite
    cd ..
)

:: Launch Electron app directly (main.js spawns the Python engine automatically)
echo Launching Desktop Application...
cd frontend
call npx electron .
cd ..

echo App closed.
