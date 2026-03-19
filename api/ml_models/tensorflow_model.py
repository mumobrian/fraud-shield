import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import os

class TensorFlowFraudDetector:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.location_encoder = LabelEncoder()
        self.device_encoder = LabelEncoder()
        
    def prepare_features(self, df):
        """Convert raw data to features"""
        # Make a copy to avoid modifying original
        df = df.copy()
        
        # Encode categorical data
        df['location_encoded'] = self.location_encoder.fit_transform(df['location'])
        df['device_encoded'] = self.device_encoder.fit_transform(df['device_id'])
        
        # Create time-based features
        df['hour'] = pd.to_datetime(df['created_at']).dt.hour
        df['day_of_week'] = pd.to_datetime(df['created_at']).dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Create amount features
        df['log_amount'] = np.log1p(df['amount'])
        
        # Select features for model
        features = [
            'log_amount', 
            'location_encoded', 
            'device_encoded', 
            'hour', 
            'is_weekend'
        ]
        
        return df[features].values
    
    def build_model(self, input_dim):
        """Build TensorFlow neural network"""
        model = tf.keras.Sequential([
            # Input layer
            tf.keras.layers.Dense(128, activation='relu', input_shape=(input_dim,)),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dropout(0.3),
            
            # Hidden layers
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dropout(0.3),
            
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.BatchNormalization(),
            
            # Output layer (fraud probability)
            tf.keras.layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
        )
        
        return model
    
    def train(self, X, y, epochs=50, batch_size=32, validation_split=0.2):
        """Train the model"""
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=validation_split, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        
        # Build model
        self.model = self.build_model(X_train.shape[1])
        
        # Train with callbacks
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss', 
                patience=5, 
                restore_best_weights=True,
                verbose=1
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss', 
                factor=0.5, 
                patience=3,
                verbose=1,
                min_lr=0.00001
            )
        ]
        
        history = self.model.fit(
            X_train_scaled, y_train,
            validation_data=(X_val_scaled, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        print(f"Training complete - Final validation accuracy: {history.history['val_accuracy'][-1]:.4f}")
        return history
    
    def predict(self, amount, location, device_id, timestamp):
        """Predict fraud probability for a single transaction"""
        # Create feature array
        data = pd.DataFrame([{
            'amount': amount,
            'location': location,
            'device_id': device_id,
            'created_at': timestamp
        }])
        
        # Prepare features
        features = self.prepare_features(data)
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Predict
        risk_score = float(self.model.predict(features_scaled, verbose=0)[0][0])
        
        return risk_score
    
    def predict_batch(self, transactions_df):
        """Predict fraud probability for multiple transactions"""
        features = self.prepare_features(transactions_df)
        features_scaled = self.scaler.transform(features)
        predictions = self.model.predict(features_scaled, verbose=0)
        return predictions.flatten()
    
    def save_model(self, path='../data/models/tf_model/'):
        """Save model and encoders"""
        # Create directory if it doesn't exist
        os.makedirs(path, exist_ok=True)
        
        # Save with .keras extension (Keras v3 format)
        model_path = os.path.join(path, 'model.keras')
        self.model.save(model_path)
        
        # Save encoders
        joblib.dump(self.scaler, os.path.join(path, 'scaler.pkl'))
        joblib.dump(self.location_encoder, os.path.join(path, 'location_encoder.pkl'))
        joblib.dump(self.device_encoder, os.path.join(path, 'device_encoder.pkl'))
        
        print(f"✅ Model saved to {model_path}")
    
    def load_model(self, path='../data/models/tf_model/'):
        """Load saved model"""
        # Load model from .keras file
        model_path = os.path.join(path, 'model.keras')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        self.model = tf.keras.models.load_model(model_path)
        
        # Load encoders
        scaler_path = os.path.join(path, 'scaler.pkl')
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
        
        loc_encoder_path = os.path.join(path, 'location_encoder.pkl')
        if os.path.exists(loc_encoder_path):
            self.location_encoder = joblib.load(loc_encoder_path)
        
        dev_encoder_path = os.path.join(path, 'device_encoder.pkl')
        if os.path.exists(dev_encoder_path):
            self.device_encoder = joblib.load(dev_encoder_path)
        
        print(f"✅ Model loaded from {model_path}")
        return self.model
    
    def get_feature_importance(self):
        """Get feature importance (approximation for neural networks)"""
        # This is a simplified version - for real importance use SHAP or LIME
        if self.model is None:
            return {}
        
        # Get weights from first layer as rough importance
        first_layer_weights = self.model.layers[0].get_weights()[0]
        importance = np.mean(np.abs(first_layer_weights), axis=1)
        
        feature_names = ['log_amount', 'location', 'device', 'hour', 'is_weekend']
        importance_dict = dict(zip(feature_names, importance))
        
        # Sort by importance
        return dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))