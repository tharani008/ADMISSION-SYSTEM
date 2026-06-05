<?php
// utils/certificate.php

require_once __DIR__ . '/../vendor/autoload.php';

use FPDF;

function downloadImageToTemp($url) {
    if (empty($url)) return null;
    try {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0); // Disable SSL check for compatibility
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $data = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $data) {
            $tempFile = tempnam(sys_get_temp_dir(), 'cert_img_');
            if ($tempFile) {
                file_put_contents($tempFile, $data);
                return $tempFile;
            }
        }
    } catch (\Exception $e) {
        error_log("Failed to download image " . $url . ": " . $e->getMessage());
    }
    return null;
}

function generateCertificate($application, $partnerLogoUrls = [], $logoOptions = [], $templateUrl = null) {
    // 1. Download temp files
    $partnerTempFiles = [];
    foreach ($partnerLogoUrls as $url) {
        $temp = downloadImageToTemp($url);
        if ($temp) {
            $partnerTempFiles[] = $temp;
        }
    }

    $templateTempFile = null;
    if ($templateUrl) {
        $templateTempFile = downloadImageToTemp($templateUrl);
    }

    // 2. Initialize FPDF
    // Size is [1414, 2000] in points (pt)
    $pdf = new FPDF('P', 'pt', [1414, 2000]);
    $pdf->SetMargins(0, 0, 0);
    $pdf->SetAutoPageBreak(false);
    $pdf->AddPage();

    // 3. Draw Background Template
    if ($templateTempFile && file_exists($templateTempFile)) {
        $pdf->Image($templateTempFile, 0, 0, 1414, 2000);
        unlink($templateTempFile);
    } else {
        // Fallback to local template or background rect
        $localTemplatePath = __DIR__ . '/../server/assets/course template (1).png';
        if (file_exists($localTemplatePath)) {
            $pdf->Image($localTemplatePath, 0, 0, 1414, 2000);
        } else {
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Rect(0, 0, 1414, 2000, 'F');
            $pdf->SetFont('Helvetica', 'B', 40);
            $pdf->SetTextColor(51, 51, 51);
            $pdf->Text(100, 500, "TEMPLATE MISSING");
        }
    }

    // 4. Draw Overlay Text
    $pdf->SetTextColor(0, 0, 0);
    $standardFontSize = 36;
    
    // Helper to draw text top-aligned
    $drawText = function($text, $x, $y, $fontSize, $fontStyle = 'B') use ($pdf) {
        $pdf->SetFont('Helvetica', $fontStyle, $fontSize);
        // baseline adjustment: ~0.8 * fontSize
        $adjustedY = $y + ($fontSize * 0.8);
        $pdf->Text($x, $adjustedY, $text);
    };

    // Coordinates mapping
    $lineY_Admission = 889;
    $lineY_Cert = 895;
    $lineY_Name = 994;
    $lineY_Course = 1082;
    $lineY_Duration = 1176;
    $lineY_Issued = 1266;
    $lineY_Software = 1358;
    $lineY_Branch = 1447;

    $valX_Admission = 345;
    $valX_Cert = 980;
    $valX_Main = 450;

    // Admission ID
    $drawText($application['application_id'] ?? '', $valX_Admission, $lineY_Admission, $standardFontSize);

    // Certificate Number
    $drawText($application['certificate_number'] ?? 'PENDING', $valX_Cert, $lineY_Cert, $standardFontSize);

    // Student Name
    $studentName = strtoupper($application['student_name'] ?? '');
    $drawText($studentName, $valX_Main, $lineY_Name, $standardFontSize);

    // Course Name
    $courseName = strtoupper($application['course'] ?? '');
    $drawText($courseName, $valX_Main, $lineY_Course, $standardFontSize);

    // Course Duration
    $startDate = !empty($application['course_start_date']) ? date('d/m/Y', strtotime($application['course_start_date'])) : '';
    $endDate = !empty($application['course_end_date']) ? date('d/m/Y', strtotime($application['course_end_date'])) : '';
    $durationText = ($startDate && $endDate) ? "{$startDate} to {$endDate}" : '';
    $drawText($durationText, $valX_Main, $lineY_Duration, $standardFontSize);

    // Issued On
    $issueDate = date('d/m/Y');
    $drawText($issueDate, $valX_Main, $lineY_Issued, $standardFontSize);

    // Software Covered
    $softwareText = $application['software_covered'] ?? '';
    if (!empty($softwareText)) {
        $pdf->SetFont('Helvetica', 'B', $standardFontSize);
        $pdf->SetLeftMargin($valX_Main);
        $pdf->SetXY($valX_Main, $lineY_Software);
        $pdf->MultiCell(850, $standardFontSize * 1.2, $softwareText, 0, 'L');
        $pdf->SetLeftMargin(0); // Reset margin
    }

    // Branch
    $branchName = $application['branch'] ?? '';
    $branchText = !empty($branchName) ? "LASAK EDU, {$branchName}" : "LASAK EDU";
    $drawText(strtoupper($branchText), $valX_Main, $lineY_Branch, $standardFontSize);

    // 5. Draw Partner Logos
    if (count($partnerTempFiles) > 0) {
        $logoMaxH = 130;
        $logoMaxW = 220;
        $logoPadding = 60;

        $startX = isset($logoOptions['x']) && $logoOptions['x'] !== null ? intval($logoOptions['x']) : 120;
        $logoAreaY = isset($logoOptions['y']) && $logoOptions['y'] !== null ? intval($logoOptions['y']) : 1760;

        foreach ($partnerTempFiles as $i => $tempFile) {
            if (file_exists($tempFile)) {
                $x = $startX + $i * ($logoMaxW + $logoPadding);
                list($origW, $origH) = getimagesize($tempFile);
                if ($origW > 0 && $origH > 0) {
                    $ratio = $origW / $origH;
                    $w = $logoMaxW;
                    $h = $logoMaxW / $ratio;
                    if ($h > $logoMaxH) {
                        $h = $logoMaxH;
                        $w = $logoMaxH * $ratio;
                    }
                    try {
                        $pdf->Image($tempFile, $x, $logoAreaY, $w, $h);
                    } catch (\Exception $imgErr) {
                        error_log('FPDF Logo drawing error: ' . $imgErr->getMessage());
                    }
                }
                unlink($tempFile);
            }
        }
    }

    // Return the PDF as string buffer
    return $pdf->Output('S');
}
