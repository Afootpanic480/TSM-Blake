@echo off
echo ========================================
echo  Blake's Encryptor/Decryptor Launcher
echo ========================================
echo.
echo Starting local server...
echo.

REM Try Python first
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python found. Starting server on http://localhost:8000
    echo.
    echo Opening browser in 3 seconds...
    timeout /t 3 >nul
    start http://localhost:8000/Main.html
    echo.
    echo ========================================
    echo Server is running!
    echo Open: http://localhost:8000/Main.html
    echo.
    echo Press CTRL+C to stop the server
    echo ========================================
    echo.
    python -m http.server 8000
    goto :end
)

REM Try PHP if Python not found
where php >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] PHP found. Starting server on http://localhost:8000
    echo.
    echo Opening browser in 3 seconds...
    timeout /t 3 >nul
    start http://localhost:8000/Main.html
    echo.
    echo ========================================
    echo Server is running!
    echo Open: http://localhost:8000/Main.html
    echo.
    echo Press CTRL+C to stop the server
    echo ========================================
    echo.
    php -S localhost:8000
    goto :end
)

REM Try Node.js if neither found
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js found. Installing http-server...
    echo.
    call npx -y http-server -p 8000 -o /Main.html
    goto :end
)

REM Nothing found
echo [ERROR] No web server found!
echo.
echo Please install one of the following:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo   - PHP: https://www.php.net/downloads
echo.
echo After installation, run this file again.
echo.
pause

:end
