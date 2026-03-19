<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
    $user_id = 1;
    $amount = rand(100, 10000);
    $locations = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'];
    $devices = ['device-1001', 'device-2002', 'device-3003'];
    
    $location = $locations[array_rand($locations)];
    $device_id = $devices[array_rand($devices)];
    
    // Simple counter for status rotation
    $counterFile = __DIR__ . '/counter.txt';
    $counter = file_exists($counterFile) ? (int)file_get_contents($counterFile) : 0;
    $counter++;
    if ($counter > 6) $counter = 1;
    file_put_contents($counterFile, $counter);
    
    // Determine status
    if ($counter == 1) {
        $status = 'allowed';
        $risk = 0.2;
    } elseif ($counter >= 2 && $counter <= 3) {
        $status = 'suspicious';
        $risk = 0.5;
    } else {
        $status = 'blocked';
        $risk = 0.9;
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("INSERT INTO transactions (user_id, amount, location, device_id, risk_score, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([$user_id, $amount, $location, $device_id, $risk, $status]);
    
    $transaction_id = $db->lastInsertId();
    
    // Create alert for suspicious/blocked
    if ($status != 'allowed') {
        $alertMsg = $status == 'suspicious' ? "Suspicious transaction detected" : "Transaction BLOCKED due to fraud";
        $stmt = $db->prepare("INSERT INTO alerts (user_id, transaction_id, message, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$user_id, $transaction_id, $alertMsg]);
    }
    
    // Return response
    if ($status == 'suspicious') {
        echo json_encode([
            'success' => true,
            'transaction_id' => $transaction_id,
            'amount' => $amount,
            'location' => $location,
            'device_id' => $device_id,
            'requires_approval' => true,
            'status' => $status,
            'risk_score' => $risk
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'transaction_id' => $transaction_id,
            'status' => $status,
            'risk_score' => $risk
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>