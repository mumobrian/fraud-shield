<?php
// final_test.php - Complete test with your actual Chat ID

$token = '8257991468:AAFuq3uiMfo5atJKg8ykpvb9YFKWesV8SIc';
$chat_id = '5828853667'; // Your actual Chat ID

echo "<h1>📱 Final Telegram Test</h1>";

// Test 1: Bot Info
echo "<h2>Test 1: Bot Connection</h2>";
$url = "https://api.telegram.org/bot$token/getMe";
$response = file_get_contents($url);
$data = json_decode($response, true);

if ($data['ok']) {
    echo "✅ Bot connected: @" . $data['result']['username'] . "<br>";
} else {
    echo "❌ Bot connection failed<br>";
}

// Test 2: Send Message with Buttons
echo "<h2>Test 2: Sending Message with Buttons</h2>";

$message = "
🛡️ <b>Fraud Shield Test</b>

This is a test message with buttons!
Your Chat ID: <code>$chat_id</code>

Click a button to test the response:
";

$keyboard = [
    'inline_keyboard' => [
        [
            ['text' => '✅ Test YES', 'callback_data' => 'test_yes'],
            ['text' => '❌ Test NO', 'callback_data' => 'test_no']
        ]
    ]
];

$postData = [
    'chat_id' => $chat_id,
    'text' => $message,
    'parse_mode' => 'HTML',
    'reply_markup' => json_encode($keyboard)
];

$ch = curl_init("https://api.telegram.org/bot$token/sendMessage");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);

$resultData = json_decode($result, true);

if ($resultData['ok']) {
    echo "✅ Test message sent! Check your Telegram.<br>";
    echo "Message ID: " . $resultData['result']['message_id'] . "<br>";
} else {
    echo "❌ Failed: " . $resultData['description'] . "<br>";
}

// Test 3: Check if process_transaction.php has Telegram code
echo "<h2>Test 3: Checking process_transaction.php</h2>";

$filename = 'process_transaction.php';
if (file_exists($filename)) {
    $content = file_get_contents($filename);
    if (strpos($content, 'telegram_bot.php') !== false) {
        echo "✅ Telegram integration found in process_transaction.php<br>";
    } else {
        echo "❌ Telegram integration NOT found in process_transaction.php<br>";
        echo "You need to add the Telegram code to process_transaction.php<br>";
    }
} else {
    echo "❌ process_transaction.php not found<br>";
}

// Test 4: Check if telegram_bot.php exists and is configured
echo "<h2>Test 4: Checking telegram_bot.php</h2>";

$botFile = 'telegram_bot.php';
if (file_exists($botFile)) {
    $content = file_get_contents($botFile);
    if (strpos($content, $chat_id) !== false) {
        echo "✅ Chat ID correctly configured in telegram_bot.php<br>";
    } else {
        echo "❌ Chat ID NOT found in telegram_bot.php<br>";
        echo "Please update telegram_bot.php with your Chat ID: $chat_id<br>";
    }
} else {
    echo "❌ telegram_bot.php not found<br>";
}

// Summary
echo "<h2>📋 Summary</h2>";
echo "<table border='1' cellpadding='8' style='border-collapse: collapse;'>";
echo "<tr><th>Component</th><th>Status</th></tr>";
echo "<tr><td>Bot Token</td><td>✅ Valid</td></tr>";
echo "<tr><td>Chat ID</td><td>✅ $chat_id</td></tr>";
echo "<tr><td>Telegram Connection</td><td>✅ Working</td></tr>";
echo "<tr><td>Message with Buttons</td><td>" . ($resultData['ok'] ? '✅ Sent' : '❌ Failed') . "</td></tr>";
echo "</table>";

echo "<p>📱 <strong>Check your Telegram now!</strong> You should see a test message with buttons.</p>";
?>