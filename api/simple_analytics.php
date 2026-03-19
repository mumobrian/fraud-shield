<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $db = getDB();
    
    // Get totals
    $total = $db->query("SELECT COUNT(*) FROM transactions")->fetchColumn();
    $allowed = $db->query("SELECT COUNT(*) FROM transactions WHERE status = 'allowed'")->fetchColumn();
    $suspicious = $db->query("SELECT COUNT(*) FROM transactions WHERE status = 'suspicious'")->fetchColumn();
    $blocked = $db->query("SELECT COUNT(*) FROM transactions WHERE status = 'blocked'")->fetchColumn();
    
    // Get average risk
    $avgRisk = $db->query("SELECT AVG(risk_score) * 100 FROM transactions")->fetchColumn();
    
    // Get recent risk scores for trend
    $trend = $db->query("SELECT risk_score * 100 as risk, DATE_FORMAT(created_at, '%H:%i') as time FROM transactions ORDER BY id DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
    $trend = array_reverse($trend);
    
    // Get locations
    $locations = $db->query("SELECT location, COUNT(*) as count FROM transactions WHERE location IS NOT NULL GROUP BY location ORDER BY count DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    
    $response = [
        'success' => true,
        'stats' => [
            'total' => (int)$total,
            'allowed' => (int)$allowed,
            'suspicious' => (int)$suspicious,
            'blocked' => (int)$blocked,
            'allowed_pct' => $total > 0 ? round(($allowed / $total) * 100, 1) : 0,
            'suspicious_pct' => $total > 0 ? round(($suspicious / $total) * 100, 1) : 0,
            'blocked_pct' => $total > 0 ? round(($blocked / $total) * 100, 1) : 0,
            'avg_risk' => round($avgRisk ?: 0, 1)
        ],
        'trend' => [
            'labels' => array_column($trend, 'time'),
            'data' => array_column($trend, 'risk')
        ],
        'locations' => [
            'labels' => array_column($locations, 'location'),
            'data' => array_column($locations, 'count')
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>