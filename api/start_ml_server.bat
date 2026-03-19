@echo off
cd /d C:\xampp80\htdocs\fraud-shield\api\ml_models
echo Starting ML Server...
echo Using: py
py --version
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.
echo Starting server on port 5000...
py model_server.py
pause