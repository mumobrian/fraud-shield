<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['user_id']) || !isset($data['face_descriptor'])) {
    echo json_encode(['success' => false, 'message' => 'Missing data']);
    exit;
}

try {
    $db = getDB();
    
    // Update user with face data
    $stmt = $db->prepare("UPDATE users SET face_descriptor = ?, face_enabled = 1, face_updated_at = NOW() WHERE id = ?");
    $stmt->execute([$data['face_descriptor'], $data['user_id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Face data saved successfully'
    ]);
    
} catch (PDOException $e) {
    error_log("Save face error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>