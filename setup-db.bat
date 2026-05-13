@echo off
echo ========================================
echo TIISGS Database Setup Script
echo ========================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo PostgreSQL (psql) not found in PATH.
    echo Please install PostgreSQL from https://www.postgresql.org/download/
    echo OR use Docker: docker-compose up -d
    echo.
    pause
    exit /b 1
)

echo Creating database 'tiisgs_db'...
psql -U postgres -c "DROP DATABASE IF EXISTS tiisgs_db;"
psql -U postgres -c "CREATE DATABASE tiisgs_db;"

echo Running schema...
psql -U postgres -d tiisgs_db -f "%~dp0database\schema.sql"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================
    echo Database setup complete!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Start backend: cd backend ^&^& npm run dev
    echo 2. Start frontend: cd frontend ^&^& npm run dev
    echo 3. Open http://localhost:3000
    echo.
) else (
    echo.
    echo Error running schema. Check the error above.
    echo.
)

pause