<?php
require_once 'db.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

$transaction_id = $data['transaction_id'];
$amount = $data['amount'];
$location = $data['location'];

// Store that we're waiting for user response
$db = getDB();
$stmt = $db->prepare("
    UPDATE transactions 
    SET status = 'pending_approval' 
    WHERE id = ?
");
$stmt->execute([$transaction_id]);

// Return data for popup
echo json_encode([
    'success' => true,
    'transaction_id' => $transaction_id,
    'amount' => $amount,
    'location' => $location,
    'message' => "Did you just try to send KES " . number_format($amount) . " from $location?"
]);

?>