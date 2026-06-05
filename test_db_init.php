<?php
// test_db_init.php
header('Content-Type: text/plain');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/vendor/autoload.php';

if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

use Google\Cloud\Firestore\FirestoreClient;

$projectId = $_ENV['FIREBASE_PROJECT_ID'] ?? null;
$clientEmail = $_ENV['FIREBASE_CLIENT_EMAIL'] ?? null;
$privateKey = $_ENV['FIREBASE_PRIVATE_KEY'] ?? null;

if ($privateKey) {
    $privateKey = str_replace('\n', "\n", $privateKey);
}

echo "Project ID: $projectId\n";
echo "Client Email: $clientEmail\n";
echo "Private Key length: " . strlen($privateKey) . "\n";

try {
    $config = [
        'projectId' => $projectId,
        'keyFile' => [
            'type' => 'service_account',
            'project_id' => $projectId,
            'client_email' => $clientEmail,
            'private_key' => $privateKey,
        ]
    ];
    
    if (!extension_loaded('grpc')) {
        $config['transport'] = 'rest';
    }
    
    echo "Instantiating FirestoreClient...\n";
    $db = new FirestoreClient($config);
    echo "FirestoreClient instantiated successfully!\n";
    
    echo "Querying applications collection...\n";
    $docs = $db->collection('applications')->limit(1)->documents();
    echo "Query executed!\n";
    foreach ($docs as $doc) {
        echo "Found doc ID: " . $doc->id() . "\n";
    }
} catch (\Throwable $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    echo "Trace: \n" . $e->getTraceAsString() . "\n";
}
unlink(__FILE__);
