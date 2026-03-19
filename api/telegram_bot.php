<?php
// telegram_bot.php - Send transaction alerts to @Securemimi_Bot

header('Content-Type: application/json');

// ===== YOUR BOT CONFIGURATION =====
define('TELEGRAM_BOT_TOKEN', '8257991468:AAFuq3uiMfo5atJKg8ykpvb9YFKWesV8SIc');
define('TELEGRAM_CHAT_ID', '5828853667'); // YOUR CHAT ID
// =================================

/**
 * Send a transaction alert to Telegram
 */
function sendTelegramAlert($transaction_id, $amount, $location, $device_id = 'Unknown') {
    $url = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/sendMessage";
    
    // Create the message
    $message = "
🚨 <b>SUSPICIOUS TRANSACTION DETECTED</b> 🚨

💰 <b>Amount:</b> KES " . number_format($amount) . "
📍 <b>Location:</b> " . $location . "
📱 <b>Device:</b> " . substr($device_id, 0, 10) . "...
🆔 <b>Transaction:</b> #" . $transaction_id . "
⏰ <b>Time:</b> " . date('H:i:s') . "

Did you make this transaction?";
    
    // Create YES/NO buttons
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '✅ YES, It\'s Me', 'callback_data' => 'approve_' . $transaction_id],
                ['text' => '❌ NO, Block It', 'callback_data' => 'block_' . $transaction_id]
            ]
        ]
    ];
    
    // Send to Telegram
    $postData = [
        'chat_id' => TELEGRAM_CHAT_ID,
        'text' => $message,
        'parse_mode' => 'HTML',
        'reply_markup' => json_encode($keyboard)
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $result = json_decode($response, true);
    
    return [
        'success' => ($httpCode == 200 && isset($result['ok']) && $result['ok'] === true),
        'message' => $result['description'] ?? 'Unknown',
        'response' => $response
    ];
}

/**
 * Handle button clicks from Telegram
 */
function handleTelegramCallback() {
    $content = file_get_contents('php://input');
    $update = json_decode($content, true);
    
    if (!$update || !isset($update['callback_query'])) {
        return ['success' => false, 'error' => 'No callback data'];
    }
    
    $callback = $update['callback_query'];
    $data = $callback['data']; // "approve_123" or "block_123"
    $callback_id = $callback['id'];
    $chat_id = $callback['message']['chat']['id'];
    $message_id = $callback['message']['message_id'];
    
    // Parse transaction ID and action
    list($action, $transaction_id) = explode('_', $data);
    
    // Send "processing" feedback to Telegram
    $answerUrl = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/answerCallbackQuery";
    $answerData = [
        'callback_query_id' => $callback_id,
        'text' => 'Processing your response...',
        'show_alert' => false
    ];
    
    $ch = curl_init($answerUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $answerData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
    
    // Forward to your local API
    $localResponse = forwardToLocalAPI($transaction_id, $action);
    
    // Update the message to show it was handled
    updateTelegramMessage($chat_id, $message_id, $action, $transaction_id);
    
    return [
        'success' => true,
        'action' => $action,
        'transaction_id' => $transaction_id,
        'local_response' => $localResponse
    ];
}

/**
 * Forward user's decision to your local API
 */
function forwardToLocalAPI($transaction_id, $action) {
    $response = ($action == 'approve') ? 'yes' : 'no';
    
    $postData = json_encode([
        'transaction_id' => (int)$transaction_id,
        'response' => $response
    ]);
    
    $ch = curl_init('http://localhost/fraud-shield/api/user_respond.php');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $result = curl_exec($ch);
    curl_close($ch);
    
    return $result;
}

/**
 * Update the Telegram message after user responds
 */
function updateTelegramMessage($chat_id, $message_id, $action, $transaction_id) {
    $url = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/editMessageText";
    
    $responseText = ($action == 'approve') ? '✅ Approved' : '❌ Blocked';
    $newText = "Transaction #{$transaction_id} - {$responseText}";
    
    $postData = [
        'chat_id' => $chat_id,
        'message_id' => $message_id,
        'text' => $newText,
        'parse_mode' => 'HTML'
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
}

/**
 * Test the bot connection
 */
function testBotConnection() {
    $url = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/getMe";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $result = json_decode($response, true);
    
    return [
        'success' => ($httpCode == 200 && isset($result['ok']) && $result['ok'] === true),
        'bot_info' => $result['result'] ?? null,
        'response' => $response
    ];
}

// ============================================
// HANDLE INCOMING REQUESTS
// ============================================

// Get the request data
$input = json_decode(file_get_contents('php://input'), true);

// Route based on request type
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Check if this is a Telegram callback (has callback_query)
    if (isset($input['callback_query'])) {
        $result = handleTelegramCallback();
        echo json_encode($result);
        
    // Check if this is a test request
    } elseif (isset($input['test'])) {
        $result = testBotConnection();
        echo json_encode($result);
        
    // Check if this is a send alert request
    } elseif (isset($input['transaction_id'])) {
        $result = sendTelegramAlert(
            $input['transaction_id'],
            $input['amount'],
            $input['location'],
            $input['device_id'] ?? 'Unknown'
        );
        echo json_encode($result);
        
    } else {
        echo json_encode(['success' => false, 'error' => 'Unknown request type']);
    }
    
} else {
    // GET request - show status page
    $test = testBotConnection();
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>@Securemimi_Bot Status</title>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                margin: 0;
                padding: 30px;
                display: flex;
                justify-content: center;
            }
            .container {
                max-width: 800px;
                width: 100%;
            }
            .card {
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                margin-bottom: 20px;
            }
            h1 {
                color: #333;
                margin-top: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .success {
                color: #22c55e;
                background: #e0f2e9;
                padding: 15px;
                border-radius: 10px;
                border-left: 4px solid #22c55e;
            }
            .error {
                color: #ef4444;
                background: #fee2e2;
                padding: 15px;
                border-radius: 10px;
                border-left: 4px solid #ef4444;
            }
            .info {
                background: #f0f4ff;
                padding: 20px;
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }
            code {
                background: #f0f0f0;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
            }
            pre {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                overflow: auto;
                max-height: 300px;
                border: 1px solid #e0e0e0;
            }
            .button {
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                margin: 5px;
            }
            .button:hover {
                background: #5a67d8;
            }
            .step {
                background: #fff3e0;
                padding: 15px;
                border-radius: 10px;
                margin: 15px 0;
                border-left: 4px solid #f97316;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <h1>
                    <img src="https://telegram.org/img/t_logo.png" width="40" height="40" style="border-radius: 50%;">
                    @Securemimi_Bot Status
                </h1>
                
                <?php if ($test['success']): ?>
                    <div class="success">
                        <strong>✅ Bot is connected!</strong><br>
                        Bot Name: <?php echo $test['bot_info']['first_name']; ?><br>
                        Username: @<?php echo $test['bot_info']['username']; ?><br>
                        Bot ID: <?php echo $test['bot_info']['id']; ?>
                    </div>
                    
                    <div class="step">
                        <h3>📱 Next Step: Get Your Chat ID</h3>
                        <ol>
                            <li>Open Telegram and search for <strong>@Securemimi_Bot</strong></li>
                            <li>Start a chat and send any message (like "Hello")</li>
                            <li>Click the button below to get your Chat ID</li>
                        </ol>
                        <button class="button" onclick="getChatId()">
                            🔍 Get My Chat ID
                        </button>
                        <div id="chatIdResult" style="margin-top: 15px;"></div>
                    </div>
                    
                <?php else: ?>
                    <div class="error">
                        <strong>❌ Bot connection failed!</strong><br>
                        <pre><?php echo htmlspecialchars($test['response']); ?></pre>
                    </div>
                <?php endif; ?>
                
                <div class="info">
                    <h3>📋 How to Use</h3>
                    <ol>
                        <li><strong>Update Chat ID:</strong> Replace <code>YOUR_CHAT_ID_HERE</code> in the PHP file</li>
                        <li><strong>Test:</strong> Run this curl command:
                            <pre>curl -X POST http://localhost/fraud-shield/api/telegram_bot.php -H "Content-Type: application/json" -d '{"test":true}'</pre>
                        </li>
                        <li><strong>Send Alert:</strong> The bot will automatically send messages for suspicious transactions</li>
                    </ol>
                </div>
                
                <h3>🔧 Configuration</h3>
                <pre>
define('TELEGRAM_BOT_TOKEN', '8257991468:AAFuq3uiMfo5atJKg8ykpvb9YFKWesV8SIc');
define('TELEGRAM_CHAT_ID', '<?php echo TELEGRAM_CHAT_ID !== 'YOUR_CHAT_ID_HERE' ? TELEGRAM_CHAT_ID : 'NOT SET'; ?>');</pre>
            </div>
        </div>
        
        <script>
        function getChatId() {
            fetch('https://api.telegram.org/bot8257991468:AAFuq3uiMfo5atJKg8ykpvb9YFKWesV8SIc/getUpdates')
                .then(response => response.json())
                .then(data => {
                    let html = '';
                    if (data.ok && data.result.length > 0) {
                        const chatId = data.result[0].message.chat.id;
                        html = `
                            <div class="success">
                                <strong>✅ Your Chat ID is: ${chatId}</strong><br>
                                Copy this and update your telegram_bot.php file!
                            </div>
                        `;
                    } else {
                        html = `
                            <div class="error">
                                <strong>❌ No messages found!</strong><br>
                                Send a message to @Securemimi_Bot first, then try again.
                            </div>
                        `;
                    }
                    document.getElementById('chatIdResult').innerHTML = html;
                })
                .catch(error => {
                    document.getElementById('chatIdResult').innerHTML = `
                        <div class="error">Error: ${error.message}</div>
                    `;
                });
        }
        </script>
    </body>
    </html>
    <?php
}
?>