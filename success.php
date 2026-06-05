<?php
// success.php

$application_id = $_GET['application_id'] ?? '';
$student_name = $_GET['student_name'] ?? 'Candidate';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enrolment Successful - Lasak Edu</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="form-container">
        <div class="form-wrapper" style="max-width: 600px;">
            <div class="success-card">
                <div class="success-icon">✓</div>
                <h1>Enrolment Successful!</h1>
                <p style="color: var(--color-text-muted); margin-bottom: 2rem;">
                    Dear <?php echo htmlspecialchars($student_name); ?>, your application has been successfully submitted.
                </p>
                
                <div class="form-card" style="text-align: left; padding: 1.5rem;">
                    <p style="margin-bottom: 0.5rem;">
                        <strong>Application ID:</strong> 
                        <code style="background: #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold; color: var(--color-primary-dark);">
                            <?php echo htmlspecialchars($application_id); ?>
                        </code>
                    </p>
                    <p style="font-size: 0.875rem; color: var(--color-text-muted);">
                        We have sent a confirmation email to the address you provided. Please keep this ID for your reference.
                    </p>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                    <a href="print.php?application_id=<?php echo urlencode($application_id); ?>" target="_blank" class="btn btn-primary">
                        Print Receipt
                    </a>
                    <a href="index.php" class="btn btn-secondary">
                        Submit Another
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
