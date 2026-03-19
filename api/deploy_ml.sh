#!/bin/bash

echo "🚀 Deploying ML Models for Fraud Shield"
echo "========================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create directories
echo "📁 Creating directories..."
mkdir -p ../data/models
mkdir -p ../data/training_data
echo "✅ Directories created"
echo ""

# Check if Python is installed
echo "🐍 Checking Python installation..."
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
    echo "✅ Python 3 found"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
    echo "✅ Python found"
else
    echo "❌ Python not found! Please install Python 3.8 or higher"
    exit 1
fi

# Check Python version
$PYTHON_CMD --version
echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd ml_models

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash)
    source venv/Scripts/activate
else
    # Linux/Mac
    source venv/bin/activate
fi

# Install requirements
echo "Installing packages from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed successfully"
echo ""

# Generate training data and train models
echo "🤖 Training ML models (this may take a few minutes)..."
echo "   Training on 20,000 synthetic transactions..."
$PYTHON_CMD train_model.py

if [ $? -ne 0 ]; then
    echo "❌ Model training failed"
    exit 1
fi
echo "✅ Models trained successfully"
echo ""

# Check if training produced model files
echo "📊 Verifying model files..."
MODEL_FILES=(
    "../data/models/tf_model/saved_model.pb"
    "../data/models/sklearn_model.pkl"
    "../data/models/pytorch_model.pt"
)

MISSING=0
for file in "${MODEL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ Found: $file"
    else
        echo "   ❌ Missing: $file"
        MISSING=1
    fi
done

if [ $MISSING -eq 1 ]; then
    echo "⚠️  Some model files are missing, but continuing..."
fi
echo ""

# Kill any existing ML server process
echo "🔄 Stopping any existing ML server..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    taskkill /F /IM python.exe 2>/dev/null || true
else
    # Linux/Mac
    pkill -f "python.*model_server" 2>/dev/null || true
fi
sleep 2
echo "✅ Existing server stopped"
echo ""

# Start ML server
echo "🌐 Starting ML model server on port 5000..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows - start in background
    start /B $PYTHON_CMD model_server.py > ../ml_server.log 2>&1
else
    # Linux/Mac - start with nohup
    nohup $PYTHON_CMD model_server.py > ../ml_server.log 2>&1 &
fi

# Wait for server to start
echo "   Waiting for server to start..."
sleep 5

# Test if server is running
echo "   Testing server connection..."
TEST_RESPONSE=$(curl -s http://localhost:5000/health)

if [[ "$TEST_RESPONSE" == *"healthy"* ]]; then
    echo "✅ ML Server is running!"
else
    echo "⚠️  Server may not be running. Check ml_server.log for details"
fi

echo ""
echo "📝 Server logs: tail -f api/ml_server.log"
echo "📊 Test server: curl http://localhost:5000/health"
echo ""
echo "========================================"s
echo "🎉 ML Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Check server status: curl http://localhost:5000/health"
echo "2. Test prediction: curl -X POST http://localhost:5000/predict -H \"Content-Type: application/json\" -d '{\"amount\":5000,\"location\":\"Nairobi\",\"device\":\"device-1001\"}'"
echo "3. View logs: cat api/ml_server.log"
echo "4. If server fails, run manually: cd api/ml_models && python model_server.py"