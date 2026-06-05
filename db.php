<?php
// db.php

require_once __DIR__ . '/vendor/autoload.php';

try {
    if (file_exists(__DIR__ . '/.env')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
        $dotenv->load();
    }
} catch (\Exception $e) {
    // Suppress warning but log in debug cases
    error_log("Dotenv load warning: " . $e->getMessage());
}

use Google\Cloud\Firestore\FirestoreClient;
use Google\Cloud\Storage\StorageClient;

$projectId = $_ENV['FIREBASE_PROJECT_ID'] ?? null;
$clientEmail = $_ENV['FIREBASE_CLIENT_EMAIL'] ?? null;
$privateKey = $_ENV['FIREBASE_PRIVATE_KEY'] ?? null;
$bucketName = $_ENV['FIREBASE_STORAGE_BUCKET'] ?? null;

if ($privateKey) {
    $privateKey = str_replace('\n', "\n", $privateKey);
}

$db = null;
$storage = null;

if (!$projectId || !$clientEmail || !$privateKey) {
    error_log('Firebase Admin credentials are missing in .env config.');
} else {
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
        
        // Force REST transport if gRPC extension is not loaded
        if (!extension_loaded('grpc')) {
            $config['transport'] = 'rest';
        }
        
        $db = new FirestoreClient($config);
        $storage = new StorageClient($config);
    } catch (\Exception $e) {
        error_log('Error initializing Firebase Clients: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    }
}
