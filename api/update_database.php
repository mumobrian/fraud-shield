<?php

require_once 'db.php';

echo "<h2>Updating Database Schema</h2>";

try {
    $db = getDB();
    
    // Add created_at to transactions if not exists
    $checkTransactions = $db->query("SHOW COLUMNS FROM transactions LIKE 'created_at'");
    if ($checkTransactions->rowCount() == 0) {
        $db->exec("ALTER TABLE transactions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        echo "✅ Added created_at column to transactions table<br>";
    } else {
        echo "✅ created_at column already exists in transactions table<br>";
    }
    
    // Add created_at to alerts if not exists
    $checkAlerts = $db->query("SHOW COLUMNS FROM alerts LIKE 'created_at'");
    if ($checkAlerts->rowCount() == 0) {
        $db->exec("ALTER TABLE alerts ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        echo "✅ Added created_at column to alerts table<br>";
    } else {
        echo "✅ created_at column already exists in alerts table<br>";
    }
    
    // Update any NULL created_at values to current time
    $db->exec("UPDATE transactions SET created_at = NOW() WHERE created_at IS NULL");
    $db->exec("UPDATE alerts SET created_at = NOW() WHERE created_at IS NULL");
    
    echo "<br>✅ Database update complete!";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage();
}

?>

<br><br>
<a href="index.html">Go to Dashboard</a>