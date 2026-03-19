<?php

require_once 'config.php';

class RedisCache {
    private static $instance = null;
    private $redis;
    
    private function __construct() {
        $this->connect();
    }
    
    private function connect() {
        try {
            $this->redis = new Redis();
            $this->redis->connect(REDIS_HOST, REDIS_PORT, REDIS_TIMEOUT);
            $this->redis->setOption(Redis::OPT_READ_TIMEOUT, -1);
        } catch (Exception $e) {
            error_log("Redis connection failed: " . $e->getMessage());
            $this->redis = null;
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new RedisCache();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->redis;
    }
    
    // Cache data with TTL
    public function set($key, $value, $ttl = null) {
        if (!$this->redis) return false;
        
        try {
            $ttl = $ttl ?? CACHE_TTL;
            $value = json_encode($value);
            return $this->redis->setex($key, $ttl, $value);
        } catch (Exception $e) {
            error_log("Redis set failed for key {$key}: " . $e->getMessage());
            return false;
        }
    }
    
    // Get cached data
    public function get($key) {
        if (!$this->redis) return null;
        
        try {
            $value = $this->redis->get($key);
            return $value ? json_decode($value, true) : null;
        } catch (Exception $e) {
            error_log("Redis get failed for key {$key}: " . $e->getMessage());
            return null;
        }
    }
    
    // Delete cache key
    public function delete($key) {
        if (!$this->redis) return false;
        
        try {
            return $this->redis->del($key) > 0;
        } catch (Exception $e) {
            error_log("Redis delete failed for key {$key}: " . $e->getMessage());
            return false;
        }
    }
    
    // Clear user-specific cache
    public function clearUserCache($user_id) {
        if (!$this->redis) return false;
        
        try {
            $pattern = "user:{$user_id}:*";
            $keys = $this->redis->keys($pattern);
            if (!empty($keys)) {
                return $this->redis->del($keys) > 0;
            }
        } catch (Exception $e) {
            error_log("Redis clear user cache failed: " . $e->getMessage());
        }
        return false;
    }
    
    // Check if Redis is available
    public function isAvailable() {
        if (!$this->redis) return false;
        
        try {
            return $this->redis->ping() == '+PONG';
        } catch (Exception $e) {
            return false;
        }
    }
}

// Helper function for backward compatibility
function getRedis() {
    $cache = RedisCache::getInstance();
    return $cache->getConnection();
}

?>