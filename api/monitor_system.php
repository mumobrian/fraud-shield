<?php

require_once 'db.php';
require_once 'redis.php';

header('Content-Type: application/json');

function monitorSystem() {
    $status = [
        'timestamp' => date('Y-m-d H:i:s'),
        'database' => false,
        'redis' => false,
        'ml_api' => false,
        'cache_stats' => [],
        'recent_errors' => []
    ];
    
    // Check database
    try {
        $db = getDB();
        $db->query("SELECT 1")->fetch();
        $status['database'] = true;
        
        // Get recent transaction stats
        $stmt = $db->query("SELECT COUNT(*) as count, AVG(risk_score) as avg_risk FROM transactions WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
        $status['recent_transactions'] = $stmt->fetch(PDO::FETCH_ASSOC);
        
    } catch (Exception $e) {
        $status['database_error'] = $e->getMessage();
    }
    
    // Check Redis
    $cache = RedisCache::getInstance();
    $status['redis'] = $cache->isAvailable();
    
    if ($status['redis']) {
        // Get cache stats
        $redis = $cache->getConnection();
        $status['cache_stats'] = $redis->info('stats');
    }
    
    // Check ML API
    $ch = curl_init(ML_API_URL . '/health');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $status['ml_api'] = ($http_code === 200);
    
    // Check error log (last 10 errors)
    $log_file = ini_get('error_log');
    if (file_exists($log_file)) {
        $lines = file($log_file);
        $error_lines = array_filter($lines, function($line) {
            return strpos($line, 'ML API') !== false || strpos($line, 'Redis') !== false;
        });
        $status['recent_errors'] = array_slice(array_values($error_lines), -10);
    }
    
    return $status;
}

echo json_encode(monitorSystem(), JSON_PRETTY_PRINT);

?>