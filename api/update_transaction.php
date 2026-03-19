<?php
require_once 'db.php';

header('Content-Type: application/json');

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id']) || !isset($input['status'])) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

try {
    $db = getDB();
    
    // Update transaction status
    $stmt = $db->prepare("UPDATE transactions SET status = ? WHERE id = ?");
    $stmt->execute([$input['status'], $input['id']]);
    
    // Create alert for manual action
    if ($input['status'] === 'blocked') {
        $stmt = $db->prepare("INSERT INTO alerts (user_id, transaction_id, message) VALUES (1, ?, 'Transaction blocked by operator')");
        $stmt->execute([$input['id']]);
    } elseif ($input['status'] === 'allowed') {
        $stmt = $db->prepare("INSERT INTO alerts (user_id, transaction_id, message) VALUES (1, ?, 'Transaction approved by operator')");
        $stmt->execute([$input['id']]);
    }
    
    echo json_encode(['success' => true]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>