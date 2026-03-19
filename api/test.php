<?php

require_once 'db.php';
require_once 'redis.php';

// Test DB
$db = getDB();
echo "Database Connected<br>";

// Test Redis
$redis = getRedis();
$redis->set("test_key", "Fraud System Running");

echo "Redis Connected<br>";
echo "Redis Value: " . $redis->get("test_key");

?>