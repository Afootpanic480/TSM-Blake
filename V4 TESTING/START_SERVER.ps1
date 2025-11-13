# Blake's Encryptor/Decryptor Launcher (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Blake's Encryptor/Decryptor Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "[OK] Python found. Starting server..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Opening browser in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:8000/Main.html"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Server is running!" -ForegroundColor Green
    Write-Host "URL: http://localhost:8000/Main.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press CTRL+C to stop the server" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    python -m http.server 8000
    exit
}

# Check for PHP
if (Get-Command php -ErrorAction SilentlyContinue) {
    Write-Host "[OK] PHP found. Starting server..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Opening browser in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:8000/Main.html"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Server is running!" -ForegroundColor Green
    Write-Host "URL: http://localhost:8000/Main.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press CTRL+C to stop the server" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    php -S localhost:8000
    exit
}

# Check for Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "[OK] Node.js found. Starting server..." -ForegroundColor Green
    Write-Host ""
    npx -y http-server -p 8000 -o /Main.html
    exit
}

# Nothing found
Write-Host "[ERROR] No web server found!" -ForegroundColor Red
Write-Host ""
Write-Host "Please install one of the following:" -ForegroundColor Yellow
Write-Host "  - Python: https://www.python.org/downloads/" -ForegroundColor White
Write-Host "  - Node.js: https://nodejs.org/" -ForegroundColor White
Write-Host "  - PHP: https://www.php.net/downloads" -ForegroundColor White
Write-Host ""
Write-Host "After installation, run this file again." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
