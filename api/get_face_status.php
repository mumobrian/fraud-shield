<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $db = getDB();
    
    // Get users with face enabled
    $stmt = $db->query("SELECT id, name, email, face_enabled FROM users WHERE face_enabled = 1");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($users);
    
} catch (PDOException $e) {
    echo json_encode([]);
}
?>