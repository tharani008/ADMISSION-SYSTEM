<?php
// enroll.php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils/email.php';

// Helper to get next sequence for application_id using transaction
function getNextSequence($db) {
    $counterRef = $db->collection('counters')->document('applications');
    return $db->runTransaction(function ($transaction) use ($db, $counterRef) {
        $snapshot = $transaction->snapshot($counterRef);
        if (!$snapshot->exists()) {
            $documents = $db->collection('applications')->documents();
            $count = iterator_count($documents);
            $newCount = $count + 1;
            $transaction->set($counterRef, ['count' => $newCount]);
            return $newCount;
        } else {
            $currentCount = intval($snapshot->data()['count'] ?? 0);
            $newCount = $currentCount + 1;
            $transaction->update($counterRef, [
                ['path' => 'count', 'value' => $newCount]
            ]);
            return $newCount;
        }
    });
}

$branches = [];
$courses = [];
$error = '';

if ($db) {
    try {
        $branchesDocs = $db->collection('branches')->orderBy('name', 'asc')->documents();
        foreach ($branchesDocs as $doc) {
            $branches[] = $doc->data();
        }
        
        $coursesDocs = $db->collection('course_fees')->orderBy('course_name', 'asc')->documents();
        foreach ($coursesDocs as $doc) {
            $courses[] = $doc->data();
        }
    } catch (\Exception $e) {
        error_log("Error loading drop-downs: " . $e->getMessage());
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullName = $_POST['fullName'] ?? '';
    $dob = $_POST['dob'] ?? '';
    $gender = $_POST['gender'] ?? '';
    $phone = $_POST['phone'] ?? '';
    $email = $_POST['email'] ?? '';
    $address = $_POST['address'] ?? '';
    $aadhar = $_POST['aadhar'] ?? '';
    $pan = strtoupper($_POST['pan'] ?? '');
    $branch = $_POST['branch'] ?? '';
    $course = $_POST['course'] ?? '';
    
    if (empty($fullName) || empty($dob) || empty($gender) || empty($phone) || empty($email) || empty($address) || empty($aadhar) || empty($pan) || empty($branch) || empty($course)) {
        $error = 'Please fill in all required fields.';
    } elseif (!preg_match('/^[0-9]{10}$/', $phone)) {
        $error = 'Phone number must be exactly 10 digits.';
    } elseif (!preg_match('/^[0-9]{12}$/', $aadhar)) {
        $error = 'Aadhar number must be exactly 12 digits.';
    } elseif (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $pan)) {
        $error = 'Invalid PAN format. Expected: ABCDE1234F';
    } else {
        try {
            $sequence = getNextSequence($db);
            $paddedSequence = str_pad(strval($sequence), 4, '0', STR_PAD_LEFT);
            $application_id = "LTIEC" . $paddedSequence;
            $certificate_number = "TN/CBE/043/" . $application_id;
            
            // Set payment last date to 7 days from now
            $lastDate = date('Y-m-d', time() + (7 * 24 * 60 * 60));
            
            // Look up the fee details
            $feeTotal = 0;
            $gstAmount = 0;
            $mainBranchAmount = 0;
            $franchiseBranchAmount = 0;
            
            $feeQuery = $db->collection('course_fees')->where('course_name', '=', $course)->limit(1);
            $feeDocs = iterator_to_array($feeQuery->documents());
            if (count($feeDocs) > 0) {
                $feeData = $feeDocs[0]->data();
                $feeTotal = floatval($feeData['total_fee'] ?? 0);
                $gstPercent = floatval($feeData['gst_percent'] ?? 0);
                $mainPercent = floatval($feeData['main_branch_percent'] ?? 0);
                $franchisePercent = floatval($feeData['franchise_branch_percent'] ?? 0);
                
                $gstAmount = ($feeTotal * $gstPercent) / 100;
                $netAmount = $feeTotal - $gstAmount;
                $mainBranchAmount = ($netAmount * $mainPercent) / 100;
                $franchiseBranchAmount = ($netAmount * $franchisePercent) / 100;
            }
            
            $applicationData = [
                'student_name' => $fullName,
                'dob' => $dob,
                'gender' => $gender,
                'phone' => $phone,
                'email' => $email,
                'address' => $address,
                'aadhar_number' => $aadhar,
                'pan_number' => $pan,
                'branch' => $branch,
                'course' => $course,
                'application_id' => $application_id,
                'certificate_number' => $certificate_number,
                'status' => 'New',
                'fee_total' => $feeTotal,
                'fee_gst_amount' => $gstAmount,
                'fee_main_branch_amount' => $mainBranchAmount,
                'fee_franchise_branch_amount' => $franchiseBranchAmount,
                'payment_last_date' => $lastDate,
                'payment_status' => 'Pending',
                'payment_amount' => 0,
                'created_at' => date('c')
            ];
            
            $db->collection('applications')->add($applicationData);
            
            // Send Welcome Email
            $emailSubject = 'Welcome to Lasak Edu! - Enrolment Successful';
            $emailHtml = "
                <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;\">
                    <h2 style=\"color: #2c3e50; text-align: center;\">Welcome to Lasak Edu!</h2>
                    <p>Dear <strong>{$fullName}</strong>,</p>
                    <p>Congratulations! Your enrolment for the <strong>{$course}</strong> course at Lasak Techno Institute has been successfully submitted.</p>
                    <h3 style=\"color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px;\">Course Details</h3>
                    <table style=\"width: 100%; border-collapse: collapse; margin-top: 10px;\">
                        <tr>
                            <td style=\"padding: 10px; border-bottom: 1px solid #eee; color: #555;\"><strong>Application ID:</strong></td>
                            <td style=\"padding: 10px; border-bottom: 1px solid #eee;\">{$application_id}</td>
                        </tr>
                        <tr><td style=\"padding: 10px; border-bottom: 1px solid #eee;\"><strong>Course:</strong></td><td>{$course}</td></tr>
                        <tr><td style=\"padding: 10px; border-bottom: 1px solid #eee;\"><strong>Total Fee:</strong></td><td>INR {$feeTotal}</td></tr>
                    </table>
                    <p style=\"text-align: center; font-weight: bold;\">Wishing you all the best!</p>
                </div>
            ";
            sendEmail($email, $emailSubject, $emailHtml);
            
            header("Location: success.php?application_id=" . urlencode($application_id) . "&student_name=" . urlencode($fullName));
            exit();
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
    <title>Enrollment Form - Lasak Edu</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="form-container">
        <div class="form-wrapper">
            <div class="header-section">
                <img src="assets/logo.png" alt="Lasak Edu Logo" class="logo" onerror="this.src='assets/temp_logo1.png'">
                <h1>Enrollment Application</h1>
                <p class="subtitle">Please fill out the form below to enroll at Lasak.</p>
            </div>
            
            <?php if (!empty($error)) { ?>
                <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
            <?php } ?>
            
            <form method="POST" action="enroll.php" class="enrollment-form">
                <!-- Section 1: Personal Info -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">1</span> Personal Information
                    </h3>
                    <div class="form-grid grid-2">
                        <div class="form-group full-width">
                            <label for="fullName">Full Name <span class="required">*</span></label>
                            <input type="text" id="fullName" name="fullName" class="form-control" required placeholder="Enter your full name" value="<?php echo htmlspecialchars($_POST['fullName'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="dob">Date of Birth <span class="required">*</span></label>
                            <input type="date" id="dob" name="dob" class="form-control" required value="<?php echo htmlspecialchars($_POST['dob'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="gender">Gender <span class="required">*</span></label>
                            <select id="gender" name="gender" class="form-control" required>
                                <option value="" disabled selected>Select Gender</option>
                                <option value="male" <?php echo (($_POST['gender'] ?? '') === 'male' ? 'selected' : ''); ?>>Male</option>
                                <option value="female" <?php echo (($_POST['gender'] ?? '') === 'female' ? 'selected' : ''); ?>>Female</option>
                                <option value="other" <?php echo (($_POST['gender'] ?? '') === 'other' ? 'selected' : ''); ?>>Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Contact details -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">2</span> Contact Details
                    </h3>
                    <div class="form-grid grid-2">
                        <div class="form-group">
                            <label for="phone">Phone Number <span class="required">*</span></label>
                            <input type="tel" id="phone" name="phone" class="form-control" required placeholder="10-digit number" pattern="[0-9]{10}" value="<?php echo htmlspecialchars($_POST['phone'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="email">Email Address <span class="required">*</span></label>
                            <input type="email" id="email" name="email" class="form-control" required placeholder="you@example.com" value="<?php echo htmlspecialchars($_POST['email'] ?? ''); ?>">
                        </div>
                        <div class="form-group full-width">
                            <label for="address">Residential Address <span class="required">*</span></label>
                            <textarea id="address" name="address" class="form-control" required placeholder="Full street address and city" rows="3"><?php echo htmlspecialchars($_POST['address'] ?? ''); ?></textarea>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Extra verification and selection -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">3</span> Program & Verification Details
                    </h3>
                    <div class="form-grid grid-2">
                        <div class="form-group">
                            <label for="branch">Select Branch <span class="required">*</span></label>
                            <select id="branch" name="branch" class="form-control" required>
                                <option value="" disabled selected>Choose a branch...</option>
                                <?php foreach ($branches as $b) { ?>
                                    <option value="<?php echo htmlspecialchars($b['name']); ?>" <?php echo (($_POST['branch'] ?? '') === $b['name'] ? 'selected' : ''); ?>>
                                        <?php echo htmlspecialchars($b['name']); ?>
                                    </option>
                                <?php } ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="course">Select Course <span class="required">*</span></label>
                            <select id="course" name="course" class="form-control" required>
                                <option value="" disabled selected>Choose a course...</option>
                                <?php foreach ($courses as $c) { ?>
                                    <option value="<?php echo htmlspecialchars($c['course_name']); ?>" <?php echo (($_POST['course'] ?? '') === $c['course_name'] ? 'selected' : ''); ?>>
                                        <?php echo htmlspecialchars($c['course_name']); ?>
                                    </option>
                                <?php } ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="aadhar">Aadhar Number <span class="required">*</span></label>
                            <input type="text" id="aadhar" name="aadhar" class="form-control" required placeholder="12-digit Aadhar number" pattern="[0-9]{12}" value="<?php echo htmlspecialchars($_POST['aadhar'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="pan">PAN Number <span class="required">*</span></label>
                            <input type="text" id="pan" name="pan" class="form-control" required placeholder="e.g. ABCDE1234F" pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}" style="text-transform: uppercase;" value="<?php echo htmlspecialchars($_POST['pan'] ?? ''); ?>">
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Submit Application</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
