<?php
// verify_payment.php

$body = json_decode(file_get_contents('php://input'), true);

$razorpay_order_id = $body['razorpay_order_id'] ?? '';
$razorpay_payment_id = $body['razorpay_payment_id'] ?? '';
$razorpay_signature = $body['razorpay_signature'] ?? '';

$key_secret = $_ENV['RAZORPAY_KEY_SECRET'] ?? '';

if (empty($razorpay_order_id) || empty($razorpay_payment_id) || empty($razorpay_signature)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing verification fields']);
    exit();
}

$sign = $razorpay_order_id . "|" . $razorpay_payment_id;
$expectedSign = hash_hmac('sha256', $sign, $key_secret);

header('Content-Type: application/json');
if (hash_equals($expectedSign, $razorpay_signature)) {
    echo json_encode(['status' => 'success', 'message' => 'Payment verified successfully']);
} else {
    http_response_code(400);
    echo json_encode(['status' => 'failure', 'message' => 'Invalid signature']);
}
exit();
