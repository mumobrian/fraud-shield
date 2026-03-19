<?php

require_once 'redis.php';

$cache = RedisCache::getInstance();

if (isset($_GET['clear']) && $_GET['clear'] == 'all') {
    if ($cache->isAvailable()) {
        $redis = $cache->getConnection();
        $redis->flushAll();
        echo "All cache cleared successfully!";
    } else {
        echo "Redis is not available";
    }
} elseif (isset($_GET['user_id'])) {
    $user_id = (int)$_GET['user_id'];
    $cache->clearUserCache($user_id);
    echo "Cache cleared for user {$user_id}";
} else {
    echo "Usage: clear_cache.php?clear=all or clear_cache.php?user_id=1";
}

// Add link back to monitor
echo '<br><br><a href="monitor.php">← Back to Monitor</a>';
?>