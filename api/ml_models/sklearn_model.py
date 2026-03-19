import numpy as np
import pandas as pd
from sklearn.ensemble import (
    RandomForestClassifier, 
    GradientBoostingClassifier,
    VotingClassifier
)
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import cross_val_score, GridSearchCV
import joblib
import warnings
warnings.filterwarnings('ignore')

class SklearnFraudDetector:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.location_encoder = LabelEncoder()
        self.device_encoder = LabelEncoder()
        self.feature_names = []
        
    def create_features(self, df):
        """Advanced feature engineering"""
        df = df.copy()
        
        # Amount features
        df['log_amount'] = np.log1p(df['amount'])
        
        # Time features
        df['hour'] = pd.to_datetime(df['created_at']).dt.hour
        df['day_of_week'] = pd.to_datetime(df['created_at']).dt.dayofweek
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)
        
        # Location features
        df['location_encoded'] = self.location_encoder.fit_transform(df['location'])
        
        # Device features
        df['device_encoded'] = self.device_encoder.fit_transform(df['device_id'])
        
        # Interaction features
        df['amount_x_location'] = df['log_amount'] * df['location_encoded']
        df['amount_x_device'] = df['log_amount'] * df['device_encoded']
        
        # Global statistics
        df['amount_vs_global_avg'] = df['amount'] / (df['amount'].mean() + 1)
        
        # Select features
        self.feature_names = [
            'log_amount', 'hour', 'is_weekend', 'is_night',
            'location_encoded', 'device_encoded',
            'amount_x_location', 'amount_x_device',
            'amount_vs_global_avg'
        ]
        
        # Ensure all features exist
        return df[self.feature_names].fillna(0).values
    
    def build_ensemble_model(self):
        """Create voting ensemble of multiple models"""
        # Individual models
        rf = RandomForestClassifier(
            n_estimators=100,  # Reduced for faster training
            max_depth=10,
            min_samples_split=5,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        
        gb = GradientBoostingClassifier(
            n_estimators=100,  # Reduced for faster training
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        
        lr = LogisticRegression(
            C=1.0,
            class_weight='balanced',
            max_iter=500,
            random_state=42,
            n_jobs=-1
        )
        
        # Create voting ensemble
        self.model = VotingClassifier(
            estimators=[
                ('random_forest', rf),
                ('gradient_boosting', gb),
                ('logistic', lr)
            ],
            voting='soft',
            weights=[2, 2, 1]
        )
        
        return self.model
    
    def train(self, X, y):
        """Simple training without grid search"""
        X_scaled = self.scaler.fit_transform(X)
        self.model = self.build_ensemble_model()
        self.model.fit(X_scaled, y)
        
        # Cross-validation score
        try:
            cv_scores = cross_val_score(self.model, X_scaled, y, cv=3, scoring='roc_auc')
            print(f"Cross-validation AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        except:
            print("Could not compute cross-validation scores")
        
        return self.model
    
    def predict(self, amount, location, device_id, timestamp, user_id=None):
        """Predict fraud probability"""
        # Create feature dataframe
        data = pd.DataFrame([{
            'amount': amount,
            'location': location,
            'device_id': device_id,
            'created_at': timestamp,
            'user_id': user_id if user_id else 1
        }])
        
        # Create features
        features = self.create_features(data)
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Get probability
        risk_score = float(self.model.predict_proba(features_scaled)[0][1])
        
        return risk_score
    
    def save_model(self, path='../data/models/sklearn_model.pkl'):
        """Save model"""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'location_encoder': self.location_encoder,
            'device_encoder': self.device_encoder,
            'feature_names': self.feature_names
        }, path)
        print(f"✅ Model saved to {path}")
    
    def load_model(self, path='../data/models/sklearn_model.pkl'):
        """Load model"""
        import os
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
            
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.location_encoder = data['location_encoder']
        self.device_encoder = data['device_encoder']
        self.feature_names = data['feature_names']
        print(f"✅ Model loaded from {path}")