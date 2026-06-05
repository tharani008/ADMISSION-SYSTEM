<?php
// admin_actions.php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils/certificate.php';
require_once __DIR__ . '/constants.php';

session_start();

// Security session check
if (!isset($_SESSION['user'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Please log in.']);
    exit();
}

$currentUser = $_SESSION['user'];
$admin_username = $currentUser['username'] ?? '';
$adminRole = $currentUser['role'] ?? '';

// Helper to handle JSON responses
function respondJson($data, $status = 200) {
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($data);
    exit();
}

function respondError($message, $status = 500) {
    respondJson(['error' => $message], $status);
}

// Sequence generator helper
function getNextSequence($db) {
    $counterRef = $db->collection('counters')->document('applications');
    return $db->runTransaction(function ($transaction) use ($db, $counterRef) {
        $snapshot = $transaction->snapshot($counterRef);
        if (!$snapshot->exists()) {
            $documents = $db->collection('applications')->documents();
            $count = iterator_count($documents);
            $newCount = $count + 1;
            $transaction->set($counterRef, ['count' => $newCount]);
            return $newCount;
        } else {
            $currentCount = intval($snapshot->data()['count'] ?? 0);
            $newCount = $currentCount + 1;
            $transaction->update($counterRef, [
                ['path' => 'count', 'value' => $newCount]
            ]);
            return $newCount;
        }
    });
}

$action = $_GET['action'] ?? '';
$body = json_decode(file_get_contents('php://input'), true) ?? $_POST;

switch ($action) {
    
    // ----------------------------------------------------
    // APPLICATIONS ACTIONS
    // ----------------------------------------------------
    
    case 'update_application':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('Application ID is required', 400);
        
        try {
            $ref = $db->collection('applications')->document($id);
            if (!$ref->snapshot()->exists()) respondError('Application not found', 404);
            
            $updatePayload = $body;
            unset($updatePayload['id']);
            
            $ref->set($updatePayload, ['merge' => true]);
            respondJson(['message' => 'Application updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'delete_application':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('Application ID is required', 400);
        
        try {
            $db->collection('applications')->document($id)->delete();
            respondJson(['message' => 'Application deleted successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'update_penalty':
        $id = $body['id'] ?? '';
        $penalty_amount = $body['penalty_amount'] ?? 0;
        if (empty($id)) respondError('Application ID is required', 400);
        
        try {
            $db->collection('applications')->document($id)->set([
                'penalty_amount' => floatval($penalty_amount)
            ], ['merge' => true]);
            respondJson(['message' => 'Penalty updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'update_course_dates':
        $id = $body['id'] ?? '';
        $course_start_date = $body['course_start_date'] ?? '';
        $course_end_date = $body['course_end_date'] ?? '';
        if (empty($id)) respondError('Application ID is required', 400);
        
        try {
            $db->collection('applications')->document($id)->set([
                'course_start_date' => $course_start_date,
                'course_end_date' => $course_end_date
            ], ['merge' => true]);
            respondJson(['message' => 'Course dates updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'upload_certificate_manual':
        $id = $body['id'] ?? '';
        $certificate_url = $body['certificate_url'] ?? '';
        if (empty($id)) respondError('Application ID is required', 400);
        
        try {
            $db->collection('applications')->document($id)->set([
                'certificate_url' => $certificate_url,
                'certificate_uploaded_at' => date('c')
            ], ['merge' => true]);
            respondJson(['message' => 'Certificate linked successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'update_status':
        $id = $body['id'] ?? '';
        $status = $body['status'] ?? '';
        $software_covered = $body['software_covered'] ?? null;
        if (empty($id) || empty($status)) respondError('Missing details', 400);
        
        try {
            $appRef = $db->collection('applications')->document($id);
            $appDoc = $appRef->snapshot();
            if (!$appDoc->exists()) respondError('Application not found', 404);
            
            $currentApp = $appDoc->data();
            $updatePayload = ['status' => $status];
            
            if ($status === 'Completed' && $software_covered !== null) {
                $updatePayload['software_covered'] = $software_covered;
            }
            
            if ($status === 'Completed') {
                if (empty($currentApp['application_id'])) {
                    $sequence = getNextSequence($db);
                    $updatePayload['application_id'] = "LTIEC" . str_pad(strval($sequence), 4, '0', STR_PAD_LEFT);
                }
                if (empty($currentApp['certificate_number']) || $currentApp['certificate_number'] === 'PENDING') {
                    $appId = $updatePayload['application_id'] ?? ($currentApp['application_id'] ?? '');
                    $updatePayload['certificate_number'] = "TN/CBE/043/" . $appId;
                }
            }
            
            $appRef->set($updatePayload, ['merge' => true]);
            $application = array_merge($currentApp, $updatePayload);
            
            // Auto-generate Certificate PDF and upload to Storage
            if ($status === 'Completed') {
                try {
                    $courseName = trim($application['course'] ?? '');
                    $category = 'CSE / IT';
                    foreach (COURSE_CATEGORY_MAP as $key => $cat) {
                        if (strtolower($key) === strtolower($courseName)) {
                            $category = $cat;
                            break;
                        }
                    }
                    
                    // Fetch templates
                    $templateQuery = $db->collection('course_templates')->where('category', '=', $category);
                    $templateDocs = iterator_to_array($templateQuery->documents());
                    usort($templateDocs, function($a, $b) {
                        return strtotime($b->data()['created_at'] ?? '0') - strtotime($a->data()['created_at'] ?? '0');
                    });
                    
                    $template = count($templateDocs) > 0 ? $templateDocs[0]->data() : [];
                    $backgroundTemplateUrl = $template['template_url'] ?? "https://firebasestorage.googleapis.com/v0/b/lasak-c1db5.firebasestorage.app/o/assets%2Fcourse%20template%20(1).png?alt=media";
                    
                    $logoOptions = [
                        'x' => $template['x_offset'] ?? null,
                        'y' => $template['y_offset'] ?? null
                    ];
                    
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
                    
                    $pdfBuffer = generateCertificate($application, $partnerLogoUrls, $logoOptions, $backgroundTemplateUrl);
                    
                    // Upload GCS
                    global $storage, $bucketName;
                    if ($storage && !empty($bucketName)) {
                        $bucket = $storage->bucket($bucketName);
                        $safeId = str_replace('/', '-', $application['application_id'] ?? $id);
                        $fileName = "certificates/certificate_{$safeId}_" . (time() * 1000) . ".pdf";
                        
                        $object = $bucket->upload($pdfBuffer, [
                            'name' => $fileName,
                            'metadata' => ['contentType' => 'application/pdf']
                        ]);
                        $object->update(['acl' => []], ['predefinedAcl' => 'publicRead']);
                        $publicUrl = "https://storage.googleapis.com/{$bucketName}/{$fileName}";
                        
                        $appRef->set([
                            'certificate_url' => $publicUrl,
                            'certificate_uploaded_at' => date('c')
                        ], ['merge' => true]);
                    }
                } catch (\Exception $certErr) {
                    error_log('Certificate generation failed in status update: ' . $certErr->getMessage());
                }
            }
            respondJson(['message' => 'Status updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    // ----------------------------------------------------
    // BRANCH ACTIONS
    // ----------------------------------------------------
    
    case 'create_branch':
        $name = $body['name'] ?? '';
        if (empty($name)) respondError('Branch name is required', 400);
        try {
            $db->collection('branches')->add(['name' => $name]);
            respondJson(['message' => 'Branch created successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'update_branch':
        $id = $body['id'] ?? '';
        $name = $body['name'] ?? '';
        if (empty($id) || empty($name)) respondError('Missing fields', 400);
        try {
            $db->collection('branches')->document($id)->set(['name' => $name], ['merge' => true]);
            respondJson(['message' => 'Branch updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'delete_branch':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('ID is required', 400);
        try {
            $db->collection('branches')->document($id)->delete();
            respondJson(['message' => 'Branch deleted successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    // ----------------------------------------------------
    // FEE ACTIONS
    // ----------------------------------------------------
    
    case 'create_fee':
        try {
            $mainPercent = floatval($body['main_branch_percent'] ?? 0);
            $franchisePercent = floatval($body['franchise_branch_percent'] ?? 0);
            if (abs($mainPercent + $franchisePercent - 100) > 0.01) respondError('Main + Franchise share must equal 100%', 400);
            
            $payload = [
                'course_name' => $body['course_name'] ?? '',
                'total_fee' => floatval($body['total_fee'] ?? 0),
                'gst_percent' => floatval($body['gst_percent'] ?? 0),
                'main_branch_percent' => $mainPercent,
                'franchise_branch_percent' => $franchisePercent,
                'category' => $body['category'] ?? 'General'
            ];
            $db->collection('course_fees')->add($payload);
            respondJson(['message' => 'Course fee created successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'update_fee':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('ID is required', 400);
        try {
            $mainPercent = floatval($body['main_branch_percent'] ?? 0);
            $franchisePercent = floatval($body['franchise_branch_percent'] ?? 0);
            if (abs($mainPercent + $franchisePercent - 100) > 0.01) respondError('Main + Franchise share must equal 100%', 400);
            
            $payload = [
                'total_fee' => floatval($body['total_fee'] ?? 0),
                'gst_percent' => floatval($body['gst_percent'] ?? 0),
                'main_branch_percent' => $mainPercent,
                'franchise_branch_percent' => $franchisePercent,
                'category' => $body['category'] ?? 'General'
            ];
            $db->collection('course_fees')->document($id)->set($payload, ['merge' => true]);
            respondJson(['message' => 'Course fee updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'delete_fee':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('ID is required', 400);
        try {
            $db->collection('course_fees')->document($id)->delete();
            respondJson(['message' => 'Course fee deleted successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    // ----------------------------------------------------
    // CONTENT ACTIONS
    // ----------------------------------------------------
    
    case 'update_content':
        $key = $body['key'] ?? '';
        $content = $body['content'] ?? '';
        if (empty($key) || empty($content)) respondError('Key and content are required', 400);
        try {
            $db->collection('app_content')->document($key)->set([
                'content' => $content,
                'updated_at' => date('c')
            ], ['merge' => true]);
            respondJson(['message' => 'Content updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    // ----------------------------------------------------
    // SOFTWARE ACTIONS
    // ----------------------------------------------------
    
    case 'create_software':
        $name = trim($body['name'] ?? '');
        if (empty($name)) respondError('Name is required', 400);
        try {
            $db->collection('software_items')->add(['name' => $name]);
            respondJson(['message' => 'Software created successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'update_software':
        $id = $body['id'] ?? '';
        $name = trim($body['name'] ?? '');
        if (empty($id) || empty($name)) respondError('Missing fields', 400);
        try {
            $db->collection('software_items')->document($id)->set(['name' => $name], ['merge' => true]);
            respondJson(['message' => 'Software updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'delete_software':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('ID is required', 400);
        try {
            $db->collection('software_items')->document($id)->delete();
            respondJson(['message' => 'Software deleted successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    // ----------------------------------------------------
    // TEMPLATE ACTIONS
    // ----------------------------------------------------
    
    case 'create_template':
        $category = $body['category'] ?? '';
        $template_url = $body['template_url'] ?? '';
        if (empty($category) || empty($template_url)) respondError('Category and template URL are required', 400);
        try {
            $payload = [
                'category' => $category,
                'template_url' => $template_url,
                'file_name' => $body['file_name'] ?? '',
                'x_offset' => isset($body['x_offset']) && $body['x_offset'] !== '' ? floatval($body['x_offset']) : null,
                'y_offset' => isset($body['y_offset']) && $body['y_offset'] !== '' ? floatval($body['y_offset']) : null,
                'created_at' => date('c')
            ];
            $db->collection('course_templates')->add($payload);
            respondJson(['message' => 'Template uploaded successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'update_template_offset':
        $id = $body['id'] ?? '';
        $x = $body['x_offset'] ?? null;
        $y = $body['y_offset'] ?? null;
        if (empty($id)) respondError('ID is required', 400);
        try {
            $db->collection('course_templates')->document($id)->set([
                'x_offset' => $x !== null ? floatval($x) : null,
                'y_offset' => $y !== null ? floatval($y) : null
            ], ['merge' => true]);
            respondJson(['message' => 'Template coordinates saved successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'delete_template':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('ID is required', 400);
        try {
            $db->collection('course_templates')->document($id)->delete();
            respondJson(['message' => 'Template deleted successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    // ----------------------------------------------------
    // SETTINGS (PENALTY) ACTIONS
    // ----------------------------------------------------
    
    case 'update_settings_penalty':
        $grace_days = $body['grace_days'] ?? null;
        $daily_penalty_amount = $body['daily_penalty_amount'] ?? null;
        if ($grace_days === null || $daily_penalty_amount === null) respondError('Missing config values', 400);
        try {
            $db->collection('app_settings')->document('penalty_config')->set([
                'key' => 'penalty_config',
                'value' => [
                    'grace_days' => intval($grace_days),
                    'daily_penalty_amount' => floatval($daily_penalty_amount)
                ],
                'updated_at' => date('c')
            ], ['merge' => true]);
            respondJson(['message' => 'Settings saved successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    // ----------------------------------------------------
    // USER / ACCOUNT ACTIONS (RBAC)
    // ----------------------------------------------------
    
    case 'create_user':
        $new_username = $body['new_username'] ?? '';
        $new_password = $body['new_password'] ?? '';
        $new_role = $body['new_role'] ?? '';
        $branch_id = $body['branch_id'] ?? null;
        $email = $body['email'] ?? null;
        
        if (empty($new_username) || empty($new_password) || empty($new_role)) respondError('Missing details', 400);
        
        // RBAC enforcement
        if ($adminRole === 'super_admin') {
            // allowed
        } elseif ($adminRole === 'franchise_owner') {
            if ($new_role !== 'user') respondError('Franchise Owners can only create regular User accounts.', 403);
            if (strval($branch_id) !== strval($currentUser['branch_id'] ?? '')) respondError('Can only create users for your assigned branch.', 403);
        } else {
            respondError('Access denied.', 403);
        }
        
        try {
            // Standard default permissions
            $permissions = [];
            if ($new_role === 'super_admin') $permissions = ['view', 'edit', 'delete', 'manage_users'];
            elseif ($new_role === 'franchise_owner') $permissions = ['view', 'edit', 'manage_users'];
            else $permissions = ['view'];
            
            $db->collection('users')->add([
                'username' => $new_username,
                'password_hash' => $new_password,
                'role' => $new_role,
                'branch_id' => $branch_id,
                'permissions' => $permissions,
                'email' => $email,
                'created_at' => date('c')
            ]);
            respondJson(['message' => 'User account created successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'update_user':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('ID is required', 400);
        
        try {
            $ref = $db->collection('users')->document($id);
            $targetUser = $ref->snapshot()->data();
            
            // RBAC Checks
            if ($adminRole === 'super_admin') {
                // allowed
            } elseif ($adminRole === 'franchise_owner') {
                if (strval($targetUser['branch_id'] ?? '') !== strval($currentUser['branch_id'] ?? '')) respondError('Access denied for this branch.', 403);
                if (isset($body['role']) && $body['role'] !== 'user' && ($targetUser['role'] ?? '') === 'user') respondError('Cannot upgrade role.', 403);
            } else {
                respondError('Access denied.', 403);
            }
            
            $payload = [];
            if (isset($body['username'])) $payload['username'] = $body['username'];
            if (isset($body['password']) && !empty($body['password'])) $payload['password_hash'] = $body['password'];
            if (isset($body['role'])) $payload['role'] = $body['role'];
            if (array_key_exists('branch_id', $body)) $payload['branch_id'] = $body['branch_id'];
            if (isset($body['email'])) $payload['email'] = $body['email'];
            
            $ref->set($payload, ['merge' => true]);
            respondJson(['message' => 'User account updated successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    case 'delete_user':
        $id = $body['id'] ?? '';
        if (empty($id)) respondError('ID is required', 400);
        
        try {
            $ref = $db->collection('users')->document($id);
            $targetUser = $ref->snapshot()->data();
            
            // RBAC checks
            if ($adminRole === 'super_admin') {
                // allowed
            } elseif ($adminRole === 'franchise_owner') {
                if (strval($targetUser['branch_id'] ?? '') !== strval($currentUser['branch_id'] ?? '')) respondError('Access denied.', 403);
                if (($targetUser['role'] ?? '') !== 'user') respondError('Can only delete regular Users.', 403);
            } else {
                respondError('Access denied.', 403);
            }
            
            $ref->delete();
            respondJson(['message' => 'User account deleted successfully']);
        } catch (\Exception $e) {
            respondError($e->getMessage());
        }
        break;

    default:
        respondError('Action not supported', 404);
}
