#!/usr/bin/env python3
"""
Train all ML models on historical transaction data
Run: python train_model.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import json
from tensorflow_model import TensorFlowFraudDetector
from sklearn_model import SklearnFraudDetector
from pytorch_model import PyTorchTrainer

def generate_training_data(n_samples=10000):
    """Generate synthetic training data"""
    print(f"Generating {n_samples} training samples...")
    
    data = []
    locations = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru']
    devices = [f'device-{i:04d}' for i in range(1, 21)]
    
    for i in range(n_samples):
        # Generate random transaction
        amount = random.uniform(100, 50000)
        location = random.choice(locations)
        device = random.choice(devices)
        
        # Create timestamp in last 30 days
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        timestamp = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
        
        # Determine if fraud (for training labels)
        # Fraud patterns:
        # 1. Very large amounts
        # 2. Unusual locations for device
        # 3. Night transactions with high amounts
        # 4. New devices with large amounts
        
        is_fraud = 0
        
        # Large amount fraud
        if amount > 30000:
            is_fraud = 1
        # Unusual location
        elif location == 'Mombasa' and device in ['device-0001', 'device-0002']:
            is_fraud = random.choice([0, 1])  # 50% chance
        # Night fraud
        elif timestamp.hour >= 23 or timestamp.hour <= 4:
            if amount > 20000:
                is_fraud = 1
            elif amount > 10000:
                is_fraud = random.choice([0, 1])
        # Random fraud (10% of transactions)
        else:
            is_fraud = 1 if random.random() < 0.1 else 0
        
        data.append({
            'amount': amount,
            'location': location,
            'device_id': device,
            'created_at': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'is_fraud': is_fraud,
            'user_id': random.randint(1, 100)
        })
    
    df = pd.DataFrame(data)
    print(f"Generated {len(df)} samples, {df['is_fraud'].sum()} fraud cases")
    return df

def load_feedback_data():
    """Load user feedback for retraining"""
    feedback_file = '../data/feedback/feedback_log.json'
    if not os.path.exists(feedback_file):
        return None
    
    feedback = []
    with open(feedback_file, 'r') as f:
        for line in f:
            try:
                feedback.append(json.loads(line))
            except:
                continue
    
    if not feedback:
        return None
    
    # Convert to DataFrame
    df = pd.DataFrame(feedback)
    print(f"Loaded {len(df)} feedback samples")
    return df

def train_all_models(use_feedback=True):
    """Train all three ML models"""
    
    print("=" * 50)
    print("FRAUD DETECTION MODEL TRAINING")
    print("=" * 50)
    
    # Generate training data
    df = generate_training_data(20000)
    
    # If feedback available, incorporate it
    if use_feedback:
        feedback_df = load_feedback_data()
        if feedback_df is not None:
            # Convert feedback to training format
            feedback_df['is_fraud'] = feedback_df['was_fraud']
            feedback_df['created_at'] = datetime.now().isoformat()
            
            # Append to training data
            df = pd.concat([df, feedback_df], ignore_index=True)
            print(f"Incorporated {len(feedback_df)} feedback samples")
    
    # Prepare features and labels
    X = df[['amount', 'location', 'device_id', 'created_at', 'user_id']]
    y = df['is_fraud'].values
    
    # 1. Train TensorFlow Model
    print("\n" + "=" * 30)
    print("Training TensorFlow Model...")
    print("=" * 30)
    
    tf_detector = TensorFlowFraudDetector()
    X_tf = tf_detector.prepare_features(df)
    tf_detector.train(X_tf, y, epochs=30)
    tf_detector.save_model('../data/models/tf_model/')
    
    # Test TensorFlow
    test_pred = tf_detector.predict(25000, 'Nairobi', 'device-1001', datetime.now())
    print(f"TensorFlow test prediction: {test_pred:.4f}")
    
    # 2. Train Scikit-learn Model
    print("\n" + "=" * 30)
    print("Training Scikit-learn Model...")
    print("=" * 30)
    
    sklearn_detector = SklearnFraudDetector()
    X_sk = sklearn_detector.create_features(df)
    sklearn_detector.train(X_sk, y)
    sklearn_detector.save_model('../data/models/sklearn_model.pkl')
    
    # Test Scikit-learn
    test_pred = sklearn_detector.predict(25000, 'Nairobi', 'device-1001', datetime.now())
    print(f"Scikit-learn test prediction: {test_pred:.4f}")
    
    # 3. Train PyTorch Model
    print("\n" + "=" * 30)
    print("Training PyTorch Model...")
    print("=" * 30)
    
    pytorch_trainer = PyTorchTrainer()
    X_pt = pytorch_trainer.prepare_features(df)
    pytorch_trainer.train(X_pt, y, epochs=50)
    pytorch_trainer.save_model('../data/models/pytorch_model.pt')
    
    # Test PyTorch
    test_pred = pytorch_trainer.predict(25000, 'Nairobi', 'device-1001', datetime.now())
    print(f"PyTorch test prediction: {test_pred:.4f}")
    
    print("\n" + "=" * 50)
    print("✅ All models trained and saved successfully!")
    print("=" * 50)
    
    return {
        'tensorflow': tf_detector,
        'sklearn': sklearn_detector,
        'pytorch': pytorch_trainer
    }

if __name__ == "__main__":
    models = train_all_models()