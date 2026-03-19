<?php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
    exit;
}

$transaction_id = $input['transaction_id'] ?? null;
$amount = $input['amount'] ?? 0;
$location = $input['location'] ?? 'Unknown';
$device_id = $input['device_id'] ?? 'Unknown';
$risk_score = $input['risk_score'] ?? 0.5;
$status = $input['status'] ?? 'suspicious';

try {
    $db = getDB();
    
    // Get user statistics for comparison
    $stmt = $db->prepare("
        SELECT 
            AVG(amount) as avg_amount,
            MAX(amount) as max_amount,
            COUNT(*) as total_transactions,
            COUNT(DISTINCT location) as unique_locations,
            COUNT(DISTINCT device_id) as unique_devices
        FROM transactions 
        WHERE user_id = 1 
        AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $stmt->execute();
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get recent transactions from this location
    $stmt = $db->prepare("
        SELECT COUNT(*) as location_count
        FROM transactions 
        WHERE location = ? 
        AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $stmt->execute([$location]);
    $locationStats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get recent transactions from this device
    $stmt = $db->prepare("
        SELECT COUNT(*) as device_count
        FROM transactions 
        WHERE device_id = ? 
        AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $stmt->execute([$device_id]);
    $deviceStats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate factors
    $factors = [];
    $total_impact = 0;
    
    // Amount factor
    if ($stats['avg_amount'] > 0) {
        $amount_ratio = $amount / $stats['avg_amount'];
        if ($amount_ratio > 3) {
            $impact = min(0.8, $amount_ratio / 10);
            $factors[] = [
                'feature' => 'amount',
                'title' => 'Unusually High Amount',
                'description' => sprintf(
                    'This transaction of KES %s is %.1fx higher than your average of KES %s',
                    number_format($amount),
                    round($amount_ratio, 1),
                    number_format(round($stats['avg_amount']))
                ),
                'impact' => round($impact, 2),
                'details' => [
                    'current' => $amount,
                    'average' => round($stats['avg_amount']),
                    'ratio' => round($amount_ratio, 1)
                ]
            ];
            $total_impact += $impact;
        }
    }
    
    // Location factor
    if ($location !== 'Nairobi' && $locationStats['location_count'] < 2) {
        $impact = 0.4;
        $factors[] = [
            'feature' => 'location',
            'title' => 'Unusual Location',
            'description' => sprintf(
                'This transaction is from %s, which is not your usual location. You\'ve only used this location %d times.',
                $location,
                $locationStats['location_count']
            ),
            'impact' => $impact,
            'details' => [
                'location' => $location,
                'frequency' => $locationStats['location_count']
            ]
        ];
        $total_impact += $impact;
    }
    
    // Device factor
    if ($deviceStats['device_count'] < 2) {
        $impact = 0.5;
        $factors[] = [
            'feature' => 'device',
            'title' => 'New Device Detected',
            'description' => sprintf(
                'This device (%s) hasn\'t been used for transactions before. New devices with high amounts are risky.',
                substr($device_id, 0, 8) . '...'
            ),
            'impact' => $impact,
            'details' => [
                'device' => $device_id,
                'first_seen' => $deviceStats['device_count'] == 0 ? 'never' : 'recently'
            ]
        ];
        $total_impact += $impact;
    }
    
    // Time factor
    $hour = (int)date('H');
    if ($hour < 6 || $hour > 23) {
        $impact = 0.3;
        $factors[] = [
            'feature' => 'time',
            'title' => 'Unusual Time',
            'description' => sprintf(
                'This transaction occurred at %d:00, which is outside your normal transaction hours (9am-10pm).',
                $hour
            ),
            'impact' => $impact,
            'details' => [
                'hour' => $hour,
                'is_night' => true
            ]
        ];
        $total_impact += $impact;
    }
    
    // Velocity factor (multiple transactions quickly)
    $stmt = $db->prepare("
        SELECT COUNT(*) as recent_count
        FROM transactions 
        WHERE user_id = 1 
        AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    ");
    $stmt->execute();
    $recent = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($recent['recent_count'] > 3) {
        $impact = 0.6;
        $factors[] = [
            'feature' => 'velocity',
            'title' => 'High Transaction Velocity',
            'description' => sprintf(
                '%d transactions in the last 5 minutes - this is unusually fast',
                $recent['recent_count']
            ),
            'impact' => $impact,
            'details' => [
                'count' => $recent['recent_count'],
                'minutes' => 5
            ]
        ];
        $total_impact += $impact;
    }
    
    // Normalize impacts to sum to risk_score
    if ($total_impact > 0) {
        foreach ($factors as &$factor) {
            $factor['impact'] = round(($factor['impact'] / $total_impact) * $risk_score, 2);
        }
    }
    
    // Summary based on status
    $summary = '';
    switch ($status) {
        case 'blocked':
            $summary = '🚫 This transaction was BLOCKED because multiple high-risk factors were detected.';
            break;
        case 'suspicious':
            $summary = '⚠️ This transaction was flagged as SUSPICIOUS for review.';
            break;
        case 'allowed':
            $summary = '✅ This transaction was ALLOWED but had some risk factors.';
            break;
        default:
            $summary = 'This transaction was analyzed for risk factors.';
    }
    
    $response = [
        'success' => true,
        'explanation' => [
            'transaction_id' => $transaction_id,
            'summary' => $summary,
            'risk_score' => $risk_score,
            'confidence' => count($factors) > 0 ? 0.85 : 0.5,
            'factors' => $factors,
            'user_stats' => [
                'avg_amount' => round($stats['avg_amount'] ?? 0),
                'total_transactions' => $stats['total_transactions'] ?? 0,
                'unique_locations' => $stats['unique_locations'] ?? 0,
                'unique_devices' => $stats['unique_devices'] ?? 0
            ]
        ]
    ];
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>