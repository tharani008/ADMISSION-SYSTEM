<?php
// certificate_preview.php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils/certificate.php';
require_once __DIR__ . '/constants.php';

// Accept request parameters
$application_id = $_REQUEST['application_id'] ?? 'ADM-SAMPLE-001';
$certificate_number = $_REQUEST['certificate_number'] ?? 'CERT-2024-001';
$student_name = $_REQUEST['student_name'] ?? 'SAMPLE STUDENT';
$course = $_REQUEST['course'] ?? 'Sample Course';
$course_start_date = $_REQUEST['course_start_date'] ?? '2024-01-01';
$course_end_date = $_REQUEST['course_end_date'] ?? '2024-06-30';
$software_covered = $_REQUEST['software_covered'] ?? 'Sample Software A, Sample Software B';
$branch = $_REQUEST['branch'] ?? 'Sample Branch';
$logoX = isset($_REQUEST['logoX']) && $_REQUEST['logoX'] !== '' ? floatval($_REQUEST['logoX']) : null;
$logoY = isset($_REQUEST['logoY']) && $_REQUEST['logoY'] !== '' ? floatval($_REQUEST['logoY']) : null;

try {
    $courseName = trim($course);
    $category = 'CSE / IT';
    foreach (COURSE_CATEGORY_MAP as $key => $cat) {
        if (strtolower($key) === strtolower($courseName)) {
            $category = $cat;
            break;
        }
    }
    
    // Fetch template
    $templateQuery = $db->collection('course_templates')->where('category', '=', $category);
    $templateDocs = iterator_to_array($templateQuery->documents());
    
    usort($templateDocs, function($a, $b) {
        $aTime = strtotime($a->data()['created_at'] ?? '0');
        $bTime = strtotime($b->data()['created_at'] ?? '0');
        return $bTime - $aTime;
    });
    
    $currentTemplate = count($templateDocs) > 0 ? $templateDocs[0]->data() : [];
    $backgroundTemplateUrl = $currentTemplate['template_url'] ?? "https://firebasestorage.googleapis.com/v0/b/lasak-c1db5.firebasestorage.app/o/assets%2Fcourse%20template%20(1).png?alt=media";
    
    // Fetch partner logos
    $partnerQuery = $db->collection('course_templates')->where('category', '=', "_partner_" . $category);
    $partnerDocs = iterator_to_array($partnerQuery->documents());
    $partnerLogoUrls = [];
    foreach ($partnerDocs as $doc) {
        $pData = $doc->data();
        if (!empty($pData['template_url'])) {
            $partnerLogoUrls[] = $pData['template_url'];
        }
    }
    
    $fakeApplication = [
        'application_id' => $application_id,
        'certificate_number' => $certificate_number,
        'student_name' => $student_name,
        'course' => $course,
        'course_start_date' => $course_start_date,
        'course_end_date' => $course_end_date,
        'software_covered' => $software_covered,
        'branch' => $branch
    ];
    
    $logoOptions = [
        'x' => $logoX !== null ? $logoX : ($currentTemplate['x_offset'] ?? null),
        'y' => $logoY !== null ? $logoY : ($currentTemplate['y_offset'] ?? null)
    ];
    
    $pdfBuffer = generateCertificate($fakeApplication, $partnerLogoUrls, $logoOptions, $backgroundTemplateUrl);
    
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="certificate-preview.pdf"');
    header('Content-Length: ' . strlen($pdfBuffer));
    echo $pdfBuffer;
    exit();
    
} catch (\Exception $e) {
    http_response_code(500);
    echo "Error generating preview: " . $e->getMessage();
}
