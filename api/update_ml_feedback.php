<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
    exit;
}

$transaction_id = $data['transaction_id'] ?? null;
$user_feedback = $data['feedback'] ?? null; // 'correct' or 'incorrect'

if (!$transaction_id || !$user_feedback) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

try {
    $db = getDB();
    
    // Get transaction details
    $stmt = $db->prepare("SELECT * FROM transactions WHERE id = ?");
    $stmt->execute([$transaction_id]);
    $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$transaction) {
        echo json_encode(['success' => false, 'error' => 'Transaction not found']);
        exit;
    }
    
    // Store feedback in database
    $stmt = $db->prepare("
        INSERT INTO ml_feedback (transaction_id, user_feedback, actual_status, predicted_status, created_at)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $transaction_id,
        $user_feedback,
        $transaction['status'],
        $transaction['status'] // This was the prediction
    ]);
    
    // If feedback says prediction was wrong, trigger retraining
    if ($user_feedback === 'incorrect') {
        // Mark for retraining
        $stmt = $db->prepare("
            UPDATE transactions 
            SET needs_retraining = 1 
            WHERE id = ?
        ");
        $stmt->execute([$transaction_id]);
        
        // Optionally trigger async retraining
        // This could call a Python script or queue a job
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Feedback recorded successfully'
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>