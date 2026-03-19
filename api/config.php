<?php

// Database configuration
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'fraud_detection');
define('DB_USER', 'root');
define('DB_PASS', ''); // change if you have a password

// Redis configuration
define('REDIS_HOST', '127.0.0.1');
define('REDIS_PORT', 6379);
define('REDIS_TIMEOUT', 2.5); // Connection timeout

// Cache configuration
define('CACHE_TTL', 3600); // 1 hour default TTL
define('ML_API_TIMEOUT', 3); // ML API timeout in seconds
define('ML_API_URL', 'http://localhost:5000/predict');
define('FALLBACK_RISK_SCORE', 0.3); // Default risk score if ML fails

?>