@echo off
echo Setting up local development environment...

:: Check if PostgreSQL is running
pg_isready >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo PostgreSQL is not running! Please start PostgreSQL first.
    exit /b 1
)

:: Create the database if it doesn't exist
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'recipe_db'" | findstr /C:"1 row" >nul
if %ERRORLEVEL% neq 0 (
    echo Creating database recipe_db...
    psql -U postgres -c "CREATE DATABASE recipe_db;"
)

:: Create uploads directory if it doesn't exist
if not exist "uploads" mkdir uploads

:: Start the server
echo Starting server...
npm run dev
