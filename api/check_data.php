<?php
require_once 'db.php';

echo "<h2>🔍 Database Check</h2>";

try {
    $db = getDB();
    
    // Check transactions table
    $result = $db->query("SHOW TABLES LIKE 'transactions'");
    if ($result->rowCount() == 0) {
        die("❌ Transactions table doesn't exist! Run the database setup first.");
    }
    
    // Count transactions
    $count = $db->query("SELECT COUNT(*) FROM transactions")->fetchColumn();
    echo "<p>📊 Total transactions: <strong>" . $count . "</strong></p>";
    
    if ($count == 0) {
        echo "<p style='color: orange;'>⚠️ No transactions found. Inserting test data...</p>";
        
        // Insert test data
        for ($i = 0; $i < 20; $i++) {
            $statuses = ['allowed', 'suspicious', 'blocked'];
            $locations = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'];
            $status = $statuses[array_rand($statuses)];
            $location = $locations[array_rand($locations)];
            $risk = $status == 'allowed' ? rand(10, 30)/100 : ($status == 'suspicious' ? rand(31, 69)/100 : rand(70, 95)/100);
            
            $stmt = $db->prepare("INSERT INTO transactions (user_id, amount, location, device_id, risk_score, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([1, rand(100, 10000), $location, 'device-' . rand(100, 999), $risk, $status]);
        }
        echo "<p>✅ Test data inserted!</p>";
    }
    
    // Show status breakdown
    $stats = $db->query("
        SELECT status, COUNT(*) as count 
        FROM transactions 
        GROUP BY status
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h3>Status Breakdown:</h3>";
    echo "<table border='1' cellpadding='8'>";
    echo "<tr><th>Status</th><th>Count</th></tr>";
    foreach ($stats as $row) {
        echo "<tr><td>{$row['status']}</td><td>{$row['count']}</td></tr>";
    }
    echo "</table>";
    
    echo "<h3>Recent Transactions:</h3>";
    $recent = $db->query("SELECT * FROM transactions ORDER BY id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>";
    print_r($recent);
    echo "</pre>";
    
} catch (Exception $e) {
    echo "<p style='color:red;'>❌ Error: " . $e->getMessage() . "</p>";
}
?>
<br>
<a href="index.html">← Back to Dashboard</a>