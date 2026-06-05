<?php
// reset_password.php

require_once __DIR__ . '/db.php';

session_start();

$token = $_GET['token'] ?? $_POST['token'] ?? '';
$error = '';
$success = '';
$userDocId = '';

if (empty($token)) {
    $error = 'Reset token is missing or invalid.';
} else {
    try {
        $query = $db->collection('users')->where('reset_token', '=', $token)->limit(1);
        $docs = iterator_to_array($query->documents());
        
        if (count($docs) === 0) {
            $error = 'Invalid or expired token.';
        } else {
            $userDoc = $docs[0];
            $userData = $userDoc->data();
            $userDocId = $userDoc->id();
            
            // Check expiry
            $expiry = strtotime($userData['reset_token_expiry'] ?? '');
            if (time() > $expiry) {
                $error = 'Reset token has expired. Please request a new one.';
            }
        }
    } catch (\Exception $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($error)) {
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    
    if (empty($password)) {
        $error = 'Password cannot be empty.';
    } elseif ($password !== $confirm_password) {
        $error = 'Passwords do not match.';
    } else {
        try {
            $db->collection('users')->document($userDocId)->set([
                'password_hash' => $password,
                'reset_token' => null,
                'reset_token_expiry' => null
            ], ['merge' => true]);
            
            $success = 'Password reset successful! You can now log in.';
        } catch (\Exception $e) {
            $error = 'Error updating password: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Lasak Edu</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <h1>New Password</h1>
            <p>Please enter your new credentials below.</p>
            
            <?php if (!empty($error)) { ?>
                <div class="alert alert-danger" style="margin-bottom: 1.5rem; text-align: left;"><?php echo htmlspecialchars($error); ?></div>
            <?php } ?>
            
            <?php if (!empty($success)) { ?>
                <div class="alert alert-success" style="margin-bottom: 1.5rem; text-align: left;">
                    <?php echo htmlspecialchars($success); ?>
                </div>
            <?php } ?>
            
            <?php if (empty($error) && empty($success)) { ?>
                <form method="POST" action="reset_password.php" style="text-align: left;">
                    <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
                    
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label for="password">New Password</label>
                        <input type="password" id="password" name="password" class="form-control" required placeholder="Min 6 characters">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label for="confirm_password">Confirm Password</label>
                        <input type="password" id="confirm_password" name="confirm_password" class="form-control" required placeholder="Re-type password">
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Update Password</button>
                </form>
            <?php } ?>
            
            <div style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem;">
                <a href="admin_login.php" style="color: #cbd5e1; text-decoration: none;">Back to Login</a>
            </div>
        </div>
    </div>
</body>
</html>
