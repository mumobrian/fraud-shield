<?php
// Update in fraud_check.php

function getMLRisk($amount, $location, $device) {
    $cache = RedisCache::getInstance();
    
    $cache_key = "ml_risk:" . md5("{$amount}:{$location}:{$device}");
    
    // Try cache first
    $cached_result = $cache->get($cache_key);
    if ($cached_result !== null) {
        error_log("Using cached ML result");
        return $cached_result['risk_score'];
    }
    
    // Call real ML model server
    $data = json_encode([
        "amount" => $amount,
        "location" => $location,
        "device" => $device,
        "timestamp" => date('Y-m-d H:i:s'),
        "user_id" => 1 // In real app, get from session
    ]);
    
    $ch = curl_init('http://localhost:5000/predict');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $data,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 3
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code === 200) {
        $result = json_decode($response, true);
        
        if (isset($result['risk_score'])) {
            // Cache for 5 minutes
            $cache->set($cache_key, ['risk_score' => $result['risk_score']], 300);
            
            error_log("ML prediction: {$result['risk_score']} (model: {$result['model_used']})");
            
            return $result['risk_score'];
        }
    }
    
    // Fallback if ML server fails
    error_log("ML server failed, using fallback");
    return getLocationBasedFallback($location);
}
?>