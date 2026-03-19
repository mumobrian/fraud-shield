<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $db = getDB();
    
    $stmt = $db->query("SELECT * FROM alerts ORDER BY id DESC LIMIT 20");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($data);
    
} catch (PDOException $e) {
    echo json_encode([]);
}
?>