<?php
// index.php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils/scholarship.php';
require_once __DIR__ . '/utils/email.php';

// Helper to get next sequence for application_id
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

// 1. Handle AJAX Actions
$action = $_GET['action'] ?? '';

if ($action === 'calculate_scholarship' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $course = $body['course'] ?? '';
    $marks_10th = $body['marks_10th'] ?? 0;
    $marks_12th = $body['marks_12th'] ?? 0;
    $marks_ug = $body['marks_ug'] ?? null;
    
    try {
        $result = calculateScholarship($course, floatval($marks_10th), floatval($marks_12th), $marks_ug ? floatval($marks_ug) : null);
        header('Content-Type: application/json');
        echo json_encode($result);
    } catch (\Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit();
}

if ($action === 'create_order' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $amount = $body['amount'] ?? 0;
    $key_id = $_ENV['RAZORPAY_KEY_ID'] ?? '';
    $key_secret = $_ENV['RAZORPAY_KEY_SECRET'] ?? '';
    
    try {
        require_once __DIR__ . '/vendor/autoload.php';
        $api = new \Razorpay\Api\Api($key_id, $key_secret);
        $order = $api->order->create([
            'receipt' => 'rec_' . time(),
            'amount' => intval(round(floatval($amount) * 100)), // paise
            'currency' => 'INR'
        ]);
        header('Content-Type: application/json');
        echo json_encode($order->toArray());
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit();
}

// Helper for file uploads to Google Cloud Storage
function uploadToStorage($fileKey, $prefix) {
    if (!isset($_FILES[$fileKey]) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    
    global $storage, $bucketName;
    if (!$storage || empty($bucketName)) return null;
    
    $tempPath = $_FILES[$fileKey]['tmp_name'];
    $origName = $_FILES[$fileKey]['name'];
    $ext = pathinfo($origName, PATHINFO_EXTENSION);
    
    $fileName = "documents/{$prefix}_" . time() . "_" . bin2hex(random_bytes(4)) . ".{$ext}";
    
    try {
        $bucket = $storage->bucket($bucketName);
        $object = $bucket->upload(fopen($tempPath, 'r'), [
            'name' => $fileName,
            'metadata' => [
                'contentType' => $_FILES[$fileKey]['type']
            ]
        ]);
        $object->update(['acl' => []], ['predefinedAcl' => 'publicRead']);
        return "https://storage.googleapis.com/{$bucketName}/{$fileName}";
    } catch (\Exception $e) {
        error_log("Upload failed for {$fileKey}: " . $e->getMessage());
        return null;
    }
}

// 2. Load dynamic data
$courses = [];
if ($db) {
    try {
        $coursesDocs = $db->collection('course_fees')->orderBy('course_name', 'asc')->documents();
        foreach ($coursesDocs as $doc) {
            $courses[] = array_merge(['id' => $doc->id()], $doc->data());
        }
    } catch (\Exception $e) {
        error_log("Error: " . $e->getMessage());
    }
}

// 3. Handle Full Application POST Submission
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($action)) {
    try {
        $student_name = $_POST['student_name'] ?? '';
        $phone = $_POST['phone'] ?? '';
        $email = $_POST['email'] ?? '';
        $course = $_POST['course'] ?? '';
        
        if (empty($student_name) || empty($phone) || empty($email) || empty($course)) {
            throw new \Exception('Missing required fields.');
        }
        
        // Upload documents
        $photo_url = uploadToStorage('photo', 'photos');
        $signature_url = uploadToStorage('signature', 'signatures');
        $id_proof_url = uploadToStorage('id_proof', 'id_proofs');
        $marksheet_10th_url = uploadToStorage('marksheet_10th', 'marksheet_10th');
        $marksheet_12th_url = uploadToStorage('marksheet_12th', 'marksheet_12th');
        $marksheet_degree_url = uploadToStorage('marksheet_degree', 'marksheet_degree');
        
        $payment_screenshot_url = null;
        if (($_POST['payment_mode'] ?? '') === 'AlreadyPaid') {
            $payment_screenshot_url = uploadToStorage('payment_screenshot', 'payment_screenshots');
        }
        
        // Get sequence
        $sequence = getNextSequence($db);
        $paddedSequence = str_pad(strval($sequence), 4, '0', STR_PAD_LEFT);
        $application_id = "LTIEC" . $paddedSequence;
        $certificate_number = "TN/CBE/043/" . $application_id;
        
        // Grace days configuration
        $initialGraceDays = 7;
        $paymentType = $_POST['payment_type'] ?? '';
        if (($_POST['payment_mode'] ?? '') === 'Online' && in_array($paymentType, ['Installment', 'EMI', 'Bajaj', 'Flashaid', 'Fibe'])) {
            $initialGraceDays = 30;
        }
        $payment_last_date = date('Y-m-d', time() + ($initialGraceDays * 24 * 60 * 60));
        
        // Load fee breakdown
        $feeTotal = 0;
        $feeGstAmount = 0;
        $feeMainBranchAmount = 0;
        $feeFranchiseBranchAmount = 0;
        $isScholarship = isset($_POST['is_scholarship']) && $_POST['is_scholarship'] == '1';
        $scholarshipPercent = floatval($_POST['scholarship_percent'] ?? 0);
        $feeDiscountAmount = 0;
        
        // Find matching course fee
        $selectedFee = null;
        foreach ($courses as $c) {
            if ($c['course_name'] === $course) {
                $selectedFee = $c;
                break;
            }
        }
        
        if ($selectedFee) {
            $total = floatval($selectedFee['total_fee']);
            $effectiveTotal = $total;
            if ($isScholarship && $scholarshipPercent > 0) {
                $feeDiscountAmount = ($total * $scholarshipPercent) / 100;
                $effectiveTotal = $total - $feeDiscountAmount;
            }
            $gstAmount = ($effectiveTotal * floatval($selectedFee['gst_percent'])) / 100;
            $netAmount = $effectiveTotal - $gstAmount;
            
            $feeTotal = $total;
            $feeGstAmount = $gstAmount;
            $feeMainBranchAmount = ($netAmount * floatval($selectedFee['main_branch_percent'])) / 100;
            $feeFranchiseBranchAmount = ($netAmount * floatval($selectedFee['franchise_branch_percent'])) / 100;
        }
        
        $applicationData = [
            'student_name' => $student_name,
            'phone' => $phone,
            'email' => $email,
            'address' => $_POST['address'] ?? null,
            'dob' => $_POST['dob'] ?? null,
            'gender' => $_POST['gender'] ?? null,
            'college_company' => $_POST['college_company'] ?? null,
            'previous_school' => $_POST['previous_school'] ?? null,
            'previous_marks' => $_POST['previous_marks'] ?? null,
            'photo_url' => $photo_url,
            'signature_url' => $signature_url,
            'id_proof_url' => $id_proof_url,
            'marksheet_10th_url' => $marksheet_10th_url,
            'marksheet_12th_url' => $marksheet_12th_url,
            'marksheet_degree_url' => $marksheet_degree_url,
            'payment_screenshot_url' => $payment_screenshot_url,
            'course' => $course,
            'branch' => 'Main',
            'course_start_date' => $_POST['course_start_date'] ?? null,
            'course_end_date' => $_POST['course_end_date'] ?? null,
            'application_id' => $application_id,
            'certificate_number' => $certificate_number,
            'status' => 'New',
            'fee_total' => $feeTotal,
            'fee_gst_amount' => $feeGstAmount,
            'fee_main_branch_amount' => $feeMainBranchAmount,
            'fee_franchise_branch_amount' => $feeFranchiseBranchAmount,
            'marks_10th' => $_POST['marks_10th'] ?? null,
            'marks_12th' => $_POST['marks_12th'] ?? null,
            'marks_ug' => $_POST['marks_ug'] ?? null,
            'marks_average' => $_POST['marks_average'] ?? null,
            'scholarship_category' => $_POST['scholarship_category'] ?? null,
            'is_scholarship' => $isScholarship,
            'scholarship_percent' => $scholarshipPercent,
            'fee_discount_amount' => $feeDiscountAmount,
            'referral_phone_1' => $_POST['referral_phone_1'] ?? null,
            'referral_phone_2' => $_POST['referral_phone_2'] ?? null,
            'referral1_name' => $_POST['referral1_name'] ?? null,
            'referral1_email' => $_POST['referral1_email'] ?? null,
            'referral1_contact_no' => $_POST['referral1_contact_no'] ?? null,
            'referral1_occupation' => $_POST['referral1_occupation'] ?? null,
            'referral2_name' => $_POST['referral2_name'] ?? null,
            'referral2_email' => $_POST['referral2_email'] ?? null,
            'referral2_contact_no' => $_POST['referral2_contact_no'] ?? null,
            'referral2_occupation' => $_POST['referral2_occupation'] ?? null,
            'payment_last_date' => $payment_last_date,
            'payment_status' => $_POST['payment_status'] ?? 'Pending',
            'payment_method' => $_POST['payment_method'] ?? null,
            'payment_transaction_id' => $_POST['payment_transaction_id'] ?? null,
            'payment_amount' => floatval($_POST['payment_amount'] ?? 0),
            'payment_date' => !empty($_POST['payment_transaction_id']) ? date('c') : null,
            'payment_type' => $paymentType,
            'installments_count' => intval($_POST['installments_count'] ?? 0),
            'created_at' => date('c')
        ];
        
        $db->collection('applications')->add($applicationData);
        
        // Welcome email
        $emailSubject = 'Welcome to Lasak Edu! - Enrolment Successful';
        $emailHtml = "
            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;\">
                <h2 style=\"color: #2c3e50; text-align: center;\">Welcome to Lasak Edu!</h2>
                <p>Dear <strong>{$student_name}</strong>,</p>
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
        
        header("Location: success.php?application_id=" . urlencode($application_id) . "&student_name=" . urlencode($student_name));
        exit();
        
    } catch (\Exception $e) {
        $error = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Admission Form - Lasak Edu</title>
    <link rel="stylesheet" href="assets/style.css">
    <script src="https://checkout.razorpay.com/v1/checkout.js" defer></script>
</head>
<body>
    <div class="form-container">
        <div class="form-wrapper">
            <div class="header-section">
                <img src="assets/logo.png" alt="Lasak Edu Logo" class="logo" onerror="this.src='assets/temp_logo1.png'">
                <h1>LASAK EDU</h1>
                <p class="tagline">OPEN FOR ALL LEARNING NEEDS</p>
                <p class="subtitle">Student Admission Form</p>
            </div>
            
            <?php if (!empty($error)) { ?>
                <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
            <?php } ?>
            
            <form id="admissionForm" method="POST" action="index.php" enctype="multipart/form-data">
                <!-- Hidden inputs for calculated fields -->
                <input type="hidden" id="is_scholarship" name="is_scholarship" value="0">
                <input type="hidden" id="scholarship_percent" name="scholarship_percent" value="0">
                <input type="hidden" id="scholarship_category" name="scholarship_category" value="">
                <input type="hidden" id="marks_average" name="marks_average" value="">
                <input type="hidden" id="payment_status" name="payment_status" value="Pending">
                <input type="hidden" id="payment_transaction_id" name="payment_transaction_id" value="">
                <input type="hidden" id="payment_method" name="payment_method" value="">
                <input type="hidden" id="payment_amount" name="payment_amount" value="0">
                
                <!-- Step 1: Personal Info -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">1</span> Personal Information
                    </h3>
                    <div class="form-grid grid-2">
                        <div class="form-group full-width">
                            <label for="student_name">Full Name <span class="required">*</span></label>
                            <input type="text" id="student_name" name="student_name" class="form-control" required placeholder="Enter your full name" value="<?php echo htmlspecialchars($_POST['student_name'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="dob">Date of Birth <span class="required">*</span></label>
                            <input type="date" id="dob" name="dob" class="form-control" required value="<?php echo htmlspecialchars($_POST['dob'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="gender">Gender <span class="required">*</span></label>
                            <select id="gender" name="gender" class="form-control" required>
                                <option value="" disabled selected>Select Gender</option>
                                <option value="Male" <?php echo (($_POST['gender'] ?? '') === 'Male' ? 'selected' : ''); ?>>Male</option>
                                <option value="Female" <?php echo (($_POST['gender'] ?? '') === 'Female' ? 'selected' : ''); ?>>Female</option>
                                <option value="Other" <?php echo (($_POST['gender'] ?? '') === 'Other' ? 'selected' : ''); ?>>Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Contact info -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">2</span> Contact Details
                    </h3>
                    <div class="form-grid grid-2">
                        <div class="form-group">
                            <label for="phone">Phone Number <span class="required">*</span></label>
                            <input type="tel" id="phone" name="phone" class="form-control" required placeholder="10-digit number" pattern="[0-9]{10}">
                        </div>
                        <div class="form-group">
                            <label for="email">Email Address <span class="required">*</span></label>
                            <input type="email" id="email" name="email" class="form-control" required placeholder="you@example.com">
                        </div>
                        <div class="form-group full-width">
                            <label for="address">Residential Address <span class="required">*</span></label>
                            <textarea id="address" name="address" class="form-control" required placeholder="Full street address and city" rows="3"></textarea>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Referral Details -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">3</span> Referral Details
                    </h3>
                    <div class="form-grid grid-2">
                        <div class="form-group">
                            <label for="referral1_name">Referrer 1 Name <span class="required">*</span></label>
                            <input type="text" id="referral1_name" name="referral1_name" class="form-control" required placeholder="Name of Referrer 1">
                        </div>
                        <div class="form-group">
                            <label for="referral1_email">Referrer 1 Email <span class="required">*</span></label>
                            <input type="email" id="referral1_email" name="referral1_email" class="form-control" required placeholder="referrer1@example.com">
                        </div>
                        <div class="form-group">
                            <label for="referral1_contact_no">Referrer 1 Contact <span class="required">*</span></label>
                            <input type="tel" id="referral1_contact_no" name="referral1_contact_no" class="form-control" required placeholder="10-digit number" pattern="[0-9]{10}">
                        </div>
                        <div class="form-group">
                            <label for="referral1_occupation">Referrer 1 Occupation <span class="required">*</span></label>
                            <input type="text" id="referral1_occupation" name="referral1_occupation" class="form-control" required placeholder="Occupation">
                        </div>
                        
                        <div class="form-group" style="grid-column: 1 / -1; margin-top: 1rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                            <strong>Referrer 2</strong>
                        </div>
                        <div class="form-group">
                            <label for="referral2_name">Referrer 2 Name <span class="required">*</span></label>
                            <input type="text" id="referral2_name" name="referral2_name" class="form-control" required placeholder="Name of Referrer 2">
                        </div>
                        <div class="form-group">
                            <label for="referral2_email">Referrer 2 Email <span class="required">*</span></label>
                            <input type="email" id="referral2_email" name="referral2_email" class="form-control" required placeholder="referrer2@example.com">
                        </div>
                        <div class="form-group">
                            <label for="referral2_contact_no">Referrer 2 Contact <span class="required">*</span></label>
                            <input type="tel" id="referral2_contact_no" name="referral2_contact_no" class="form-control" required placeholder="10-digit number" pattern="[0-9]{10}">
                        </div>
                        <div class="form-group">
                            <label for="referral2_occupation">Referrer 2 Occupation <span class="required">*</span></label>
                            <input type="text" id="referral2_occupation" name="referral2_occupation" class="form-control" required placeholder="Occupation">
                        </div>
                    </div>
                </div>

                <!-- Step 4: Academic & Scholarship -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">4</span> Academic & Program Details
                    </h3>
                    <div class="form-grid grid-2">
                        <div class="form-group full-width">
                            <label for="college_company">College / Company Name</label>
                            <input type="text" id="college_company" name="college_company" class="form-control" placeholder="Current institution or workplace">
                        </div>
                        <div class="form-group">
                            <label for="previous_school">Previous School/College</label>
                            <input type="text" id="previous_school" name="previous_school" class="form-control" placeholder="Last institution attended">
                        </div>
                        <div class="form-group">
                            <label for="previous_marks">Previous Marks/CGPA</label>
                            <input type="text" id="previous_marks" name="previous_marks" class="form-control" placeholder="e.g. 85% or 9.0 CGPA">
                        </div>
                        <div class="form-group">
                            <label for="course_start_date">Course Start Date <span class="required">*</span></label>
                            <input type="date" id="course_start_date" name="course_start_date" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="course_end_date">Course End Date <span class="required">*</span></label>
                            <input type="date" id="course_end_date" name="course_end_date" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="courseSelect">Select Course <span class="required">*</span></label>
                            <select id="courseSelect" name="course" class="form-control" required>
                                <option value="" disabled selected>Choose a course...</option>
                                <?php foreach ($courses as $c) { ?>
                                    <option value="<?php echo htmlspecialchars($c['course_name']); ?>" data-fee="<?php echo htmlspecialchars($c['total_fee']); ?>">
                                        <?php echo htmlspecialchars($c['course_name']); ?> (INR <?php echo number_format($c['total_fee']); ?>)
                                    </option>
                                <?php } ?>
                            </select>
                        </div>
                        
                        <div class="form-group" style="justify-content: flex-end; padding-bottom: 0.5rem;">
                            <label class="checkbox-group">
                                <input type="checkbox" id="checkScholarship" value="yes">
                                Apply for Academic Scholarship
                            </label>
                        </div>
                        
                        <!-- Scholarship Marks Inputs -->
                        <div id="scholarshipInputs" class="form-group full-width" style="display: none; border-top: 1px dashed #cbd5e1; padding-top: 1rem; margin-top: 1rem;">
                            <strong>Scholarship Eligibility Check</strong>
                            <div class="form-grid grid-2" style="margin-top: 0.75rem;">
                                <div class="form-group">
                                    <label>10th Marks (%) <span class="required">*</span></label>
                                    <input type="number" id="marks_10th" name="marks_10th" min="0" max="100" class="form-control" placeholder="10th class percentage">
                                </div>
                                <div class="form-group">
                                    <label>12th Marks (%) <span class="required">*</span></label>
                                    <input type="number" id="marks_12th" name="marks_12th" min="0" max="100" class="form-control" placeholder="12th class percentage">
                                </div>
                                <div class="form-group">
                                    <label>UG Marks (%) (Optional)</label>
                                    <input type="number" id="marks_ug" name="marks_ug" min="0" max="100" class="form-control" placeholder="Undergraduate percentage">
                                </div>
                                <div class="form-group" style="justify-content: flex-end;">
                                    <button type="button" id="calcScholarshipBtn" class="btn btn-secondary">Calculate Scholarship</button>
                                </div>
                            </div>
                            <div id="scholarshipResult" style="margin-top: 1rem;"></div>
                        </div>
                    </div>
                </div>

                <!-- Step 5: Document Uploads -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">5</span> Verification Documents
                    </h3>
                    <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 1rem;">Upload candidate files (PDF/JPG, Max 500KB per file).</p>
                    <div class="form-grid grid-2">
                        <div class="form-group">
                            <label>Passport Photo <span class="required">*</span></label>
                            <div class="file-upload-wrapper">
                                <input type="file" name="photo" required accept="image/*">
                                <div class="file-upload-text">Drag or <strong>Browse</strong> Photo</div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Signature Proof <span class="required">*</span></label>
                            <div class="file-upload-wrapper">
                                <input type="file" name="signature" required accept="image/*">
                                <div class="file-upload-text">Drag or <strong>Browse</strong> Signature</div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>ID Proof (Aadhar/PAN) <span class="required">*</span></label>
                            <div class="file-upload-wrapper">
                                <input type="file" name="id_proof" required accept="image/*,application/pdf">
                                <div class="file-upload-text">Drag or <strong>Browse</strong> ID Document</div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>10th Marksheet <span class="required">*</span></label>
                            <div class="file-upload-wrapper">
                                <input type="file" name="marksheet_10th" required accept="image/*,application/pdf">
                                <div class="file-upload-text">Drag or <strong>Browse</strong> 10th marksheet</div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>12th Marksheet <span class="required">*</span></label>
                            <div class="file-upload-wrapper">
                                <input type="file" name="marksheet_12th" required accept="image/*,application/pdf">
                                <div class="file-upload-text">Drag or <strong>Browse</strong> 12th marksheet</div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>UG Certificate (Optional)</label>
                            <div class="file-upload-wrapper">
                                <input type="file" name="marksheet_degree" accept="image/*,application/pdf">
                                <div class="file-upload-text">Drag or <strong>Browse</strong> UG Certificate</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 6: Payment Settings -->
                <div class="form-card">
                    <h3 class="section-title">
                        <span class="section-number">6</span> Payment Setup
                    </h3>
                    <div class="form-grid grid-2">
                        <div class="form-group">
                            <label for="payment_mode">Payment Mode <span class="required">*</span></label>
                            <select id="payment_mode" name="payment_mode" class="form-control" required>
                                <option value="Online">Pay Online Now (Razorpay)</option>
                                <option value="AlreadyPaid">Already Offline Paid</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="payment_type">Payment Frequency <span class="required">*</span></label>
                            <select id="payment_type" name="payment_type" class="form-control" required>
                                <option value="" disabled selected>Select plan...</option>
                                <option value="One Time">One Time Full Payment</option>
                                <option value="Installment">Installments plan</option>
                                <option value="EMI">Monthly EMI</option>
                                <option value="Bajaj">Bajaj Finance</option>
                                <option value="Flashaid">Flashaid</option>
                                <option value="Fibe">Fibe</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="installmentsWrapper" style="display: none;">
                            <label for="installments_count">Installments Count <span class="required">*</span></label>
                            <input type="number" id="installments_count" name="installments_count" class="form-control" min="1" max="12" placeholder="Number of installments">
                        </div>
                        
                        <div class="form-group full-width" id="screenshotUploadWrapper" style="display: none; border-top: 1px dashed #cbd5e1; padding-top: 1.25rem;">
                            <label>Offline Receipt/Screenshot <span class="required">*</span></label>
                            <div class="file-upload-wrapper">
                                <input type="file" id="payment_screenshot" name="payment_screenshot" accept="image/*,application/pdf">
                                <div class="file-upload-text">Upload payment receipt screenshot</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <label class="checkbox-group">
                        <input type="checkbox" id="agreeTerms" required>
                        I agree to the <a href="terms.php" target="_blank" style="color: var(--color-primary-dark); font-weight: 600;">Terms and Conditions</a> of Lasak Techno Institute.
                    </label>
                </div>

                <div class="form-actions">
                    <button type="button" id="submitFormBtn" class="btn btn-primary" style="width: 100%;">Proceed to Submission</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Client side dynamic logic -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const courseSelect = document.getElementById('courseSelect');
            const checkScholarship = document.getElementById('checkScholarship');
            const scholarshipInputs = document.getElementById('scholarshipInputs');
            const calcScholarshipBtn = document.getElementById('calcScholarshipBtn');
            const scholarshipResult = document.getElementById('scholarshipResult');
            
            const paymentMode = document.getElementById('payment_mode');
            const paymentType = document.getElementById('payment_type');
            const installmentsWrapper = document.getElementById('installmentsWrapper');
            const installmentsCount = document.getElementById('installments_count');
            const screenshotUploadWrapper = document.getElementById('screenshotUploadWrapper');
            const paymentScreenshot = document.getElementById('payment_screenshot');
            
            const submitFormBtn = document.getElementById('submitFormBtn');
            const admissionForm = document.getElementById('admissionForm');
            
            // Toggle scholarship inputs
            checkScholarship.addEventListener('change', () => {
                if (checkScholarship.checked) {
                    scholarshipInputs.style.display = 'block';
                } else {
                    scholarshipInputs.style.display = 'none';
                    document.getElementById('is_scholarship').value = '0';
                    document.getElementById('scholarship_percent').value = '0';
                    scholarshipResult.innerHTML = '';
                }
            });
            
            // Calculate scholarship AJAX
            calcScholarshipBtn.addEventListener('click', async () => {
                const course = courseSelect.value;
                const marks10th = document.getElementById('marks_10th').value;
                const marks12th = document.getElementById('marks_12th').value;
                const marksUg = document.getElementById('marks_ug').value;
                
                if (!course || !marks10th || !marks12th) {
                    alert('Please select a course and enter both 10th and 12th marks.');
                    return;
                }
                
                calcScholarshipBtn.disabled = true;
                calcScholarshipBtn.textContent = 'Calculating...';
                
                try {
                    const response = await fetch('index.php?action=calculate_scholarship', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            course: course,
                            marks_10th: marks10th,
                            marks_12th: marks12th,
                            marks_ug: marksUg
                        })
                    });
                    
                    const data = await response.json();
                    calcScholarshipBtn.disabled = false;
                    calcScholarshipBtn.textContent = 'Calculate Scholarship';
                    
                    if (data.isEligible) {
                        document.getElementById('is_scholarship').value = '1';
                        document.getElementById('scholarship_percent').value = data.scholarshipPercent;
                        document.getElementById('scholarship_category').value = data.category;
                        document.getElementById('marks_average').value = data.average;
                        
                        scholarshipResult.innerHTML = `
                            <div class="alert alert-success">
                                <strong>Congratulations!</strong> You are eligible for a <strong>${data.scholarshipPercent}%</strong> scholarship discount on your course fee.
                            </div>
                        `;
                    } else {
                        document.getElementById('is_scholarship').value = '0';
                        document.getElementById('scholarship_percent').value = '0';
                        scholarshipResult.innerHTML = `
                            <div class="alert alert-info">
                                You do not meet the minimum marks requirements for a scholarship. Average: ${data.average}%.
                            </div>
                        `;
                    }
                } catch (e) {
                    calcScholarshipBtn.disabled = false;
                    calcScholarshipBtn.textContent = 'Calculate Scholarship';
                    alert('Calculation failed: ' + e.message);
                }
            });
            
            // Toggle payment fields
            paymentMode.addEventListener('change', () => {
                if (paymentMode.value === 'AlreadyPaid') {
                    screenshotUploadWrapper.style.display = 'block';
                    paymentScreenshot.required = true;
                } else {
                    screenshotUploadWrapper.style.display = 'none';
                    paymentScreenshot.required = false;
                }
            });
            
            paymentType.addEventListener('change', () => {
                if (['Installment', 'EMI', 'Bajaj', 'Flashaid', 'Fibe'].includes(paymentType.value)) {
                    installmentsWrapper.style.display = 'block';
                    installmentsCount.required = true;
                } else {
                    installmentsWrapper.style.display = 'none';
                    installmentsCount.required = false;
                }
            });
            
            // Handle form submission and Razorpay payment triggering
            submitFormBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Perform HTML form validation checks
                if (!admissionForm.checkValidity()) {
                    admissionForm.reportValidity();
                    return;
                }
                
                submitFormBtn.disabled = true;
                submitFormBtn.textContent = 'Processing...';
                
                const selectedOption = courseSelect.options[courseSelect.selectedIndex];
                const baseFee = parseFloat(selectedOption.getAttribute('data-fee') || 0);
                const discountPercent = parseFloat(document.getElementById('scholarship_percent').value || 0);
                const discountAmount = (baseFee * discountPercent) / 100;
                const payableTotal = baseFee - discountAmount;
                
                let chargeAmount = payableTotal;
                const payType = paymentType.value;
                const instCount = parseInt(installmentsCount.value || 0);
                
                if (['Installment', 'EMI', 'Bajaj', 'Flashaid', 'Fibe'].includes(payType) && instCount > 0) {
                    chargeAmount = payableTotal / instCount;
                }
                
                chargeAmount = parseFloat(chargeAmount.toFixed(2));
                
                // Case 1: Online payment triggers Razorpay
                if (paymentMode.value === 'Online' && chargeAmount > 0) {
                    try {
                        const orderRes = await fetch('index.php?action=create_order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ amount: chargeAmount })
                        });
                        
                        const order = await orderRes.json();
                        if (!orderRes.ok) throw new Error(order.error || 'Failed to create order');
                        
                        const options = {
                            key: "<?php echo $_ENV['RAZORPAY_KEY_ID'] ?? ''; ?>",
                            amount: order.amount,
                            currency: order.currency,
                            name: "Lasak Techno Institute",
                            description: `Admission Fee for ${courseSelect.value}`,
                            order_id: order.id,
                            handler: function (response) {
                                document.getElementById('payment_status').value = 'Paid';
                                document.getElementById('payment_transaction_id').value = response.razorpay_payment_id;
                                document.getElementById('payment_method').value = 'Razorpay';
                                document.getElementById('payment_amount').value = chargeAmount;
                                
                                submitFormBtn.textContent = 'Uploading files & Submitting...';
                                admissionForm.submit();
                            },
                            prefill: {
                                name: document.getElementById('student_name').value,
                                email: document.getElementById('email').value,
                                contact: document.getElementById('phone').value,
                            },
                            theme: { color: "#6366f1" },
                            modal: {
                                ondismiss: function() {
                                    submitFormBtn.disabled = false;
                                    submitFormBtn.textContent = 'Proceed to Submission';
                                }
                            }
                        };
                        
                        const rzp = new Razorpay(options);
                        rzp.open();
                    } catch (err) {
                        submitFormBtn.disabled = false;
                        submitFormBtn.textContent = 'Proceed to Submission';
                        alert('Payment initialization error: ' + err.message);
                    }
                } else {
                    // Case 2: Offline paid or free course fee, submit immediately
                    document.getElementById('payment_amount').value = chargeAmount;
                    submitFormBtn.textContent = 'Uploading files & Submitting...';
                    admissionForm.submit();
                }
            });
            
            // Validate file sizes dynamically (max 500KB)
            const MAX_FILE_SIZE = 512000;
            admissionForm.querySelectorAll('input[type="file"]').forEach(fileInput => {
                fileInput.addEventListener('change', () => {
                    const file = fileInput.files[0];
                    if (file && file.size > MAX_FILE_SIZE) {
                        alert(`File size exceeds 500KB. Please compress the file.`);
                        fileInput.value = '';
                    }
                });
            });
        });
    </script>
</body>
</html>
