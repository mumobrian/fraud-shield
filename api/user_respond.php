<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['transaction_id']) || !isset($data['response'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
    exit;
}

$transaction_id = $data['transaction_id'];
$response = $data['response'];

try {
    $db = getDB();
    
    if ($response === 'yes') {
        $status = 'allowed';
        $message = "Transaction approved by user";
    } else {
        $status = 'blocked';
        $message = "Transaction BLOCKED by user";
    }
    
    $stmt = $db->prepare("UPDATE transactions SET status = ? WHERE id = ?");
    $stmt->execute([$status, $transaction_id]);
    
    $stmt = $db->prepare("INSERT INTO alerts (user_id, transaction_id, message, created_at) VALUES (1, ?, ?, NOW())");
    $stmt->execute([$transaction_id, $message]);
    
    echo json_encode(['success' => true, 'status' => $status]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>