<?php
// admin_login.php

require_once __DIR__ . '/db.php';

session_start();

// If already logged in, redirect to dashboard
if (isset($_SESSION['user'])) {
    header("Location: admin_dashboard.php");
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        $error = 'Username and password are required.';
    } else {
        try {
            $query = $db->collection('users')->where('username', '=', $username)->limit(1);
            $docs = iterator_to_array($query->documents());
            
            if (count($docs) === 0) {
                $error = 'Invalid username or password.';
            } else {
                $userDoc = $docs[0];
                $userData = $userDoc->data();
                
                // Plain-text matching to maintain database compatibility
                if ($password === ($userData['password_hash'] ?? '')) {
                    unset($userData['password_hash']);
                    $userData['id'] = $userDoc->id();
                    
                    $_SESSION['user'] = $userData;
                    header("Location: admin_dashboard.php");
                    exit();
                } else {
                    $error = 'Invalid username or password.';
                }
            }
        } catch (\Exception $e) {
            $error = 'Server Error: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Lasak Edu</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <h1>Lasak Admin</h1>
            <p>Please enter your credentials to login.</p>
            
            <?php if (!empty($error)) { ?>
                <div class="alert alert-danger" style="margin-bottom: 1.5rem; text-align: left;"><?php echo htmlspecialchars($error); ?></div>
            <?php } ?>
            
            <form method="POST" action="admin_login.php" style="text-align: left;">
                <div class="form-group" style="margin-bottom: 1.25rem;">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" class="form-control" required placeholder="Enter username" value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>">
                </div>
                
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" class="form-control" required placeholder="Enter password">
                </div>
                
                <button type="submit" class="btn btn-primary">Login to Portal</button>
            </form>
            
            <div style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem;">
                <a href="forgot_password.php" style="color: #cbd5e1; text-decoration: none;">Forgot password?</a>
            </div>
        </div>
    </div>
</body>
</html>
