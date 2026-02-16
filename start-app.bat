@echo off
REM NovelAI Metadata Viewer - Launcher Script for Windows
REM This script automatically starts the development server and opens the app in your browser

echo.
echo ========================================
echo   NovelAI Metadata Viewer
echo ========================================
echo.

REM Get the directory where this batch file is located
cd /d %~dp0

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies ^(first time setup^)...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies.
        echo Make sure Node.js is installed: https://nodejs.org
        pause
        exit /b 1
    )
)

REM Start the development server
echo.
echo Starting development server...
echo The app will open in your browser automatically.
echo.
echo Press Ctrl+C to stop the server when done.
echo ========================================
echo.

call npm run dev -- --open

REM If there's an error, pause so user can see it
if errorlevel 1 (
    echo.
    echo ERROR: Failed to start the app.
    pause
)
