<?php
// test_zip_info.php
header('Content-Type: text/plain');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$zipFile = __DIR__ . '/vendor.zip';
if (!file_exists($zipFile)) {
    die("vendor.zip does not exist!\n");
}

$zip = new ZipArchive();
if ($zip->open($zipFile) === TRUE) {
    echo "Opened vendor.zip successfully.\n";
    echo "Files in ZIP: " . $zip->numFiles . "\n";
    
    // Get details of first 5 entries
    for ($i = 0; $i < min(5, $zip->numFiles); $i++) {
        $name = $zip->getNameIndex($i);
        $stat = $zip->statIndex($i);
        echo "Entry $i: $name (size: {$stat['size']}, compSize: {$stat['comp_size']})\n";
    }
    
    // Try to extract only one small file
    $testFile = $zip->getNameIndex(0);
    echo "Attempting to extract: $testFile ...\n";
    
    $res = $zip->extractTo(__DIR__, $testFile);
    if ($res) {
        echo "Extraction of single file returned TRUE.\n";
        $extractedPath = __DIR__ . '/' . $testFile;
        if (file_exists($extractedPath)) {
            echo "SUCCESS: File exists at: $extractedPath\n";
            unlink($extractedPath);
        } else {
            echo "ERROR: File NOT found at $extractedPath despite extractTo returning TRUE!\n";
        }
    } else {
        echo "ERROR: Extraction of single file returned FALSE.\n";
    }
    
    $zip->close();
} else {
    echo "Failed to open vendor.zip.\n";
}
unlink(__FILE__);
