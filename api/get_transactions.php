<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: *');

error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
    $db = getDB();
    
    // Simple query to get all transactions
    $stmt = $db->query("SELECT * FROM transactions ORDER BY id DESC LIMIT 50");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the data
    foreach ($data as &$row) {
        $row['amount'] = (float)$row['amount'];
        $row['risk_score'] = (float)$row['risk_score'];
    }
    
    echo json_encode($data);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>