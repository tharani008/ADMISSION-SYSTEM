<?php
// admin_dashboard.php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/constants.php';

session_start();

// Security session check
if (!isset($_SESSION['user'])) {
    header("Location: admin_login.php");
    exit();
}

$currentUser = $_SESSION['user'];
$adminRole = $currentUser['role'] ?? '';
$adminBranch = $currentUser['branch_id'] ?? '';
$permissions = $currentUser['permissions'] ?? [];

// Helper to check user permission
function hasPermission($perm) {
    global $permissions;
    return in_array($perm, $permissions);
}

$activeTab = $_GET['tab'] ?? 'applications';

// Load initial lists from Firestore
$applications = [];
$branches = [];
$fees = [];
$software = [];
$templates = [];
$users = [];
$penalty_config = ['grace_days' => 0, 'daily_penalty_amount' => 50];

try {
    // 1. Load Branches
    $branchDocs = $db->collection('branches')->orderBy('name', 'asc')->documents();
    foreach ($branchDocs as $doc) {
        $branches[] = array_merge(['id' => $doc->id()], $doc->data());
    }

    // 2. Load Course Fees
    $feeDocs = $db->collection('course_fees')->orderBy('course_name', 'asc')->documents();
    foreach ($feeDocs as $doc) {
        $fees[] = array_merge(['id' => $doc->id()], $doc->data());
    }

    // 3. Load App Settings (Penalty Config)
    $settingsDoc = $db->collection('app_settings')->document('penalty_config')->snapshot();
    if ($settingsDoc->exists()) {
        $penalty_config = $settingsDoc->data()['value'] ?? $penalty_config;
    }

    // 4. Load Applications with filtering
    $appQuery = $db->collection('applications');
    
    // RBAC branch filters
    if ($adminRole === 'franchise_owner' && !empty($adminBranch)) {
        // Find the branch name for this franchise owner
        $bName = '';
        foreach ($branches as $br) {
            if ($br['id'] === $adminBranch) {
                $bName = $br['name'];
                break;
            }
        }
        if (!empty($bName)) {
            $appQuery = $appQuery->where('branch', '=', $bName);
        }
    }
    
    $appDocs = $appQuery->orderBy('created_at', 'desc')->documents();
    foreach ($appDocs as $doc) {
        $applications[] = array_merge(['id' => $doc->id()], $doc->data());
    }
    
    // Filter variables
    $search = $_GET['search'] ?? '';
    $statusFilter = $_GET['status'] ?? '';
    $branchFilter = $_GET['branch'] ?? '';
    $courseFilter = $_GET['course'] ?? '';
    
    // In-memory filters
    if (!empty($search)) {
        $s = strtolower($search);
        $applications = array_filter($applications, function($a) use ($s) {
            return (isset($a['student_name']) && strpos(strtolower($a['student_name']), $s) !== false) ||
                   (isset($a['phone']) && strpos($a['phone'], $s) !== false) ||
                   (isset($a['application_id']) && strpos(strtolower($a['application_id']), $s) !== false);
        });
    }
    if (!empty($statusFilter)) {
        $applications = array_filter($applications, function($a) use ($statusFilter) {
            return ($a['status'] ?? '') === $statusFilter;
        });
    }
    if ($adminRole !== 'franchise_owner' && !empty($branchFilter)) {
        $applications = array_filter($applications, function($a) use ($branchFilter) {
            return ($a['branch'] ?? '') === $branchFilter;
        });
    }
    if (!empty($courseFilter)) {
        $applications = array_filter($applications, function($a) use ($courseFilter) {
            return ($a['course'] ?? '') === $courseFilter;
        });
    }
    
    // Calculate statistics
    $totalCount = count($applications);
    $newCount = 0;
    $paidCount = 0;
    $completedCount = 0;
    foreach ($applications as $a) {
        if (($a['status'] ?? '') === 'New') $newCount++;
        if (($a['payment_status'] ?? '') === 'Paid') $paidCount++;
        if (($a['status'] ?? '') === 'Completed') $completedCount++;
    }

    // 5. Load Software list
    if ($activeTab === 'software') {
        $swDocs = $db->collection('software_items')->orderBy('name', 'asc')->documents();
        foreach ($swDocs as $doc) {
            $software[] = array_merge(['id' => $doc->id()], $doc->data());
        }
    }

    // 6. Load Course Templates
    if ($activeTab === 'templates') {
        $tempDocs = $db->collection('course_templates')->orderBy('category', 'asc')->documents();
        foreach ($tempDocs as $doc) {
            $templates[] = array_merge(['id' => $doc->id()], $doc->data());
        }
    }

    // 7. Load Users (RBAC filtered)
    if ($activeTab === 'users') {
        $userQuery = $db->collection('users');
        if ($adminRole === 'franchise_owner') {
            $userQuery = $userQuery->where('branch_id', '=', $adminBranch);
        }
        $uDocs = $userQuery->documents();
        foreach ($uDocs as $doc) {
            $users[] = array_merge(['id' => $doc->id()], $doc->data());
        }
    }

} catch (\Exception $e) {
    error_log("Dashboard query error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Lasak Edu</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="admin-container">
        
        <!-- Sidebar Navigation -->
        <div class="admin-sidebar">
            <div class="sidebar-header">
                <h2 style="color: #ffffff; text-align: center; width: 100%;">Lasak Admin</h2>
            </div>
            
            <div class="sidebar-nav">
                <a href="?tab=applications" class="sidebar-link <?php echo $activeTab === 'applications' ? 'active' : ''; ?>">
                    Applications
                </a>
                
                <?php if (hasPermission('manage_users') || $adminRole === 'super_admin') { ?>
                    <a href="?tab=fees" class="sidebar-link <?php echo $activeTab === 'fees' ? 'active' : ''; ?>">
                        Course Fees
                    </a>
                    <a href="?tab=branches" class="sidebar-link <?php echo $activeTab === 'branches' ? 'active' : ''; ?>">
                        Branches
                    </a>
                    <a href="?tab=software" class="sidebar-link <?php echo $activeTab === 'software' ? 'active' : ''; ?>">
                        Software
                    </a>
                    <a href="?tab=templates" class="sidebar-link <?php echo $activeTab === 'templates' ? 'active' : ''; ?>">
                        Templates
                    </a>
                    <a href="?tab=settings" class="sidebar-link <?php echo $activeTab === 'settings' ? 'active' : ''; ?>">
                        Penalty Settings
                    </a>
                    <a href="?tab=users" class="sidebar-link <?php echo $activeTab === 'users' ? 'active' : ''; ?>">
                        User Accounts
                    </a>
                <?php } ?>
            </div>
            
            <div class="sidebar-footer">
                <div class="user-info">
                    Logged: <strong><?php echo htmlspecialchars($currentUser['username']); ?></strong><br>
                    Role: <span style="text-transform: capitalize; color: #a5b4fc;"><?php echo htmlspecialchars(str_replace('_', ' ', $adminRole)); ?></span>
                </div>
                <a href="admin_login.php?action=logout" onclick="<?php session_destroy(); ?>" class="btn btn-secondary" style="width: 100%; padding: 0.5rem 1rem; font-size: 0.85rem; background: #e2e8f0; border: none; color: #0f172a;">
                    Log Out
                </a>
            </div>
        </div>
        
        <!-- Main Panel Content -->
        <div class="admin-main">
            
            <!-- Dashboard APPLICATIONS -->
            <?php if ($activeTab === 'applications') { ?>
                <div class="admin-header">
                    <h1>Student Applications</h1>
                </div>
                
                <!-- Stats row -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-title">Total Applications</div>
                        <div class="stat-value"><?php echo $totalCount; ?></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">New Applications</div>
                        <div class="stat-value" style="color: var(--color-info);"><?php echo $newCount; ?></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Paid Admissions</div>
                        <div class="stat-value" style="color: var(--color-success);"><?php echo $paidCount; ?></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Completed Courses</div>
                        <div class="stat-value" style="color: var(--color-primary);"><?php echo $completedCount; ?></div>
                    </div>
                </div>
                
                <!-- Filter control bar -->
                <form method="GET" action="admin_dashboard.php" class="control-bar">
                    <input type="hidden" name="tab" value="applications">
                    <input type="text" name="search" class="form-control search-input" placeholder="Search candidate, phone, or application ID..." value="<?php echo htmlspecialchars($search); ?>">
                    
                    <select name="status" class="form-control filter-select" onchange="this.form.submit()">
                        <option value="">All Statuses</option>
                        <option value="New" <?php echo $statusFilter === 'New' ? 'selected' : ''; ?>>New</option>
                        <option value="Pending" <?php echo $statusFilter === 'Pending' ? 'selected' : ''; ?>>Pending</option>
                        <option value="Paid" <?php echo $statusFilter === 'Paid' ? 'selected' : ''; ?>>Paid</option>
                        <option value="Completed" <?php echo $statusFilter === 'Completed' ? 'selected' : ''; ?>>Completed</option>
                    </select>
                    
                    <?php if ($adminRole !== 'franchise_owner') { ?>
                        <select name="branch" class="form-control filter-select" onchange="this.form.submit()">
                            <option value="">All Branches</option>
                            <?php foreach ($branches as $br) { ?>
                                <option value="<?php echo htmlspecialchars($br['name']); ?>" <?php echo $branchFilter === $br['name'] ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($br['name']); ?>
                                </option>
                            <?php } ?>
                        </select>
                    <?php } ?>
                    
                    <select name="course" class="form-control filter-select" onchange="this.form.submit()">
                        <option value="">All Courses</option>
                        <?php foreach ($fees as $fee) { ?>
                            <option value="<?php echo htmlspecialchars($fee['course_name']); ?>" <?php echo $courseFilter === $fee['course_name'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($fee['course_name']); ?>
                            </option>
                        <?php } ?>
                    </select>
                    
                    <button type="submit" class="btn btn-primary" style="padding: 0.75rem 1.5rem;">Filter</button>
                    <a href="admin_dashboard.php?tab=applications" class="btn btn-secondary" style="padding: 0.75rem 1.5rem;">Reset</a>
                </form>
                
                <!-- Applications List Table -->
                <div class="table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Candidate Info</th>
                                <th>ID & Course</th>
                                <th>Branch</th>
                                <th>Fee Details</th>
                                <th>Status</th>
                                <th>Dues & Penalty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (count($applications) === 0) { ?>
                                <tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">No student records found.</td></tr>
                            <?php } ?>
                            <?php foreach ($applications as $app) { 
                                $statusClass = 'badge-new';
                                if ($app['status'] === 'Pending') $statusClass = 'badge-pending';
                                if ($app['status'] === 'Paid') $statusClass = 'badge-paid';
                                if ($app['status'] === 'Completed') $statusClass = 'badge-completed';
                                
                                // Days remaining and penalty
                                $dueDateStr = $app['payment_last_date'] ?? '';
                                $daysOverdue = 0;
                                $calculatedPenalty = $app['penalty_amount'] ?? 0;
                                if (!empty($dueDateStr) && $app['payment_status'] !== 'Paid' && $app['status'] !== 'Completed') {
                                    $dueTime = strtotime($dueDateStr);
                                    $graceDays = intval($penalty_config['grace_days']);
                                    $graceTime = $dueTime + ($graceDays * 24 * 60 * 60);
                                    if (time() > $graceTime) {
                                        $diff = time() - $graceTime;
                                        $daysOverdue = ceil($diff / (60 * 60 * 24));
                                        $calculatedPenalty += $daysOverdue * floatval($penalty_config['daily_penalty_amount']);
                                    }
                                }
                            ?>
                                <tr>
                                    <td>
                                        <strong><?php echo htmlspecialchars($app['student_name']); ?></strong><br>
                                        <span style="font-size: 0.8rem; color: var(--color-text-muted);"><?php echo htmlspecialchars($app['email']); ?> | <?php echo htmlspecialchars($app['phone']); ?></span>
                                    </td>
                                    <td>
                                        <code style="font-weight: 600; color: var(--color-primary-dark);"><?php echo htmlspecialchars($app['application_id'] ?? '-'); ?></code><br>
                                        <span style="font-size: 0.85rem;"><?php echo htmlspecialchars($app['course']); ?></span>
                                    </td>
                                    <td><?php echo htmlspecialchars($app['branch'] ?? 'Main'); ?></td>
                                    <td>
                                        Total: <strong>INR <?php echo number_format($app['fee_total'] ?? 0); ?></strong><br>
                                        <span style="font-size: 0.8rem; color: var(--color-text-muted);">Paid: INR <?php echo number_format($app['payment_amount'] ?? 0); ?></span>
                                    </td>
                                    <td>
                                        <span class="badge <?php echo $statusClass; ?>"><?php echo htmlspecialchars($app['status']); ?></span><br>
                                        <span style="font-size: 0.8rem; color: var(--color-text-muted);">Payment: <?php echo htmlspecialchars($app['payment_status'] ?? 'Pending'); ?></span>
                                    </td>
                                    <td>
                                        <?php if ($daysOverdue > 0) { ?>
                                            <span style="color: var(--color-danger); font-weight: bold;"><?php echo $daysOverdue; ?> Days Overdue</span><br>
                                        <?php } ?>
                                        <span style="font-size: 0.85rem;">Penalty: <strong>INR <?php echo number_format($calculatedPenalty); ?></strong></span>
                                    </td>
                                    <td>
                                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                            <a href="print.php?id=<?php echo $app['id']; ?>" target="_blank" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Print</a>
                                            <button onclick="openEditModal(<?php echo htmlspecialchars(json_encode($app)); ?>)" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #eff6ff; color: var(--color-primary-dark);">Edit</button>
                                            <button onclick="openStatusModal('<?php echo $app['id']; ?>', '<?php echo $app['status']; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Status</button>
                                            <button onclick="openPenaltyModal('<?php echo $app['id']; ?>', '<?php echo $app['penalty_amount'] ?? 0; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; color: var(--color-warning);">Penalty</button>
                                            <?php if (!empty($app['certificate_url'])) { ?>
                                                <a href="<?php echo htmlspecialchars($app['certificate_url']); ?>" target="_blank" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: var(--color-success);">Certificate</a>
                                            <?php } else { ?>
                                                <button onclick="openManualCertModal('<?php echo $app['id']; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Upload PDF</button>
                                            <?php } ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            <?php } ?>

            <!-- Dashboard COURSE FEES -->
            <?php if ($activeTab === 'fees') { ?>
                <div class="admin-header">
                    <h1>Course Fees Management</h1>
                    <button onclick="openCreateFeeModal()" class="btn btn-primary">+ Add New Course</button>
                </div>
                
                <div class="table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Course Name</th>
                                <th>Category</th>
                                <th>Total Fee</th>
                                <th>GST Share</th>
                                <th>Main Branch Share</th>
                                <th>Franchise Share</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($fees as $fee) { ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($fee['course_name']); ?></strong></td>
                                    <td><?php echo htmlspecialchars($fee['category'] ?? 'General'); ?></td>
                                    <td>INR <?php echo number_format($fee['total_fee']); ?></td>
                                    <td><?php echo htmlspecialchars($fee['gst_percent'] ?? 0); ?>%</td>
                                    <td><?php echo htmlspecialchars($fee['main_branch_percent'] ?? 0); ?>%</td>
                                    <td><?php echo htmlspecialchars($fee['franchise_branch_percent'] ?? 0); ?>%</td>
                                    <td>
                                        <button onclick="openEditFeeModal(<?php echo htmlspecialchars(json_encode($fee)); ?>)" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Edit</button>
                                        <button onclick="deleteAction('delete_fee', '<?php echo $fee['id']; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; color: var(--color-danger);">Delete</button>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            <?php } ?>

            <!-- Dashboard BRANCHES -->
            <?php if ($activeTab === 'branches') { ?>
                <div class="admin-header">
                    <h1>Branch Locations</h1>
                    <button onclick="openCreateBranchModal()" class="btn btn-primary">+ Add Branch</button>
                </div>
                
                <div class="table-wrapper" style="max-width: 600px;">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Branch Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($branches as $br) { ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($br['name']); ?></strong></td>
                                    <td>
                                        <button onclick="openEditBranchModal('<?php echo $br['id']; ?>', '<?php echo htmlspecialchars($br['name'], ENT_QUOTES); ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Rename</button>
                                        <button onclick="deleteAction('delete_branch', '<?php echo $br['id']; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; color: var(--color-danger);">Delete</button>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            <?php } ?>

            <!-- Dashboard SOFTWARE -->
            <?php if ($activeTab === 'software') { ?>
                <div class="admin-header">
                    <h1>Software Covered List</h1>
                    <button onclick="openCreateSoftwareModal()" class="btn btn-primary">+ Add Software</button>
                </div>
                
                <div class="table-wrapper" style="max-width: 600px;">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Software Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($software as $sw) { ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($sw['name']); ?></strong></td>
                                    <td>
                                        <button onclick="openEditSoftwareModal('<?php echo $sw['id']; ?>', '<?php echo htmlspecialchars($sw['name'], ENT_QUOTES); ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Rename</button>
                                        <button onclick="deleteAction('delete_software', '<?php echo $sw['id']; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; color: var(--color-danger);">Delete</button>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            <?php } ?>

            <!-- Dashboard TEMPLATES -->
            <?php if ($activeTab === 'templates') { ?>
                <div class="admin-header">
                    <h1>Certificate Templates & Coordinates</h1>
                    <button onclick="openCreateTemplateModal()" class="btn btn-primary">+ Upload Template</button>
                </div>
                
                <div class="table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Course Category</th>
                                <th>Image URL</th>
                                <th>File Name</th>
                                <th>Logo Coordinates (X, Y)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($templates as $temp) { ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($temp['category']); ?></strong></td>
                                    <td><a href="<?php echo htmlspecialchars($temp['template_url']); ?>" target="_blank" style="font-size: 0.8rem; color: var(--color-primary-dark); text-overflow: ellipsis; display: block; max-width: 250px; overflow: hidden; white-space: nowrap;"><?php echo htmlspecialchars($temp['template_url']); ?></a></td>
                                    <td><?php echo htmlspecialchars($temp['file_name'] ?? '-'); ?></td>
                                    <td>
                                        <?php if ($temp['x_offset'] !== null && $temp['y_offset'] !== null) { ?>
                                            X: <?php echo $temp['x_offset']; ?>, Y: <?php echo $temp['y_offset']; ?>
                                        <?php } else { ?>
                                            <span style="color: var(--color-text-muted);">Default Auto Center</span>
                                        <?php } ?>
                                    </td>
                                    <td>
                                        <button onclick="openOffsetModal('<?php echo $temp['id']; ?>', '<?php echo $temp['x_offset'] ?? ''; ?>', '<?php echo $temp['y_offset'] ?? ''; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Offsets</button>
                                        <a href="certificate_preview.php?logoX=<?php echo $temp['x_offset'] ?? ''; ?>&logoY=<?php echo $temp['y_offset'] ?? ''; ?>&course=<?php echo urlencode($temp['category']); ?>" target="_blank" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Preview PDF</a>
                                        <button onclick="deleteAction('delete_template', '<?php echo $temp['id']; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; color: var(--color-danger);">Delete</button>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            <?php } ?>

            <!-- Dashboard PENALTY SETTINGS -->
            <?php if ($activeTab === 'settings') { ?>
                <div class="admin-header">
                    <h1>Penalty Rules Settings</h1>
                </div>
                
                <div class="form-card" style="max-width: 500px;">
                    <form id="penaltySettingsForm" onsubmit="savePenaltySettings(event)">
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label for="grace_days">Grace Period (Days)</label>
                            <input type="number" id="grace_days" name="grace_days" class="form-control" required value="<?php echo intval($penalty_config['grace_days'] ?? 0); ?>">
                            <small style="color: var(--color-text-muted);">Number of days allowed past the due date before penalty starts calculating.</small>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label for="daily_penalty_amount">Daily Penalty Fee (INR)</label>
                            <input type="number" id="daily_penalty_amount" name="daily_penalty_amount" class="form-control" required value="<?php echo floatval($penalty_config['daily_penalty_amount'] ?? 50); ?>">
                            <small style="color: var(--color-text-muted);">The penalty amount added daily after grace days expire.</small>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">Save Configuration</button>
                    </form>
                </div>
            <?php } ?>

            <!-- Dashboard USER ACCOUNTS -->
            <?php if ($activeTab === 'users') { ?>
                <div class="admin-header">
                    <h1>User accounts (RBAC)</h1>
                    <button onclick="openCreateUserModal()" class="btn btn-primary">+ Create User</button>
                </div>
                
                <div class="table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Access Role</th>
                                <th>Assigned Branch</th>
                                <th>Permissions</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($users as $u) { 
                                $branchName = 'All Branches (Super)';
                                if (!empty($u['branch_id'])) {
                                    foreach ($branches as $br) {
                                        if ($br['id'] === $u['branch_id']) {
                                            $branchName = $br['name'];
                                            break;
                                        }
                                    }
                                }
                            ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($u['username']); ?></strong></td>
                                    <td><?php echo htmlspecialchars($u['email'] ?? '-'); ?></td>
                                    <td style="text-transform: capitalize;"><span class="badge badge-new" style="background:#e0e7ff; color:var(--color-primary-dark);"><?php echo htmlspecialchars(str_replace('_', ' ', $u['role'])); ?></span></td>
                                    <td><?php echo htmlspecialchars($branchName); ?></td>
                                    <td><code style="font-size: 0.8rem; color:#475569;"><?php echo implode(', ', $u['permissions'] ?? []); ?></code></td>
                                    <td>
                                        <button onclick="openEditUserModal(<?php echo htmlspecialchars(json_encode($u)); ?>)" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Edit</button>
                                        <button onclick="deleteAction('delete_user', '<?php echo $u['id']; ?>')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; color: var(--color-danger);">Delete</button>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            <?php } ?>
            
        </div>
    </div>

    <!-- ==========================================
         MODALS DIALOG LAYOUTS
         ========================================== -->
    
    <!-- 1. Modal: Edit Student details -->
    <div id="editModal" class="modal-overlay">
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3>Edit Candidate Registration</h3>
                <button onclick="closeModal('editModal')" class="modal-close">&times;</button>
            </div>
            <form id="editStudentForm" onsubmit="saveStudentEdit(event)">
                <input type="hidden" id="edit_app_id" name="id">
                <div class="modal-body">
                    <div class="form-grid grid-2">
                        <div class="form-group full-width">
                            <label>Student Name</label>
                            <input type="text" id="edit_student_name" name="student_name" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="tel" id="edit_phone" name="phone" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="edit_email" name="email" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Date of Birth</label>
                            <input type="date" id="edit_dob" name="dob" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Gender</label>
                            <select id="edit_gender" name="gender" class="form-control">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Select Branch</label>
                            <select id="edit_branch" name="branch" class="form-control">
                                <?php foreach ($branches as $b) { ?>
                                    <option value="<?php echo htmlspecialchars($b['name']); ?>"><?php echo htmlspecialchars($b['name']); ?></option>
                                <?php } ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Total Course Fee (INR)</label>
                            <input type="number" id="edit_fee_total" name="fee_total" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Paid Amount (INR)</label>
                            <input type="number" id="edit_payment_amount" name="payment_amount" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Payment Status</label>
                            <select id="edit_payment_status" name="payment_status" class="form-control">
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('editModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 2. Modal: Status change (with Software covered list) -->
    <div id="statusModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Update Application Status</h3>
                <button onclick="closeModal('statusModal')" class="modal-close">&times;</button>
            </div>
            <form id="statusForm" onsubmit="saveStatusUpdate(event)">
                <input type="hidden" id="status_app_id">
                <div class="modal-body">
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label for="new_status">Select Status</label>
                        <select id="new_status" class="form-control" onchange="toggleSoftwareSelection(this.value)">
                            <option value="New">New</option>
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                    
                    <!-- Software covered checkboxes -->
                    <div id="softwareSelection" style="display: none; border-top: 1px dashed #cbd5e1; padding-top: 1rem; margin-top: 1rem;">
                        <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">Select Software Covered</label>
                        <div style="max-height: 180px; overflow-y: auto; border: 1px solid #e2e8f0; padding: 0.75rem; border-radius: 4px; background: #ffffff;" id="softwareListCheckboxes">
                            <!-- Software loaded dynamically on click -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('statusModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Status</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 3. Modal: Update Penalty -->
    <div id="penaltyModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Adjust Custom Penalty</h3>
                <button onclick="closeModal('penaltyModal')" class="modal-close">&times;</button>
            </div>
            <form id="penaltyForm" onsubmit="savePenaltyUpdate(event)">
                <input type="hidden" id="penalty_app_id">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="custom_penalty">Penalty Fee (INR)</label>
                        <input type="number" id="custom_penalty" class="form-control" required min="0">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('penaltyModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 4. Modal: Upload Certificate Manual URL -->
    <div id="manualCertModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Link Certificate Manually</h3>
                <button onclick="closeModal('manualCertModal')" class="modal-close">&times;</button>
            </div>
            <form id="manualCertForm" onsubmit="saveManualCert(event)">
                <input type="hidden" id="manual_cert_app_id">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="manual_cert_url">Public PDF Certificate URL</label>
                        <input type="url" id="manual_cert_url" class="form-control" required placeholder="https://storage.googleapis.com/...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('manualCertModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Upload & Link</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 5. Modal: Create/Edit branch -->
    <div id="branchModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="branch_modal_title">Create Branch</h3>
                <button onclick="closeModal('branchModal')" class="modal-close">&times;</button>
            </div>
            <form id="branchForm" onsubmit="saveBranch(event)">
                <input type="hidden" id="branch_action" value="create_branch">
                <input type="hidden" id="branch_id">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="branch_name">Branch Location Name</label>
                        <input type="text" id="branch_name" class="form-control" required placeholder="e.g. Coimbatore North">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('branchModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Branch</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 6. Modal: Create/Edit fee -->
    <div id="feeModal" class="modal-overlay">
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3 id="fee_modal_title">Add Course Fee Structure</h3>
                <button onclick="closeModal('feeModal')" class="modal-close">&times;</button>
            </div>
            <form id="feeForm" onsubmit="saveFee(event)">
                <input type="hidden" id="fee_action" value="create_fee">
                <input type="hidden" id="fee_id">
                <div class="modal-body">
                    <div class="form-grid grid-2">
                        <div class="form-group full-width">
                            <label>Course Name</label>
                            <input type="text" id="fee_course_name" class="form-control" required placeholder="e.g. Full Stack Development">
                        </div>
                        <div class="form-group">
                            <label>Total Price (INR)</label>
                            <input type="number" id="fee_total_fee" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>GST Tax Share (%)</label>
                            <input type="number" id="fee_gst_percent" class="form-control" required min="0" max="100" value="18">
                        </div>
                        <div class="form-group">
                            <label>Main Branch Share (%)</label>
                            <input type="number" id="fee_main_branch_percent" class="form-control" required min="0" max="100" value="50">
                        </div>
                        <div class="form-group">
                            <label>Franchise Share (%)</label>
                            <input type="number" id="fee_franchise_branch_percent" class="form-control" required min="0" max="100" value="50">
                        </div>
                        <div class="form-group">
                            <label>Course Category</label>
                            <select id="fee_category" class="form-control">
                                <option value="CSE / IT">CSE / IT</option>
                                <option value="Mechanical">Mechanical</option>
                                <option value="Civil">Civil</option>
                                <option value="Kids">Kids</option>
                                <option value="General">General</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('feeModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Structure</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 7. Modal: Create/Edit Software -->
    <div id="softwareModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="software_modal_title">Add Software Tool</h3>
                <button onclick="closeModal('softwareModal')" class="modal-close">&times;</button>
            </div>
            <form id="softwareForm" onsubmit="saveSoftware(event)">
                <input type="hidden" id="software_action" value="create_software">
                <input type="hidden" id="software_id">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="software_name">Software Name</label>
                        <input type="text" id="software_name" class="form-control" required placeholder="e.g. AutoCAD, Revit">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('softwareModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Tool</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 8. Modal: Upload Template -->
    <div id="templateModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Upload Certificate Template</h3>
                <button onclick="closeModal('templateModal')" class="modal-close">&times;</button>
            </div>
            <form id="templateForm" onsubmit="saveTemplate(event)">
                <div class="modal-body">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label for="temp_category">Course Category</label>
                        <select id="temp_category" class="form-control" required>
                            <option value="CSE / IT">CSE / IT</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Civil">Civil</option>
                            <option value="Kids">Kids</option>
                            <option value="General">General</option>
                            <!-- Partner logos -->
                            <option value="_partner_CSE / IT">Partner - CSE / IT</option>
                            <option value="_partner_Mechanical">Partner - Mechanical</option>
                            <option value="_partner_Civil">Partner - Civil</option>
                            <option value="_partner_Kids">Partner - Kids</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label for="temp_url">Template Image URL (Public)</label>
                        <input type="url" id="temp_url" class="form-control" required placeholder="https://firebasestorage.googleapis.com/...">
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label for="temp_file_name">File Display Name</label>
                        <input type="text" id="temp_file_name" class="form-control" placeholder="e.g. CSE Template V1">
                    </div>
                    <div class="form-grid grid-2">
                        <div class="form-group">
                            <label for="temp_x">X Coordinate Pin Offset (pt)</label>
                            <input type="number" id="temp_x" class="form-control" placeholder="Default Center">
                        </div>
                        <div class="form-group">
                            <label for="temp_y">Y Coordinate Pin Offset (pt)</label>
                            <input type="number" id="temp_y" class="form-control" placeholder="Default Y">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('templateModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Template</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 9. Modal: Offset adjustment -->
    <div id="offsetModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Adjust Logo Coordinate Pin Offsets</h3>
                <button onclick="closeModal('offsetModal')" class="modal-close">&times;</button>
            </div>
            <form id="offsetForm" onsubmit="saveOffsets(event)">
                <input type="hidden" id="offset_temp_id">
                <div class="modal-body">
                    <div class="form-grid grid-2">
                        <div class="form-group">
                            <label for="offset_x">X coordinate Offset (pt)</label>
                            <input type="number" id="offset_x" class="form-control" placeholder="Auto Center">
                        </div>
                        <div class="form-group">
                            <label for="offset_y">Y coordinate Offset (pt)</label>
                            <input type="number" id="offset_y" class="form-control" placeholder="Auto Center">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('offsetModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Coordinates</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 10. Modal: Create User account (RBAC) -->
    <div id="userModal" class="modal-overlay">
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3 id="user_modal_title">Create Portal Admin</h3>
                <button onclick="closeModal('userModal')" class="modal-close">&times;</button>
            </div>
            <form id="userForm" onsubmit="saveUser(event)">
                <input type="hidden" id="user_action" value="create_user">
                <input type="hidden" id="user_id">
                <div class="modal-body">
                    <div class="form-grid grid-2">
                        <div class="form-group full-width">
                            <label>Username</label>
                            <input type="text" id="user_username" class="form-control" required placeholder="User handle login name">
                        </div>
                        <div class="form-group" id="pwdGroup">
                            <label>Password</label>
                            <input type="password" id="user_password" class="form-control" required placeholder="Security login key">
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="user_email" class="form-control" placeholder="username@lasakedu.in">
                        </div>
                        <div class="form-group">
                            <label>Access Role</label>
                            <select id="user_role" class="form-control" required>
                                <option value="user">User / View Only</option>
                                <?php if ($adminRole === 'super_admin') { ?>
                                    <option value="super_admin">Super Admin / Full Root</option>
                                    <option value="franchise_owner">Franchise Owner</option>
                                <?php } ?>
                            </select>
                        </div>
                        <div class="form-group" id="userBranchGroup">
                            <label>Branch Assignment</label>
                            <select id="user_branch_id" class="form-control">
                                <option value="">All Branches</option>
                                <?php foreach ($branches as $br) { ?>
                                    <option value="<?php echo $br['id']; ?>"><?php echo htmlspecialchars($br['name']); ?></option>
                                <?php } ?>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('userModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save User</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Global scripts and helpers -->
    <script>
        // Modal management helpers
        function openModal(id) {
            document.getElementById(id).classList.add('open');
        }
        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
        }

        // Send AJAX requests to admin_actions.php
        async function runAction(action, data) {
            try {
                const response = await fetch(`admin_actions.php?action=${action}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Request failed');
                alert(result.message);
                window.location.reload();
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }

        // Generic delete action confirmation
        function deleteAction(action, id) {
            if (confirm('Are you sure you want to delete this record? This action is permanent.')) {
                runAction(action, { id: id });
            }
        }

        // 1. Edit student details
        function openEditModal(app) {
            document.getElementById('edit_app_id').value = app.id;
            document.getElementById('edit_student_name').value = app.student_name || '';
            document.getElementById('edit_phone').value = app.phone || '';
            document.getElementById('edit_email').value = app.email || '';
            document.getElementById('edit_dob').value = app.dob || '';
            document.getElementById('edit_gender').value = app.gender || 'Male';
            document.getElementById('edit_branch').value = app.branch || 'Main';
            document.getElementById('edit_fee_total').value = app.fee_total || 0;
            document.getElementById('edit_payment_amount').value = app.payment_amount || 0;
            document.getElementById('edit_payment_status').value = app.payment_status || 'Pending';
            openModal('editModal');
        }
        function saveStudentEdit(e) {
            e.preventDefault();
            const data = {
                id: document.getElementById('edit_app_id').value,
                student_name: document.getElementById('edit_student_name').value,
                phone: document.getElementById('edit_phone').value,
                email: document.getElementById('edit_email').value,
                dob: document.getElementById('edit_dob').value,
                gender: document.getElementById('edit_gender').value,
                branch: document.getElementById('edit_branch').value,
                fee_total: parseFloat(document.getElementById('edit_fee_total').value || 0),
                payment_amount: parseFloat(document.getElementById('edit_payment_amount').value || 0),
                payment_status: document.getElementById('edit_payment_status').value
            };
            runAction('update_application', data);
        }

        // 2. Status change & Software Checklist loading
        let currentSoftwareList = [];
        async function fetchSoftware() {
            if (currentSoftwareList.length > 0) return currentSoftwareList;
            try {
                const res = await fetch('admin_actions.php?action=list_software'); // We can fetch from templates directly if needed
                // Instead of additional endpoints, we parse software directly from the page arrays if available or render checkboxes inline.
                // For simplicity, we can load software dynamically in Javascript from the local array!
                currentSoftwareList = <?php echo json_encode(array_column($software, 'name')); ?>;
                if (currentSoftwareList.length === 0) {
                    // Fallback to querying Firestore or static standard software list
                    currentSoftwareList = ["AutoCAD", "Revit", "SketchUp", "Photoshop", "Illustrator", "STAAD Pro", "Creo", "SolidWorks"];
                }
            } catch(e) {}
            return currentSoftwareList;
        }

        async function openStatusModal(id, currentStatus) {
            document.getElementById('status_app_id').value = id;
            document.getElementById('new_status').value = currentStatus;
            
            // Check completed status
            toggleSoftwareSelection(currentStatus);
            openModal('statusModal');
        }

        async function toggleSoftwareSelection(status) {
            const wrapper = document.getElementById('softwareSelection');
            if (status === 'Completed') {
                wrapper.style.display = 'block';
                const listContainer = document.getElementById('softwareListCheckboxes');
                listContainer.innerHTML = 'Loading software checklist...';
                
                const swList = await fetchSoftware();
                listContainer.innerHTML = '';
                
                swList.forEach(swName => {
                    const label = document.createElement('label');
                    label.className = 'checkbox-group';
                    label.style.marginBottom = '0.5rem';
                    label.innerHTML = `<input type="checkbox" name="software_checklist" value="${swName}"> ${swName}`;
                    listContainer.appendChild(label);
                });
            } else {
                wrapper.style.display = 'none';
            }
        }

        function saveStatusUpdate(e) {
            e.preventDefault();
            const id = document.getElementById('status_app_id').value;
            const status = document.getElementById('new_status').value;
            
            let software_covered = null;
            if (status === 'Completed') {
                const checked = Array.from(document.querySelectorAll('input[name="software_checklist"]:checked')).map(el => el.value);
                software_covered = checked.join(', ');
            }
            
            runAction('update_status', { id, status, software_covered });
        }

        // 3. Penalty Adjust modal
        function openPenaltyModal(id, currentVal) {
            document.getElementById('penalty_app_id').value = id;
            document.getElementById('custom_penalty').value = currentVal;
            openModal('penaltyModal');
        }
        function savePenaltyUpdate(e) {
            e.preventDefault();
            const id = document.getElementById('penalty_app_id').value;
            const amt = document.getElementById('custom_penalty').value;
            runAction('update_penalty', { id, penalty_amount: amt });
        }

        // 4. Link certificate manually modal
        function openManualCertModal(id) {
            document.getElementById('manual_cert_app_id').value = id;
            document.getElementById('manual_cert_url').value = '';
            openModal('manualCertModal');
        }
        function saveManualCert(e) {
            e.preventDefault();
            const id = document.getElementById('manual_cert_app_id').value;
            const url = document.getElementById('manual_cert_url').value;
            runAction('upload_certificate_manual', { id, certificate_url: url });
        }

        // 5. Branch operations
        function openCreateBranchModal() {
            document.getElementById('branch_action').value = 'create_branch';
            document.getElementById('branch_modal_title').textContent = 'Create Branch Location';
            document.getElementById('branch_name').value = '';
            openModal('branchModal');
        }
        function openEditBranchModal(id, name) {
            document.getElementById('branch_action').value = 'update_branch';
            document.getElementById('branch_modal_title').textContent = 'Rename Branch Location';
            document.getElementById('branch_id').value = id;
            document.getElementById('branch_name').value = name;
            openModal('branchModal');
        }
        function saveBranch(e) {
            e.preventDefault();
            const act = document.getElementById('branch_action').value;
            const data = {
                name: document.getElementById('branch_name').value,
                id: document.getElementById('branch_id').value
            };
            runAction(act, data);
        }

        // 6. Fees operations
        function openCreateFeeModal() {
            document.getElementById('fee_action').value = 'create_fee';
            document.getElementById('fee_modal_title').textContent = 'Add Course Fee Structure';
            document.getElementById('fee_course_name').value = '';
            document.getElementById('fee_total_fee').value = '';
            document.getElementById('fee_gst_percent').value = 18;
            document.getElementById('fee_main_branch_percent').value = 50;
            document.getElementById('fee_franchise_branch_percent').value = 50;
            document.getElementById('fee_category').value = 'CSE / IT';
            openModal('feeModal');
        }
        function openEditFeeModal(fee) {
            document.getElementById('fee_action').value = 'update_fee';
            document.getElementById('fee_modal_title').textContent = 'Edit Course Fee Structure';
            document.getElementById('fee_id').value = fee.id;
            document.getElementById('fee_course_name').value = fee.course_name;
            document.getElementById('fee_total_fee').value = fee.total_fee;
            document.getElementById('fee_gst_percent').value = fee.gst_percent;
            document.getElementById('fee_main_branch_percent').value = fee.main_branch_percent;
            document.getElementById('fee_franchise_branch_percent').value = fee.franchise_branch_percent;
            document.getElementById('fee_category').value = fee.category || 'General';
            openModal('feeModal');
        }
        function saveFee(e) {
            e.preventDefault();
            const act = document.getElementById('fee_action').value;
            const data = {
                id: document.getElementById('fee_id').value,
                course_name: document.getElementById('fee_course_name').value,
                total_fee: document.getElementById('fee_total_fee').value,
                gst_percent: document.getElementById('fee_gst_percent').value,
                main_branch_percent: document.getElementById('fee_main_branch_percent').value,
                franchise_branch_percent: document.getElementById('fee_franchise_branch_percent').value,
                category: document.getElementById('fee_category').value
            };
            runAction(act, data);
        }

        // 7. Software Covered operations
        function openCreateSoftwareModal() {
            document.getElementById('software_action').value = 'create_software';
            document.getElementById('software_modal_title').textContent = 'Add Software Tool';
            document.getElementById('software_name').value = '';
            openModal('softwareModal');
        }
        function openEditSoftwareModal(id, name) {
            document.getElementById('software_action').value = 'update_software';
            document.getElementById('software_modal_title').textContent = 'Rename Software Tool';
            document.getElementById('software_id').value = id;
            document.getElementById('software_name').value = name;
            openModal('softwareModal');
        }
        function saveSoftware(e) {
            e.preventDefault();
            const act = document.getElementById('software_action').value;
            const data = {
                name: document.getElementById('software_name').value,
                id: document.getElementById('software_id').value
            };
            runAction(act, data);
        }

        // 8. Template uploads
        function openCreateTemplateModal() {
            document.getElementById('temp_url').value = '';
            document.getElementById('temp_file_name').value = '';
            document.getElementById('temp_x').value = '';
            document.getElementById('temp_y').value = '';
            openModal('templateModal');
        }
        function saveTemplate(e) {
            e.preventDefault();
            const data = {
                category: document.getElementById('temp_category').value,
                template_url: document.getElementById('temp_url').value,
                file_name: document.getElementById('temp_file_name').value,
                x_offset: document.getElementById('temp_x').value || null,
                y_offset: document.getElementById('temp_y').value || null
            };
            runAction('create_template', data);
        }

        // 9. Coordinate offset modifications
        function openOffsetModal(id, x, y) {
            document.getElementById('offset_temp_id').value = id;
            document.getElementById('offset_x').value = x;
            document.getElementById('offset_y').value = y;
            openModal('offsetModal');
        }
        function saveOffsets(e) {
            e.preventDefault();
            const id = document.getElementById('offset_temp_id').value;
            const x = document.getElementById('offset_x').value || null;
            const y = document.getElementById('offset_y').value || null;
            runAction('update_template_offset', { id, x_offset: x, y_offset: y });
        }

        // 10. Penalty Settings saves
        async function savePenaltySettings(e) {
            e.preventDefault();
            const data = {
                grace_days: document.getElementById('grace_days').value,
                daily_penalty_amount: document.getElementById('daily_penalty_amount').value
            };
            runAction('update_settings_penalty', data);
        }

        // 11. User Account operations
        function openCreateUserModal() {
            document.getElementById('user_action').value = 'create_user';
            document.getElementById('user_modal_title').textContent = 'Create Portal Admin';
            document.getElementById('user_username').value = '';
            document.getElementById('user_password').value = '';
            document.getElementById('user_email').value = '';
            document.getElementById('user_role').value = 'user';
            document.getElementById('user_branch_id').value = '';
            document.getElementById('pwdGroup').style.display = 'block';
            openModal('userModal');
        }
        function openEditUserModal(user) {
            document.getElementById('user_action').value = 'update_user';
            document.getElementById('user_modal_title').textContent = 'Edit Portal Admin';
            document.getElementById('user_id').value = user.id;
            document.getElementById('user_username').value = user.username;
            document.getElementById('user_password').value = ''; // clear password input field
            document.getElementById('user_email').value = user.email || '';
            document.getElementById('user_role').value = user.role || 'user';
            document.getElementById('user_branch_id').value = user.branch_id || '';
            document.getElementById('pwdGroup').style.display = 'block'; // let them set a new password if needed
            document.getElementById('user_password').placeholder = 'Leave blank to keep same password';
            document.getElementById('user_password').required = false;
            openModal('userModal');
        }
        function saveUser(e) {
            e.preventDefault();
            const act = document.getElementById('user_action').value;
            const data = {
                id: document.getElementById('user_id').value,
                new_username: document.getElementById('user_username').value,
                new_password: document.getElementById('user_password').value,
                email: document.getElementById('user_email').value,
                new_role: document.getElementById('user_role').value,
                branch_id: document.getElementById('user_branch_id').value || null,
                
                // Fields mapping for update
                username: document.getElementById('user_username').value,
                password: document.getElementById('user_password').value,
                role: document.getElementById('user_role').value,
            };
            runAction(act, data);
        }
    </script>
</body>
</html>
