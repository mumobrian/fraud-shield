import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import joblib

class FraudDataset(Dataset):
    """PyTorch Dataset for fraud transactions"""
    def __init__(self, features, labels):
        self.features = torch.FloatTensor(features)
        self.labels = torch.FloatTensor(labels)
    
    def __len__(self):
        return len(self.labels)
    
    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]

class PyTorchFraudDetector(nn.Module):
    """Neural Network for fraud detection"""
    def __init__(self, input_dim):
        super(PyTorchFraudDetector, self).__init__()
        
        # Architecture
        self.network = nn.Sequential(
            # Layer 1
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            
            # Layer 2
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            
            # Layer 3
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            
            # Layer 4
            nn.Linear(64, 32),
            nn.ReLU(),
            
            # Output layer
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        return self.network(x)

class PyTorchTrainer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.location_encoder = LabelEncoder()
        self.device_encoder = LabelEncoder()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
    def prepare_features(self, df):
        """Prepare features for PyTorch"""
        df = df.copy()
        
        # Encode categorical
        df['location_encoded'] = self.location_encoder.fit_transform(df['location'])
        df['device_encoded'] = self.device_encoder.fit_transform(df['device_id'])
        
        # Time features
        df['hour'] = pd.to_datetime(df['created_at']).dt.hour
        df['day_of_week'] = pd.to_datetime(df['created_at']).dt.dayofweek
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Amount features
        df['log_amount'] = np.log1p(df['amount'])
        df['amount_scaled'] = (df['amount'] - df['amount'].mean()) / df['amount'].std()
        
        # Interaction
        df['location_device'] = df['location_encoded'] * df['device_encoded']
        
        features = [
            'log_amount', 'amount_scaled', 'hour', 'is_weekend',
            'location_encoded', 'device_encoded', 'location_device'
        ]
        
        return df[features].fillna(0).values
    
    def train(self, X, y, epochs=100, batch_size=32, learning_rate=0.001):
        """Train PyTorch model"""
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        
        # Create datasets
        train_dataset = FraudDataset(X_train_scaled, y_train)
        val_dataset = FraudDataset(X_val_scaled, y_val)
        
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size)
        
        # Initialize model
        input_dim = X_train.shape[1]
        self.model = PyTorchFraudDetector(input_dim).to(self.device)
        
        # Loss and optimizer
        criterion = nn.BCELoss()
        optimizer = optim.Adam(self.model.parameters(), lr=learning_rate)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode='min', factor=0.5, patience=5
        )
        
        # Training loop
        best_val_loss = float('inf')
        
        for epoch in range(epochs):
            # Training
            self.model.train()
            train_loss = 0
            train_correct = 0
            train_total = 0
            
            for batch_features, batch_labels in train_loader:
                batch_features = batch_features.to(self.device)
                batch_labels = batch_labels.to(self.device)
                
                # Forward pass
                outputs = self.model(batch_features).squeeze()
                loss = criterion(outputs, batch_labels)
                
                # Backward pass
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
                
                # Calculate accuracy
                predicted = (outputs > 0.5).float()
                train_total += batch_labels.size(0)
                train_correct += (predicted == batch_labels).sum().item()
            
            # Validation
            self.model.eval()
            val_loss = 0
            val_correct = 0
            val_total = 0
            
            with torch.no_grad():
                for batch_features, batch_labels in val_loader:
                    batch_features = batch_features.to(self.device)
                    batch_labels = batch_labels.to(self.device)
                    
                    outputs = self.model(batch_features).squeeze()
                    loss = criterion(outputs, batch_labels)
                    
                    val_loss += loss.item()
                    
                    predicted = (outputs > 0.5).float()
                    val_total += batch_labels.size(0)
                    val_correct += (predicted == batch_labels).sum().item()
            
            # Calculate averages
            train_loss /= len(train_loader)
            val_loss /= len(val_loader)
            train_acc = 100 * train_correct / train_total
            val_acc = 100 * val_correct / val_total
            
            # Learning rate scheduling
            scheduler.step(val_loss)
            
            # Save best model
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                self.best_model_state = self.model.state_dict().copy()
            
            if (epoch + 1) % 10 == 0:
                print(f'Epoch [{epoch+1}/{epochs}], '
                      f'Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%, '
                      f'Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%')
        
        # Load best model
        self.model.load_state_dict(self.best_model_state)
        
        return self.model
    
    def predict(self, amount, location, device_id, timestamp):
        """Predict fraud probability"""
        self.model.eval()
        
        # Prepare features
        data = pd.DataFrame([{
            'amount': amount,
            'location': location,
            'device_id': device_id,
            'created_at': timestamp
        }])
        
        features = self.prepare_features(data)
        features_scaled = self.scaler.transform(features)
        
        # Convert to tensor
        features_tensor = torch.FloatTensor(features_scaled).to(self.device)
        
        # Predict
        with torch.no_grad():
            risk_score = float(self.model(features_tensor).cpu().numpy()[0][0])
        
        return risk_score
    
    def save_model(self, path='../data/models/pytorch_model.pt'):
        """Save model"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'scaler': self.scaler,
            'location_encoder': self.location_encoder,
            'device_encoder': self.device_encoder,
            'input_dim': self.model.network[0].in_features
        }, path)
    
    def load_model(self, path='../data/models/pytorch_model.pt'):
        """Load model"""
        checkpoint = torch.load(path, map_location=self.device)
        
        input_dim = checkpoint['input_dim']
        self.model = PyTorchFraudDetector(input_dim).to(self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        
        self.scaler = checkpoint['scaler']
        self.location_encoder = checkpoint['location_encoder']
        self.device_encoder = checkpoint['device_encoder']