@echo off
echo 🚀 Deploying ML Models for Fraud Shield (Python 3.12 Version)
echo ============================================================
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo 📁 Creating directories...
if not exist "..\data\models" mkdir "..\data\models"
if not exist "..\data\training_data" mkdir "..\data\training_data"
echo ✅ Directories created
echo.

REM Try to find Python 3.12
set PYTHON_CMD=

echo 🔍 Looking for Python 3.12...

REM Check common Python 3.12 locations
if exist "C:\Python312\python.exe" (
    set PYTHON_CMD=C:\Python312\python.exe
    echo ✅ Found Python 3.12 at C:\Python312\python.exe
    goto :python_found
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe" (
    set PYTHON_CMD=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe
    echo ✅ Found Python 3.12 at %PYTHON_CMD%
    goto :python_found
)

REM Try using py launcher to get Python 3.12
py -3.12 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py -3.12
    echo ✅ Found Python 3.12 via py launcher
    goto :python_found
)

echo ❌ Python 3.12 not found!
echo.
echo Please install Python 3.12 from: https://www.python.org/downloads/
echo.
echo During installation, make sure to check:
echo   ✅ "Add Python to PATH"
echo.
pause
exit /b 1

:python_found
echo Using: %PYTHON_CMD%
%PYTHON_CMD% --version
echo.

echo 📦 Installing Python dependencies...
cd ml_models

REM Create virtual environment with Python 3.12
if not exist "venv" (
    echo Creating virtual environment with Python 3.12...
    %PYTHON_CMD% -m venv venv
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install compatible versions for Python 3.12
echo Installing packages compatible with Python 3.12...

pip install tensorflow==2.15.0
pip install scikit-learn==1.3.2
pip install torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cpu
pip install numpy==1.24.3
pip install pandas==2.1.4
pip install flask==3.0.0
pip install flask-cors==4.0.0
pip install joblib==1.3.2
pip install python-dateutil==2.8.2
pip install pytz==2023.3

echo ✅ Dependencies installed successfully
echo.

echo 🤖 Training ML models (this may take 2-3 minutes)...
echo    Training on 20,000 synthetic transactions...
python train_model.py

if %errorlevel% neq 0 (
    echo ❌ Model training failed
    echo.
    echo Check the error message above
    pause
    exit /b 1
)
echo ✅ Models trained successfully
echo.

echo 📊 Verifying model files...
set MISSING=0

if exist "..\data\models\tf_model\saved_model.pb" (
    echo    ✅ Found: TensorFlow model
) else (
    echo    ❌ Missing: TensorFlow model
    set MISSING=1
)

if exist "..\data\models\sklearn_model.pkl" (
    echo    ✅ Found: Scikit-learn model
) else (
    echo    ❌ Missing: Scikit-learn model
    set MISSING=1
)

if exist "..\data\models\pytorch_model.pt" (
    echo    ✅ Found: PyTorch model
) else (
    echo    ❌ Missing: PyTorch model
    set MISSING=1
)

if %MISSING% equ 1 (
    echo ⚠️  Some model files are missing
) else (
    echo ✅ All model files present!
)
echo.

echo 🔄 Stopping any existing ML server...
taskkill /F /IM python.exe 2>nul
timeout /t 3 /nobreak >nul
echo ✅ Existing server stopped
echo.

echo 🌐 Starting ML model server on port 5000...
echo This will run in the background
start /B python model_server.py > ..\ml_server.log 2>&1

echo    Waiting for server to start (5 seconds)...
timeout /t 5 /nobreak >nul

echo    Testing server connection...
curl -s http://localhost:5000/health >nul

if %errorlevel% equ 0 (
    echo ✅ ML Server is running on http://localhost:5000
) else (
    echo ⚠️  Server may not be running. Check logs below
    echo.
    echo Last 10 lines of log:
    echo ------------------------
    type ..\ml_server.log 2>nul
)

echo.
echo 📝 Server log location: C:\xampp80\htdocs\fraud-shield\api\ml_server.log
echo.
echo ========================================
echo 🎉 ML Deployment Complete!
echo ========================================
echo.
pause