<?php

require_once 'db.php';

function optimizeDatabase() {
    $db = getDB();
    
    $queries = [
        // Add indexes for better query performance
        "CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_transactions_location_device ON transactions(location, device_id)",
        "CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_alerts_transaction_id ON alerts(transaction_id)",
        
        // Add composite index for common queries
        "CREATE INDEX IF NOT EXISTS idx_transactions_lookup ON transactions(user_id, created_at, amount)",
        
        // Add table for device tracking if not exists
        "CREATE TABLE IF NOT EXISTS device_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            device_id VARCHAR(100) NOT NULL,
            first_seen DATETIME NOT NULL,
            last_seen DATETIME NOT NULL,
            INDEX idx_device_user (user_id, device_id),
            INDEX idx_device_last_seen (last_seen)
        )",
        
        // Migrate existing devices to device_history
        "INSERT IGNORE INTO device_history (user_id, device_id, first_seen, last_seen)
         SELECT DISTINCT user_id, device_id, MIN(created_at), MAX(created_at)
         FROM transactions 
         GROUP BY user_id, device_id"
    ];
    
    foreach ($queries as $query) {
        try {
            $db->exec($query);
            echo "Executed: " . substr($query, 0, 50) . "...<br>";
        } catch (PDOException $e) {
            echo "Error: " . $e->getMessage() . "<br>";
        }
    }
    
    echo "<br>Database optimization complete!";
}

optimizeDatabase();

?>