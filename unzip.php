<?php
// unzip.php
header('Content-Type: text/plain');
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set execution limits
set_time_limit(300);
ini_set('memory_limit', '512M');

echo "Starting optimized unzip process...\n";

// 1. Clean up any weird backslash folders/files created in the root directory from previous extraction attempts
$rootFiles = scandir(__DIR__);
foreach ($rootFiles as $file) {
    if (strpos($file, '\\') !== false) {
        $badPath = __DIR__ . '/' . $file;
        echo "Cleaning up invalid path: $badPath\n";
        if (is_dir($badPath)) {
            // Delete directory recursively
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($badPath, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($iterator as $item) {
                if ($item->isDir()) {
                    rmdir($item->getPathname());
                } else {
                    unlink($item->getPathname());
                }
            }
            rmdir($badPath);
        } else {
            unlink($badPath);
        }
    }
}

// 2. Open and extract vendor.zip with cross-platform separator correction
$zipFile = __DIR__ . '/vendor.zip';
if (!file_exists($zipFile)) {
    die("Error: vendor.zip not found!\n");
}

$zip = new ZipArchive();
if ($zip->open($zipFile) === TRUE) {
    echo "Files in ZIP: " . $zip->numFiles . "\n";
    echo "Extracting files...\n";
    
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        
        // Correct Windows backslash separator to Linux forward slash
        $fixedName = str_replace('\\', '/', $name);
        $destPath = __DIR__ . '/' . $fixedName;
        
        if (substr($fixedName, -1) === '/') {
            // Directory entry
            if (!is_dir($destPath)) {
                mkdir($destPath, 0755, true);
            }
        } else {
            // File entry
            $parentDir = dirname($destPath);
            if (!is_dir($parentDir)) {
                mkdir($parentDir, 0755, true);
            }
            
            $fp = $zip->getStream($name);
            if ($fp) {
                $out = fopen($destPath, 'w');
                if ($out) {
                    stream_copy_to_stream($fp, $out);
                    fclose($out);
                }
                fclose($fp);
            }
        }
        
        if ($i > 0 && $i % 500 === 0) {
            echo "  Extracted $i files...\n";
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
        }
    }
    
    echo "Extraction completed successfully!\n";
    $zip->close();
    
    // Clean up zip
    unlink($zipFile);
    echo "Cleaned up vendor.zip.\n";
    
    // Self-destruct unzip.php
    unlink(__FILE__);
    echo "Cleaned up unzip.php (self-destructed).\n";
} else {
    echo "Error: Failed to open vendor.zip!\n";
}
