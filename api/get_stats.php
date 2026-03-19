<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $db = getDB();
    
    $stmt = $db->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'allowed' THEN 1 ELSE 0 END) as allowed,
            SUM(CASE WHEN status = 'suspicious' THEN 1 ELSE 0 END) as suspicious,
            SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
            AVG(risk_score) as avg_risk
        FROM transactions
    ");
    
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $total = $stats['total'] ?: 0;
    $allowed = $stats['allowed'] ?: 0;
    $suspicious = $stats['suspicious'] ?: 0;
    $blocked = $stats['blocked'] ?: 0;
    
    echo json_encode([
        'success' => true,
        'overall' => [
            'total' => (int)$total,
            'allowed' => (int)$allowed,
            'suspicious' => (int)$suspicious,
            'blocked' => (int)$blocked,
            'allowed_percentage' => $total > 0 ? round(($allowed / $total) * 100, 1) : 0,
            'suspicious_percentage' => $total > 0 ? round(($suspicious / $total) * 100, 1) : 0,
            'blocked_percentage' => $total > 0 ? round(($blocked / $total) * 100, 1) : 0,
            'avg_risk' => round($stats['avg_risk'] ?: 0, 2)
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>