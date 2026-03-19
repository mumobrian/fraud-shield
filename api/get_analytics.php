<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $db = getDB();
    
    // Get overall statistics
    $stmt = $db->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'allowed' THEN 1 ELSE 0 END) as allowed,
            SUM(CASE WHEN status = 'suspicious' THEN 1 ELSE 0 END) as suspicious,
            SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
            ROUND(AVG(risk_score) * 100, 1) as avg_risk
        FROM transactions
    ");
    
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate percentages
    $total = $stats['total'] ?: 0;
    $allowed = $stats['allowed'] ?: 0;
    $suspicious = $stats['suspicious'] ?: 0;
    $blocked = $stats['blocked'] ?: 0;
    
    // Get status distribution
    $statusData = [$allowed, $suspicious, $blocked];
    
    // Get risk trend (last 10 transactions)
    $trendStmt = $db->query("
        SELECT 
            ROUND(risk_score * 100, 1) as risk,
            DATE_FORMAT(created_at, '%H:%i') as time
        FROM transactions 
        ORDER BY id DESC 
        LIMIT 10
    ");
    $trendData = $trendStmt->fetchAll(PDO::FETCH_ASSOC);
    $trendData = array_reverse($trendData);
    
    // Get location data
    $locStmt = $db->query("
        SELECT 
            location,
            COUNT(*) as count
        FROM transactions 
        WHERE location IS NOT NULL 
        GROUP BY location 
        ORDER BY count DESC 
        LIMIT 5
    ");
    $locData = $locStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response = [
        'success' => true,
        'stats' => [
            'total' => (int)$total,
            'allowed' => (int)$allowed,
            'suspicious' => (int)$suspicious,
            'blocked' => (int)$blocked,
            'allowed_percentage' => $total > 0 ? round(($allowed / $total) * 100, 1) : 0,
            'suspicious_percentage' => $total > 0 ? round(($suspicious / $total) * 100, 1) : 0,
            'blocked_percentage' => $total > 0 ? round(($blocked / $total) * 100, 1) : 0,
            'avg_risk' => $stats['avg_risk'] ?: 0
        ],
        'charts' => [
            'status_distribution' => [
                'labels' => ['Allowed', 'Suspicious', 'Blocked'],
                'data' => $statusData
            ],
            'risk_trend' => [
                'labels' => array_column($trendData, 'time'),
                'data' => array_column($trendData, 'risk')
            ],
            'location_analysis' => [
                'labels' => array_column($locData, 'location'),
                'counts' => array_column($locData, 'count')
            ]
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