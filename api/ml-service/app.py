from flask import Flask, request, jsonify
import random

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json

    amount = data['amount']

    # Fake ML logic (replace later with real model)
    risk = 0

    if amount > 5000:
        risk += 0.6

    if data['location'] != "Nairobi":
        risk += 0.3

    if data['device'] != "device-1001":
        risk += 0.2

    return jsonify({
        "risk_score": risk
    })

if __name__ == '__main__':
    app.run(port=5000)