@echo off
echo Installing TensorFlow and dependencies for Python 3.12
echo ======================================================
echo.

cd /d C:\xampp80\htdocs\fraud-shield\api\ml_models

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 1: Installing TensorFlow CPU version...
pip install tensorflow-cpu==2.15.0

if %errorlevel% neq 0 (
    echo.
    echo Step 2: Trying alternative TensorFlow version...
    pip install tensorflow==2.15.0
)

if %errorlevel% neq 0 (
    echo.
    echo Step 3: Trying latest TensorFlow...
    pip install tensorflow
)

echo.
echo Step 4: Verifying installation...
python -c "import tensorflow as tf; print('TensorFlow version:', tf.__version__)"

echo.
echo Step 5: Testing TensorFlow...
python -c "import tensorflow as tf; print('GPU Available:', tf.config.list_physical_devices('GPU'))"

echo.
echo ✅ TensorFlow installation complete!
pause