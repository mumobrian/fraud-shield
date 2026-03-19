<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

// Check if data exists
if (!$data || !isset($data['username']) || !isset($data['password'])) {
    echo json_encode(['success' => false, 'message' => 'Username and password required']);
    exit;
}

$username = $data['username'];
$password = $data['password'];

try {
    $db = getDB();
    
    // Find user by name OR email
    $stmt = $db->prepare("SELECT * FROM users WHERE name = ? OR email = ?");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        // Check password - column name is 'password' in your table
        if ($password === $user['password']) {
            // Remove password from output
            unset($user['password']);
            
            // Return success with user data
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => isset($user['role']) ? $user['role'] : 'user'
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid password']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }
} catch (PDOException $e) {
    // Log error but don't show to user
    error_log("Login error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
?>