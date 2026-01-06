@echo off
REM Time Tracking App - Development Startup Script (Windows)

echo 🚀 Starting Time Tracking App Development Environment...

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install Node.js and npm first.
    pause
    exit /b 1
)

REM Check npm version
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo 📦 Using npm version: %NPM_VERSION%

REM Function to install dependencies if node_modules doesn't exist
if not exist "frontend\node_modules" (
    echo 📥 Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
) else (
    echo ✅ Frontend dependencies already installed
)

if not exist "infrastructure\node_modules" (
    echo 📥 Installing infrastructure dependencies...
    cd infrastructure
    npm install
    cd ..
) else (
    echo ✅ Infrastructure dependencies already installed
)

echo.
echo 🎯 Development environment setup complete!
echo.
echo Available commands:
echo   Frontend development server:
echo     cd frontend ^&^& npm run dev
echo.
echo   Infrastructure deployment:
echo     cd infrastructure ^&^& npm run deploy
echo.
echo   Infrastructure synthesis (dry-run):
echo     cd infrastructure ^&^& npm run synth
echo.

REM Start frontend development server
echo 🌐 Starting frontend development server...
cd frontend
npm run dev