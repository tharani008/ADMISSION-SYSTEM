<?php
// utils/scholarship.php

define('COURSE_CATEGORIES', [
    // IT Category
    'BIM Professional' => 'IT',
    'Web Development' => 'IT',
    'Data Analytics' => 'IT',
    'Digital Marketing (Adv)' => 'IT',
    'MS Office' => 'IT',
    'Python Programming' => 'IT',
    'Scratch Coding' => 'IT',
    'Java Programming' => 'IT',
    'Full Stack Development' => 'IT',
    'Software Testing' => 'IT',
    'UI/UX Design' => 'IT',
    'Digital Marketing (Media)' => 'IT',

    // Mechanical Category
    'AutoCAD Mechanical' => 'Mechanical',
    'Computational Fluid Dynamics (CFD)' => 'Mechanical',
    'Wiring Harness Design' => 'Mechanical',
    'Creo Parametric' => 'Mechanical',
    'SolidWorks Masterclass' => 'Mechanical',
    '3D Printing & Prototyping' => 'Mechanical',
    'HyperMesh' => 'Mechanical',
    'ANSYS Simulation' => 'Mechanical',
    'CATIA V5' => 'Mechanical',
    'ANSA Pre-processing' => 'Mechanical',
    'NX CAD (Unigraphics)' => 'Mechanical',
    'Autodesk Inventor' => 'Mechanical',

    // Civil Category
    'STAAD.Pro' => 'Civil',
    'Revit Architecture' => 'Civil',
    'Civil CAD' => 'Civil',
    'SketchUp' => 'Civil',

    // Other/General
    'Tally with GST' => 'General',
    'Robotics for Kids' => 'General'
]);

define('SCHOLARSHIP_RULES', [
    'IT' => [
        ['minPercent' => 85, 'maxPercent' => 100, 'discount' => 45],
        ['minPercent' => 65, 'maxPercent' => 85, 'discount' => 20],
        ['minPercent' => 50, 'maxPercent' => 65, 'discount' => 15]
    ],
    'Mechanical' => [
        ['minPercent' => 85, 'maxPercent' => 100, 'discount' => 30],
        ['minPercent' => 65, 'maxPercent' => 85, 'discount' => 20],
        ['minPercent' => 50, 'maxPercent' => 60, 'discount' => 10]
    ],
    'Civil' => [
        ['minPercent' => 85, 'maxPercent' => 100, 'discount' => 25],
        ['minPercent' => 65, 'maxPercent' => 85, 'discount' => 12],
        ['minPercent' => 50, 'maxPercent' => 65, 'discount' => 7]
    ],
    'General' => [
        ['minPercent' => 85, 'maxPercent' => 100, 'discount' => 20],
        ['minPercent' => 65, 'maxPercent' => 85, 'discount' => 10],
        ['minPercent' => 50, 'maxPercent' => 65, 'discount' => 5]
    ]
]);

function getCourseCategory($courseName) {
    return COURSE_CATEGORIES[$courseName] ?? 'General';
}

function calculateAverage($marks10th, $marks12th, $marksUG = null) {
    $marks = [floatval($marks10th), floatval($marks12th)];
    if ($marksUG !== null && $marksUG !== '' && floatval($marksUG) > 0) {
        $marks[] = floatval($marksUG);
    }
    $sum = array_sum($marks);
    $average = $sum / count($marks);
    return round($average, 2);
}

function getScholarshipPercent($category, $average) {
    $rules = SCHOLARSHIP_RULES[$category] ?? SCHOLARSHIP_RULES['General'];
    foreach ($rules as $rule) {
        if ($average >= $rule['minPercent'] && $average <= $rule['maxPercent']) {
            return $rule['discount'];
        }
    }
    return 0;
}

function calculateScholarship($courseName, $marks10th, $marks12th, $marksUG = null) {
    if (!$courseName || $marks10th === null || $marks12th === null) {
        throw new \Exception('Course name, 10th marks, and 12th marks are required');
    }
    if ($marks10th < 0 || $marks10th > 100 || $marks12th < 0 || $marks12th > 100) {
        throw new \Exception('Marks must be between 0 and 100');
    }
    if ($marksUG !== null && $marksUG !== '' && ($marksUG < 0 || $marksUG > 100)) {
        throw new \Exception('UG marks must be between 0 and 100');
    }

    $category = getCourseCategory($courseName);
    $average = calculateAverage($marks10th, $marks12th, $marksUG);
    $scholarshipPercent = getScholarshipPercent($category, $average);

    return [
        'category' => $category,
        'average' => $average,
        'scholarshipPercent' => $scholarshipPercent,
        'isEligible' => $scholarshipPercent > 0
    ];
}

function calculateFeeWithScholarship($baseFee, $scholarshipPercent, $gstPercent, $mainBranchPercent, $franchiseBranchPercent) {
    $discountAmount = ($baseFee * $scholarshipPercent) / 100;
    $feeAfterDiscount = $baseFee - $discountAmount;
    $gstAmount = ($feeAfterDiscount * $gstPercent) / 100;
    $netAmount = $feeAfterDiscount - $gstAmount;
    $mainBranchAmount = ($netAmount * $mainBranchPercent) / 100;
    $franchiseBranchAmount = ($netAmount * $franchiseBranchPercent) / 100;

    return [
        'baseFee' => round($baseFee, 2),
        'discountAmount' => round($discountAmount, 2),
        'feeAfterDiscount' => round($feeAfterDiscount, 2),
        'gstAmount' => round($gstAmount, 2),
        'netAmount' => round($netAmount, 2),
        'mainBranchAmount' => round($mainBranchAmount, 2),
        'franchiseBranchAmount' => round($franchiseBranchAmount, 2)
    ];
}
