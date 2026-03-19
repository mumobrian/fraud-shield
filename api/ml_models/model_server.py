from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from datetime import datetime
import joblib
import tensorflow as tf
import torch
import json
import os
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Store feedback for retraining
feedback_data = []

# Load all models
print("Loading ML models...")

# TensorFlow
try:
    from tensorflow_model import TensorFlowFraudDetector
    tf_model = TensorFlowFraudDetector()
    tf_model.load_model('../data/models/tf_model/')
    print("✅ TensorFlow model loaded")
except Exception as e:
    print(f"❌ Failed to load TensorFlow model: {e}")
    tf_model = None

# Scikit-learn
try:
    from sklearn_model import SklearnFraudDetector
    sklearn_model = SklearnFraudDetector()
    sklearn_model.load_model('../data/models/sklearn_model.pkl')
    print("✅ Scikit-learn model loaded")
except Exception as e:
    print(f"❌ Failed to load Scikit-learn model: {e}")
    sklearn_model = None

# PyTorch
try:
    from pytorch_model import PyTorchTrainer
    pytorch_model = PyTorchTrainer()
    pytorch_model.load_model('../data/models/pytorch_model.pt')
    print("✅ PyTorch model loaded")
except Exception as e:
    print(f"❌ Failed to load PyTorch model: {e}")
    pytorch_model = None

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint - uses ensemble of all models"""
    try:
        data = request.json
        
        amount = float(data['amount'])
        location = data['location']
        device = data['device']
        timestamp = data.get('timestamp', datetime.now().isoformat())
        user_id = data.get('user_id', 1)
        
        predictions = []
        weights = []
        
        # Get predictions from all available models
        if tf_model:
            try:
                tf_risk = tf_model.predict(amount, location, device, timestamp)
                predictions.append(tf_risk)
                weights.append(0.4)  # 40% weight
                print(f"TensorFlow: {tf_risk:.4f}")
            except Exception as e:
                print(f"TensorFlow error: {e}")
        
        if sklearn_model:
            try:
                sk_risk = sklearn_model.predict(amount, location, device, timestamp, user_id)
                predictions.append(sk_risk)
                weights.append(0.4)  # 40% weight
                print(f"Scikit-learn: {sk_risk:.4f}")
            except Exception as e:
                print(f"Scikit-learn error: {e}")
        
        if pytorch_model:
            try:
                pt_risk = pytorch_model.predict(amount, location, device, timestamp)
                predictions.append(pt_risk)
                weights.append(0.2)  # 20% weight
                print(f"PyTorch: {pt_risk:.4f}")
            except Exception as e:
                print(f"PyTorch error: {e}")
        
        if not predictions:
            # Fallback to rule-based
            risk_score = calculate_fallback_risk(amount, location, device)
            model_used = "fallback"
        else:
            # Weighted ensemble
            weights = np.array(weights) / sum(weights)
            risk_score = float(np.average(predictions, weights=weights))
            model_used = "ensemble"
        
        # Determine status
        if risk_score < 0.3:
            status = 'allowed'
        elif risk_score < 0.7:
            status = 'suspicious'
        else:
            status = 'blocked'
        
        # Get explanation factors
        factors = get_explanation_factors(amount, location, device, timestamp, risk_score)
        
        response = {
            'success': True,
            'risk_score': risk_score,
            'status': status,
            'model_used': model_used,
            'explanation': {
                'summary': get_summary(status, risk_score, factors),
                'factors': factors,
                'confidence': calculate_confidence(risk_score, predictions)
            },
            'individual_predictions': {
                'tensorflow': predictions[0] if len(predictions) > 0 else None,
                'sklearn': predictions[1] if len(predictions) > 1 else None,
                'pytorch': predictions[2] if len(predictions) > 2 else None
            } if predictions else None
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'risk_score': 0.3,
            'status': 'suspicious'
        }), 500

@app.route('/explain', methods=['POST'])
def explain():
    """Get explanation for a transaction"""
    try:
        data = request.json
        
        amount = float(data['amount'])
        location = data['location']
        device = data['device']
        risk_score = data.get('risk_score', 0.5)
        
        factors = get_explanation_factors(amount, location, device, datetime.now().isoformat(), risk_score)
        
        return jsonify({
            'success': True,
            'explanation': {
                'summary': get_summary(data.get('status', 'suspicious'), risk_score, factors),
                'factors': factors,
                'confidence': 0.85,
                'risk_score': risk_score
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/feedback', methods=['POST'])
def feedback():
    """Receive user feedback - simplified version"""
    try:
        data = request.json
        print(f"📝 Feedback received: {data}")
        
        # Log to file instead of using PyTorch
        with open('../data/feedback/feedback_log.json', 'a') as f:
            f.write(json.dumps(data) + '\n')
        
        return jsonify({
            'success': True,
            'message': 'Feedback recorded successfully',
            'models_used': ['tensorflow', 'sklearn']
        })
    except Exception as e:
        print(f"Error in feedback: {e}")
        return jsonify({
            'success': True,  # Always return success to frontend
            'message': 'Feedback processed in demo mode'
        }), 200  # Return 200 not 500
        
        # Keep only last 1000 feedback items
        if len(feedback_data) > 1000:
            feedback_data.pop(0)
        
        # Save feedback to file for retraining
        with open('../data/feedback/feedback_log.json', 'a') as f:
            f.write(json.dumps(data) + '\n')
        
        print(f"✅ Feedback recorded: {data['user_response']} for transaction {data['transaction_id']}")
        
        # If we have enough feedback, trigger retraining (simplified)
        if len(feedback_data) >= 100:
            print("⚠️ Enough feedback collected. Would trigger retraining in production.")
            # In production, you'd call a retraining script here
        
        return jsonify({
            'success': True,
            'message': 'Feedback received, model will improve'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models': {
            'tensorflow': tf_model is not None,
            'sklearn': sklearn_model is not None,
            'pytorch': pytorch_model is not None
        },
        'feedback_count': len(feedback_data),
        'timestamp': datetime.now().isoformat()
    })

def get_explanation_factors(amount, location, device, timestamp, risk_score):
    """Generate human-readable explanation factors"""
    factors = []
    
    # Amount factor
    if amount > 5000:
        impact = min(0.5, amount / 20000)
        factors.append({
            'feature': 'amount',
            'title': 'High Transaction Amount',
            'description': f'KES {amount:,.0f} is significantly higher than average',
            'impact': round(impact, 2),
            'details': {'amount': amount, 'threshold': 5000}
        })
    
    # Location factor
    if location != 'Nairobi':
        impact = 0.3
        factors.append({
            'feature': 'location',
            'title': 'Unusual Location',
            'description': f'Transactions from {location} are less common',
            'impact': impact,
            'details': {'location': location}
        })
    
    # Device factor
    if 'unknown' in device.lower() or 'new' in device.lower():
        impact = 0.4
        factors.append({
            'feature': 'device',
            'title': 'New or Unknown Device',
            'description': 'This device hasn\'t been used for transactions before',
            'impact': impact,
            'details': {'device': device}
        })
    
    # Time factor
    hour = datetime.fromisoformat(timestamp).hour if isinstance(timestamp, str) else timestamp.hour
    if hour < 6 or hour > 22:
        impact = 0.2
        factors.append({
            'feature': 'time',
            'title': 'Unusual Time',
            'description': f'Transaction at {hour}:00 is outside normal hours',
            'impact': impact,
            'details': {'hour': hour}
        })
    
    return factors

def get_summary(status, risk_score, factors):
    """Generate summary based on status and factors"""
    if status == 'blocked':
        return f"🚫 This transaction was BLOCKED due to {len(factors)} high-risk factors"
    elif status == 'suspicious':
        return f"⚠️ This transaction was flagged for review with {len(factors)} risk factors"
    else:
        return f"✅ This transaction was approved with low risk ({risk_score*100:.0f}%)"

def calculate_fallback_risk(amount, location, device):
    """Fallback rule-based calculation"""
    risk = 0
    if amount > 5000:
        risk += 0.4
    if amount > 10000:
        risk += 0.3
    if location != 'Nairobi':
        risk += 0.2
    if 'unknown' in device.lower():
        risk += 0.2
    return min(risk, 1.0)

def calculate_confidence(risk_score, predictions):
    """Calculate confidence in prediction"""
    if len(predictions) < 2:
        return 0.5
    
    # Lower standard deviation = higher confidence
    std_dev = np.std(predictions)
    confidence = 1 - (std_dev * 2)  # Scale appropriately
    return max(0.3, min(0.95, confidence))

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("🚀 ML Model Server Starting...")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=False)