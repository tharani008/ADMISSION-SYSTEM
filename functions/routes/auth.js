
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');

// Login Route (Simple username/password match for MVP)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username}`);

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        const snapshot = await db.collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userDoc = snapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() };

        // In a real app, use bcrypt.compare(password, user.password_hash)
        if (password !== user.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Return user info (excluding password)
        const { password_hash, ...userInfo } = user;
        res.json({ user: userInfo });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Register Route (For initial setup - restricted in real app)
router.post('/register', async (req, res) => {
    const { username, password, role, branch_id } = req.body;

    // Simple validation
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        const userData = {
            username,
            password_hash: password,
            role,
            branch_id,
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('users').add(userData);
        const newUser = { id: docRef.id, ...userData };

        res.json({ message: 'User created successfully', user: newUser });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create User (RBAC Restricted)
router.post('/create-user', async (req, res) => {
    const {
        admin_username, // In a real app, this comes from token/session
        new_username,
        new_password,
        new_role,
        branch_id,
        permissions,
        email // Added email
    } = req.body;

    if (!admin_username || !new_username || !new_password || !new_role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        // 1. Verify the requester (admin)
        const adminSnapshot = await db.collection('users')
            .where('username', '==', admin_username)
            .limit(1)
            .get();

        if (adminSnapshot.empty) {
            return res.status(401).json({ error: 'Unauthorized: Admin user not found' });
        }

        const adminUser = adminSnapshot.docs[0].data();

        // 2. Enforce RBAC Rules
        if (adminUser.role === 'super_admin') {
            // Super Admin can create any role
        } else if (adminUser.role === 'franchise_owner') {
            // Franchise Owner can ONLY create 'user' role
            if (new_role !== 'user') {
                return res.status(403).json({ error: 'Franchise Owners can only create Users.' });
            }
            // Franchise Owner can ONLY create users for THEIR branch
            if (String(branch_id) !== String(adminUser.branch_id)) {
                return res.status(403).json({ error: 'You can only create users for your assigned branch.' });
            }
        } else {
            // Regular Users cannot create other users
            return res.status(403).json({ error: 'Permission denied: Users cannot create accounts.' });
        }

        // Determine permissions
        let userPermissions = permissions || ['view'];
        if (!permissions) {
            if (new_role === 'super_admin') userPermissions = ['view', 'edit', 'delete', 'manage_users'];
            if (new_role === 'franchise_owner') userPermissions = ['view', 'edit', 'manage_users'];
            if (new_role === 'user') userPermissions = ['view'];
        }

        // 3. Create the new user
        const newUserPayload = {
            username: new_username,
            password_hash: new_password,
            role: new_role,
            branch_id: branch_id || null,
            permissions: userPermissions,
            email: email || null,
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('users').add(newUserPayload);
        const newUser = { id: docRef.id, ...newUserPayload };

        console.log(`User created successfully: ${new_username} (${new_role})`);
        res.json({ message: 'User created successfully', user: newUser });

    } catch (err) {
        console.error("Create User Error:", err);
        res.status(500).json({ error: 'Server error during user creation' });
    }
});

// Get Users (RBAC Restricted)
router.get('/users', async (req, res) => {
    const { admin_username } = req.query;

    if (!admin_username) {
        return res.status(400).json({ error: 'Missing admin_username' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        // 1. Verify requester
        const adminSnapshot = await db.collection('users')
            .where('username', '==', admin_username)
            .limit(1)
            .get();

        if (adminSnapshot.empty) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const adminUser = adminSnapshot.docs[0].data();

        let query = db.collection('users');

        // 2. Filter based on role
        if (adminUser.role === 'super_admin') {
            // See all
        } else if (adminUser.role === 'franchise_owner') {
            query = query.where('branch_id', '==', adminUser.branch_id);
        } else {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            delete data.password_hash;
            return { id: doc.id, ...data };
        });

        res.json(users);

    } catch (err) {
        console.error('Get Users Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update User (RBAC Restricted)
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const {
        admin_username,
        username,
        password,
        role,
        branch_id,
        permissions,
        email
    } = req.body;

    if (!admin_username) {
        return res.status(400).json({ error: 'Missing admin_username' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        // 1. Verify the requester (admin)
        const adminSnapshot = await db.collection('users')
            .where('username', '==', admin_username)
            .limit(1)
            .get();

        if (adminSnapshot.empty) {
            return res.status(401).json({ error: 'Unauthorized: Admin user not found' });
        }

        const adminUser = adminSnapshot.docs[0].data();

        // 2. Fetch the target user
        const targetRef = db.collection('users').doc(id);
        const targetDoc = await targetRef.get();

        if (!targetDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetUser = targetDoc.data();

        // 3. Enforce RBAC Rules
        if (adminUser.role === 'super_admin') {
            // Super Admin can edit anyone
        } else if (adminUser.role === 'franchise_owner') {
            if (String(targetUser.branch_id) !== String(adminUser.branch_id)) {
                return res.status(403).json({ error: 'You can only edit users in your assigned branch.' });
            }
            if (role && role !== 'user' && targetUser.role === 'user') {
                return res.status(403).json({ error: 'Franchise Owners can only manage User roles.' });
            }
        } else {
            return res.status(403).json({ error: 'Permission denied' });
        }

        // 4. Update the user
        const updateData = {};
        if (username) updateData.username = username;
        if (password) updateData.password_hash = password;
        if (role) updateData.role = role;
        if (branch_id !== undefined) updateData.branch_id = branch_id;
        if (permissions) updateData.permissions = permissions;
        if (email) updateData.email = email;

        await targetRef.update(updateData);

        const updatedDoc = await targetRef.get();
        res.json({ message: 'User updated successfully', user: { id: updatedDoc.id, ...updatedDoc.data() } });

    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).json({ error: 'Server error during user update' });
    }
});

// Delete User (RBAC Restricted)
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { admin_username } = req.body;

    if (!admin_username) {
        return res.status(400).json({ error: 'Missing admin_username' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        // 1. Verify the requester
        const adminSnapshot = await db.collection('users')
            .where('username', '==', admin_username)
            .limit(1)
            .get();

        if (adminSnapshot.empty) {
            return res.status(401).json({ error: 'Unauthorized: Admin user not found' });
        }

        const adminUser = adminSnapshot.docs[0].data();

        // 2. Fetch the target user
        const targetRef = db.collection('users').doc(id);
        const targetDoc = await targetRef.get();

        if (!targetDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetUser = targetDoc.data();

        // 3. Enforce RBAC Rules
        if (adminUser.role === 'super_admin') {
            // Super Admin can delete anyone
        } else if (adminUser.role === 'franchise_owner') {
            if (String(targetUser.branch_id) !== String(adminUser.branch_id)) {
                return res.status(403).json({ error: 'You can only delete users in your assigned branch.' });
            }
            if (targetUser.role !== 'user') {
                return res.status(403).json({ error: 'Franchise Owners can only delete User roles.' });
            }
        } else {
            return res.status(403).json({ error: 'Permission denied' });
        }

        await targetRef.delete();
        res.json({ message: 'User deleted successfully' });

    } catch (err) {
        console.error('Delete User Error:', err);
        res.status(500).json({ error: 'Server error during user deletion' });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        const snapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.json({ message: 'If an account with that email exists, we have sent a reset link to it.' });
        }

        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

        await db.collection('users').doc(userId).update({
            reset_token: resetToken,
            reset_token_expiry: resetTokenExpiry
        });

        // Always use the production franchise URL for the reset link
        const clientBaseUrl = 'https://franchise.lasakedu.in';
        const resetLink = `${clientBaseUrl}/admin/reset-password?token=${resetToken}`;

        console.log(`\n[EMAIL DEBUG] Preparing to send to: ${email}`);
        console.log(`[EMAIL DEBUG] Link: ${resetLink}`);

        // Send Email using centralized service
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            const emailSubject = 'Password Reset Request';
            const emailHtml = `
                <p>You requested a password reset.</p>
                <p>Click the link below to verify your email and set a new password:</p>
                <a href="${resetLink}">${resetLink}</a>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `;

            sendEmail(email, emailSubject, emailHtml)
                .then(success => {
                    if (success) console.log(`[EMAIL SENT] Successfully sent reset link to ${email}`);
                })
                .catch(smtpError => {
                    console.error('[EMAIL ERROR] SMTP Failed:', smtpError);
                });
        }

        res.json({ message: 'If an account with that email exists, we have sent a reset link to it.' });

    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        const snapshot = await db.collection('users')
            .where('reset_token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        // Check expiry
        if (new Date() > new Date(user.reset_token_expiry)) {
            return res.status(400).json({ error: 'Token has expired' });
        }

        // Update password and clear token
        await db.collection('users').doc(userDoc.id).update({
            password_hash: newPassword,
            reset_token: null,
            reset_token_expiry: null
        });

        res.json({ message: 'Password reset successfully' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
