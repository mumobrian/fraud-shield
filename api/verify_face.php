<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['username'])) {
    echo json_encode(['success' => false, 'message' => 'Username required']);
    exit;
}

$username = $data['username'];

try {
    $db = getDB();
    
    // Find user
    $stmt = $db->prepare("SELECT * FROM users WHERE name = ? OR email = ?");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && $user['face_enabled'] == 1) {
        // In production, you'd verify the face descriptor here
        // For demo, we just check if face is enabled
        
        // Remove sensitive data
        unset($user['password']);
        unset($user['face_descriptor']);
        unset($user['face_image']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Face verified',
            'user' => $user
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Face not registered for this user']);
    }
    
} catch (PDOException $e) {
    error_log("Verify face error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
?>