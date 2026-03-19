@echo off
echo Testing ML Server Connection
echo ============================
echo.

echo 1. Checking if server is running:
curl -s http://localhost:5000/health > tmp.txt
if %errorlevel% equ 0 (
    echo ✅ Server is running!
    type tmp.txt
) else (
    echo ❌ Server is not running or not accessible
    echo.
    echo Try starting the server first:
    echo   cd C:\xampp80\htdocs\fraud-shield\api\ml_models
    echo   py model_server.py
)
echo.
del tmp.txt 2>nul
pause