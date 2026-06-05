<?php
// forgot_password.php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils/email.php';

session_start();

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    
    if (empty($email)) {
        $error = 'Email address is required.';
    } else {
        try {
            $query = $db->collection('users')->where('email', '=', $email)->limit(1);
            $docs = iterator_to_array($query->documents());
            
            // Standard safety to avoid user enumeration: show success regardless
            $message = 'If an account with that email exists, we have sent a reset link to it.';
            
            if (count($docs) > 0) {
                $userDoc = $docs[0];
                $userId = $userDoc->id();
                
                // Generate token
                $resetToken = bin2hex(random_bytes(32));
                $resetTokenExpiry = date('c', time() + 3600); // 1 hour
                
                $db->collection('users')->document($userId)->set([
                    'reset_token' => $resetToken,
                    'reset_token_expiry' => $resetTokenExpiry
                ], ['merge' => true]);
                
                // Build link
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'];
                $resetLink = "{$protocol}://{$host}/reset_password.php?token={$resetToken}";
                
                $emailSubject = 'Password Reset Request';
                $emailHtml = "
                    <p>You requested a password reset.</p>
                    <p>Click the link below to verify your email and set a new password:</p>
                    <a href=\"{$resetLink}\">{$resetLink}</a>
                    <p>This link expires in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                ";
                
                sendEmail($email, $emailSubject, $emailHtml);
            }
        } catch (\Exception $e) {
            $error = 'Error processing request: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password - Lasak Edu</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <h1>Reset Password</h1>
            <p>Enter your email to request a reset link.</p>
            
            <?php if (!empty($error)) { ?>
                <div class="alert alert-danger" style="margin-bottom: 1.5rem; text-align: left;"><?php echo htmlspecialchars($error); ?></div>
            <?php } ?>
            
            <?php if (!empty($message)) { ?>
                <div class="alert alert-success" style="margin-bottom: 1.5rem; text-align: left;"><?php echo htmlspecialchars($message); ?></div>
            <?php } ?>
            
            <form method="POST" action="forgot_password.php" style="text-align: left;">
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" class="form-control" required placeholder="Enter your email">
                </div>
                
                <button type="submit" class="btn btn-primary">Send Reset Link</button>
            </form>
            
            <div style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem;">
                <a href="admin_login.php" style="color: #cbd5e1; text-decoration: none;">Back to Login</a>
            </div>
        </div>
    </div>
</body>
</html>
