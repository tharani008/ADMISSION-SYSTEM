<?php
// print.php

require_once __DIR__ . '/db.php';

$id = $_GET['id'] ?? '';
$application_id = $_GET['application_id'] ?? '';

if (empty($id) && empty($application_id)) {
    die("Application ID or Document ID is required.");
}

$appData = null;

try {
    if (!empty($id)) {
        $doc = $db->collection('applications')->document($id)->snapshot();
        if ($doc->exists()) {
            $appData = $doc->data();
            $appData['id'] = $doc->id();
        }
    } else {
        $query = $db->collection('applications')->where('application_id', '=', $application_id)->limit(1);
        $docs = iterator_to_array($query->documents());
        if (count($docs) > 0) {
            $appData = $docs[0]->data();
            $appData['id'] = $docs[0]->id();
        }
    }
} catch (\Exception $e) {
    die("Error retrieving data: " . $e->getMessage());
}

if (!$appData) {
    die("Application not found.");
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Receipt - <?php echo htmlspecialchars($appData['application_id']); ?></title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333333;
            margin: 30px;
            font-size: 14px;
            line-height: 1.5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #dddddd;
            padding: 30px;
            border-radius: 6px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #5346e5;
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        .header h1 {
            margin: 5px 0;
            color: #1e1b4b;
            font-size: 26px;
            text-transform: uppercase;
        }
        .header p {
            margin: 2px 0;
            color: #666666;
            font-size: 14px;
        }
        .receipt-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #334155;
        }
        .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .col {
            flex: 1;
        }
        .table-data {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .table-data td {
            padding: 10px;
            border-bottom: 1px solid #eeeeee;
        }
        .table-data td.label {
            font-weight: bold;
            color: #555555;
            width: 35%;
        }
        .status-paid {
            color: #047857;
            font-weight: bold;
        }
        .status-pending {
            color: #b45309;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            border-top: 1px solid #eeeeee;
            padding-top: 20px;
            font-size: 11px;
            color: #888888;
            text-align: center;
        }
        .print-btn-bar {
            text-align: center;
            margin-bottom: 20px;
        }
        .print-btn {
            background-color: #5346e5;
            color: #ffffff;
            border: none;
            padding: 8px 20px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
        }
        @media print {
            .print-btn-bar {
                display: none;
            }
            body {
                margin: 0;
            }
            .container {
                border: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="print-btn-bar">
        <button onclick="window.print()" class="print-btn">Print / Save as PDF</button>
    </div>
    
    <div class="container">
        <div class="header">
            <h1>LASAK TECHNO INSTITUTE</h1>
            <p>Open for all learning needs</p>
            <p>admissions@lasakedu.in | www.lasakedu.in</p>
        </div>
        
        <div class="receipt-title">Student Admission Receipt</div>
        
        <div class="row">
            <div class="col">
                <strong>Application ID:</strong> <?php echo htmlspecialchars($appData['application_id']); ?><br>
                <strong>Date Applied:</strong> <?php echo date('d M Y, h:i A', strtotime($appData['created_at'])); ?>
            </div>
            <div class="col" style="text-align: right;">
                <strong>Receipt Number:</strong> <?php echo htmlspecialchars($appData['certificate_number'] ?? 'PENDING'); ?><br>
                <strong>Status:</strong> <?php echo htmlspecialchars($appData['status']); ?>
            </div>
        </div>
        
        <h3 style="border-left: 3px solid #5346e5; padding-left: 8px; margin-bottom: 10px;">Personal Information</h3>
        <table class="table-data">
            <tr>
                <td class="label">Full Name</td>
                <td><?php echo htmlspecialchars(strtoupper($appData['student_name'])); ?></td>
            </tr>
            <tr>
                <td class="label">Email Address</td>
                <td><?php echo htmlspecialchars($appData['email']); ?></td>
            </tr>
            <tr>
                <td class="label">Phone Number</td>
                <td><?php echo htmlspecialchars($appData['phone']); ?></td>
            </tr>
            <tr>
                <td class="label">Date of Birth</td>
                <td><?php echo htmlspecialchars($appData['dob']); ?></td>
            </tr>
            <tr>
                <td class="label">Gender</td>
                <td><?php echo htmlspecialchars($appData['gender']); ?></td>
            </tr>
            <tr>
                <td class="label">Aadhar Number</td>
                <td><?php echo htmlspecialchars($appData['aadhar_number'] ?? '-'); ?></td>
            </tr>
        </table>

        <h3 style="border-left: 3px solid #5346e5; padding-left: 8px; margin-bottom: 10px;">Program Details</h3>
        <table class="table-data">
            <tr>
                <td class="label">Course Enrolled</td>
                <td><?php echo htmlspecialchars($appData['course']); ?></td>
            </tr>
            <tr>
                <td class="label">Assigned Branch</td>
                <td><?php echo htmlspecialchars($appData['branch'] ?? 'Main'); ?></td>
            </tr>
            <tr>
                <td class="label">Duration</td>
                <td><?php echo date('d/m/Y', strtotime($appData['course_start_date'])); ?> to <?php echo date('d/m/Y', strtotime($appData['course_end_date'])); ?></td>
            </tr>
        </table>

        <h3 style="border-left: 3px solid #5346e5; padding-left: 8px; margin-bottom: 10px;">Payment Breakdown</h3>
        <table class="table-data">
            <tr>
                <td class="label">Total Fee Structure</td>
                <td>INR <?php echo number_format($appData['fee_total'] ?? 0, 2); ?></td>
            </tr>
            <?php if (!empty($appData['is_scholarship'])) { ?>
            <tr>
                <td class="label">Scholarship Granted</td>
                <td><?php echo htmlspecialchars($appData['scholarship_percent']); ?>% (-INR <?php echo number_format($appData['fee_discount_amount'] ?? 0, 2); ?>)</td>
            </tr>
            <?php } ?>
            <tr>
                <td class="label">Amount Paid</td>
                <td>INR <?php echo number_format($appData['payment_amount'] ?? 0, 2); ?></td>
            </tr>
            <tr>
                <td class="label">Payment Mode</td>
                <td><?php echo htmlspecialchars($appData['payment_type'] ?? 'One Time'); ?> (<?php echo htmlspecialchars($appData['payment_method'] ?? 'Online'); ?>)</td>
            </tr>
            <tr>
                <td class="label">Transaction Reference</td>
                <td><?php echo htmlspecialchars($appData['payment_transaction_id'] ?? '-'); ?></td>
            </tr>
            <tr>
                <td class="label">Payment Status</td>
                <td class="<?php echo ($appData['payment_status'] === 'Paid' ? 'status-paid' : 'status-pending'); ?>">
                    <?php echo htmlspecialchars($appData['payment_status'] ?? 'Pending'); ?>
                </td>
            </tr>
        </table>
        
        <div class="footer">
            This is a computer generated document. No signature is required. For inquiries, please contact Lasak Techno Institute.
        </div>
    </div>
</body>
</html>
