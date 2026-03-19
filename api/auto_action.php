<?php

require_once 'db.php';

function takeAction($user_id, $transaction_id, $status) {

    $db = getDB();

    if ($status == 'allowed') {
        return "Transaction Approved";
    }

    if ($status == 'suspicious') {

        $stmt = $db->prepare("INSERT INTO alerts (user_id, transaction_id, message) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $transaction_id, "Suspicious transaction detected"]);

        return "Alert Sent (Suspicious)";
    }

    if ($status == 'blocked') {

        $stmt = $db->prepare("INSERT INTO alerts (user_id, transaction_id, message) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $transaction_id, "Transaction BLOCKED due to fraud"]);

        return "Transaction Blocked 🚫";
    }
}

?>