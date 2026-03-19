# fix_tensorflow_save_fixed.py
"""
Quick patch for tensorflow_model.py to fix saving issue
Run this before training: python fix_tensorflow_save_fixed.py
"""

import re

# Read the file with UTF-8 encoding
with open('tensorflow_model.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the save_model method
save_pattern = r'def save_model\(self, path=.*?\):.*?(?=def|$)'
save_replacement = '''def save_model(self, path='../data/models/tf_model/'):
        """Save model and encoders"""
        import os
        # Create directory if it doesn't exist
        os.makedirs(path, exist_ok=True)
        
        # Save with .keras extension (Keras v3 format)
        model_path = os.path.join(path, 'model.keras')
        self.model.save(model_path)
        
        # Save encoders
        import joblib
        joblib.dump(self.scaler, os.path.join(path, 'scaler.pkl'))
        joblib.dump(self.location_encoder, os.path.join(path, 'location_encoder.pkl'))
        joblib.dump(self.device_encoder, os.path.join(path, 'device_encoder.pkl'))
        
        print(f"Model saved to {model_path}")'''

content = re.sub(save_pattern, save_replacement, content, flags=re.DOTALL)

# Fix the load_model method
load_pattern = r'def load_model\(self, path=.*?\):.*?(?=def|$)'
load_replacement = '''def load_model(self, path='../data/models/tf_model/'):
        """Load saved model"""
        import os
        import joblib
        
        # Load model from .keras file
        model_path = os.path.join(path, 'model.keras')
        self.model = tf.keras.models.load_model(model_path)
        
        # Load encoders
        self.scaler = joblib.load(os.path.join(path, 'scaler.pkl'))
        self.location_encoder = joblib.load(os.path.join(path, 'location_encoder.pkl'))
        self.device_encoder = joblib.load(os.path.join(path, 'device_encoder.pkl'))
        
        print(f"Model loaded from {model_path}")'''

content = re.sub(load_pattern, load_replacement, content, flags=re.DOTALL)

# Write back with UTF-8 encoding
with open('tensorflow_model.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed tensorflow_model.py - now uses .keras format")
print("You can now run: python train_model.py")