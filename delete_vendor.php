<?php
// delete_vendor.php
header('Content-Type: text/plain');

$dir = __DIR__ . '/vendor';

function deleteDir($dirPath) {
    if (!is_dir($dirPath)) {
        return;
    }
    $files = scandir($dirPath);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $path = $dirPath . '/' . $file;
            if (is_dir($path)) {
                deleteDir($path);
            } else {
                unlink($path);
            }
        }
    }
    rmdir($dirPath);
}

if (is_dir($dir)) {
    echo "Deleting $dir recursively...\n";
    deleteDir($dir);
    if (!is_dir($dir)) {
        echo "SUCCESS: Deleted vendor directory.\n";
    } else {
        echo "ERROR: Failed to delete vendor directory.\n";
    }
} else {
    echo "vendor directory does not exist.\n";
}

unlink(__FILE__); // self-destruct
