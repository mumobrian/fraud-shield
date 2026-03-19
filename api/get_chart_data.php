<?php
// Change this line
require_once 'db.php';  // Not ../db.php

header('Content-Type: application/json');

try {
    $db = getDB();
    
    $response = [];
    
    // 1. Status Distribution Data
    $stmt = $db->query("
        SELECT 
            status,
            COUNT(*) as count
        FROM transactions 
        GROUP BY status
    ");
    $statusData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $statusCounts = [
        'allowed' => 0,
        'suspicious' => 0,
        'blocked' => 0
    ];
    
    foreach ($statusData as $row) {
        $statusCounts[$row['status']] = (int)$row['count'];
    }
    
    $total = array_sum($statusCounts);
    
    $response['status_distribution'] = [
        'labels' => ['Allowed', 'Suspicious', 'Blocked'],
        'data' => [
            $statusCounts['allowed'],
            $statusCounts['suspicious'],
            $statusCounts['blocked']
        ],
        'percentages' => [
            $total > 0 ? round(($statusCounts['allowed'] / $total) * 100, 1) : 0,
            $total > 0 ? round(($statusCounts['suspicious'] / $total) * 100, 1) : 0,
            $total > 0 ? round(($statusCounts['blocked'] / $total) * 100, 1) : 0
        ],
        'colors' => ['#22c55e', '#f97316', '#ef4444']
    ];
    
    // 2. Risk Trend Data
    $stmt = $db->query("
        SELECT 
            id,
            risk_score,
            DATE_FORMAT(created_at, '%H:%i') as time_label
        FROM transactions 
        ORDER BY id DESC 
        LIMIT 20
    ");
    $trendData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response['risk_trend'] = [
        'labels' => array_reverse(array_column($trendData, 'time_label')),
        'data' => array_reverse(array_map('floatval', array_column($trendData, 'risk_score'))),
        'ids' => array_reverse(array_column($trendData, 'id'))
    ];
    
    // 3. Location Analysis Data
    $stmt = $db->query("
        SELECT 
            location,
            COUNT(*) as transaction_count,
            AVG(risk_score) as avg_risk
        FROM transactions 
        WHERE location IS NOT NULL AND location != ''
        GROUP BY location
        ORDER BY transaction_count DESC
        LIMIT 5
    ");
    $locationData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response['location_analysis'] = [
        'labels' => array_column($locationData, 'location'),
        'counts' => array_map('intval', array_column($locationData, 'transaction_count')),
        'avg_risk' => array_map('floatval', array_column($locationData, 'avg_risk'))
    ];
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>