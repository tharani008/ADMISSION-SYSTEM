<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Starting debug check...\n";

// Check if vendor/autoload.php exists
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    echo "vendor/autoload.php exists!\n";
} else {
    die("Error: vendor/autoload.php does not exist!\n");
}

try {
    require_once __DIR__ . '/db.php';
    echo "db.php loaded successfully!\n";
    echo "Project ID: " . ($_ENV['FIREBASE_PROJECT_ID'] ?? 'MISSING') . "\n";
    echo "gRPC loaded: " . (extension_loaded('grpc') ? 'YES' : 'NO') . "\n";
    
    echo "Firestore object: ";
    var_dump($db);
    
    echo "Storage object: ";
    var_dump($storage);
} catch (\Throwable $e) {
    echo "Caught exception: " . $e->getMessage() . "\n";
    echo "Trace: \n" . $e->getTraceAsString() . "\n";
}
