<?php
// list_vendor.php
header('Content-Type: text/plain');

$target = __DIR__ . '/vendor/ralouphie/getallheaders/src/getallheaders.php';

if (file_exists($target)) {
    echo "SUCCESS: File exists at: $target\n";
} else {
    echo "ERROR: File NOT found at: $target\n";
    
    // List parent directories
    $dirs = [
        __DIR__ . '/vendor',
        __DIR__ . '/vendor/ralouphie',
        __DIR__ . '/vendor/ralouphie/getallheaders',
        __DIR__ . '/vendor/ralouphie/getallheaders/src'
    ];
    
    foreach ($dirs as $dir) {
        if (is_dir($dir)) {
            echo "Contents of $dir:\n";
            $files = scandir($dir);
            foreach ($files as $file) {
                if ($file !== '.' && $file !== '..') {
                    echo " - $file " . (is_dir($dir . '/' . $file) ? '[DIR]' : '') . "\n";
                }
            }
        } else {
            echo "Directory does not exist: $dir\n";
        }
    }
}
unlink(__FILE__); // self-destruct
