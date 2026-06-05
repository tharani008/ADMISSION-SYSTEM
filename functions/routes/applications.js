
const express = require('express');
const router = express.Router();
const { db, admin, storage } = require('../config/firebaseAdmin');
const { sendEmail } = require('../utils/emailService');
const { generateCertificate } = require('../utils/certificateGenerator');
const { COURSE_CATEGORY_MAP } = require('../config/constants');

// Helper to get next sequence for application_id
async function getNextSequence() {
    if (!db) throw new Error('Database not initialized');
    const counterRef = db.collection('counters').doc('applications');
    return db.runTransaction(async (transaction) => {
        const doc = await transaction.get(counterRef);
        if (!doc.exists) {
            const snapshot = await db.collection('applications').get();
            const count = snapshot.size;
            const newCount = count + 1;
            transaction.set(counterRef, { count: newCount });
            return newCount;
        } else {
            const currentCount = Number(doc.data().count);
            const newCount = (isNaN(currentCount) ? 0 : currentCount) + 1;
            transaction.update(counterRef, { count: newCount });
            return newCount;
        }
    });
}

// Get all branches
router.get('/branches', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const snapshot = await db.collection('branches').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Application (Public)
router.post('/', async (req, res) => {
    const {
        student_name, phone, email, course, branch,
        address, dob, gender,
        college_company, photo_url, signature_url, id_proof_url,
        marksheet_10th_url, marksheet_12th_url, marksheet_degree_url,
        course_start_date, course_end_date,
        previous_school, previous_marks,
        marks_10th, marks_12th, marks_ug,
        marks_average, scholarship_category,
        referral_phone_1, referral_phone_2,
        referral1_name, referral1_email, referral1_contact_no, referral1_occupation,
        referral2_name, referral2_email, referral2_contact_no, referral2_occupation,
        payment_type, installments_count,
        aadhar_number, pan_number
    } = req.body;

    if (!student_name || !phone || !branch || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const sequence = await getNextSequence();
        const paddedSequence = String(sequence).padStart(4, '0');
        const application_id = `LTIEC${paddedSequence}`;
        const certificate_number = `TN/CBE/043/${application_id}`;

        const applicationData = {
            student_name: student_name || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            dob: dob || null,
            gender: gender || null,
            college_company: college_company || null,
            previous_school: previous_school || null,
            previous_marks: previous_marks || null,
            photo_url: photo_url || null,
            signature_url: signature_url || null,
            id_proof_url: id_proof_url || null,
            marksheet_10th_url: marksheet_10th_url || null,
            marksheet_12th_url: marksheet_12th_url || null,
            marksheet_degree_url: marksheet_degree_url || null,
            course: course || null,
            branch: branch || null,
            course_start_date: course_start_date || null,
            course_end_date: course_end_date || null,
            application_id,
            certificate_number,
            status: 'New',
            fee_total: Number(req.body.fee_total) || 0,
            fee_gst_amount: Number(req.body.fee_gst_amount) || 0,
            fee_main_branch_amount: Number(req.body.fee_main_branch_amount) || 0,
            fee_franchise_branch_amount: Number(req.body.fee_franchise_branch_amount) || 0,
            marks_10th: marks_10th || null,
            marks_12th: marks_12th || null,
            marks_ug: marks_ug || null,
            marks_average: marks_average || null,
            scholarship_category: scholarship_category || null,
            is_scholarship: req.body.is_scholarship || false,
            scholarship_percent: Number(req.body.scholarship_percent) || 0,
            fee_discount_amount: Number(req.body.fee_discount_amount) || 0,
            referral_phone_1: referral_phone_1 || null,
            referral_phone_2: referral_phone_2 || null,
            referral1_name: referral1_name || null,
            referral1_email: referral1_email || null,
            referral1_contact_no: referral1_contact_no || null,
            referral1_occupation: referral1_occupation || null,
            referral2_name: referral2_name || null,
            referral2_email: referral2_email || null,
            referral2_contact_no: referral2_contact_no || null,
            referral2_occupation: referral2_occupation || null,
            payment_last_date: req.body.payment_last_date || null,
            payment_status: req.body.payment_status || 'Pending',
            payment_method: req.body.payment_method || null,
            payment_transaction_id: req.body.payment_transaction_id || null,
            payment_amount: Number(req.body.payment_amount) || 0,
            payment_date: req.body.payment_date || null,
            payment_type: payment_type || null,
            installments_count: (parseInt(installments_count) || 0),
            aadhar_number: aadhar_number || null,
            pan_number: pan_number || null,
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('applications').add(applicationData);
        const application = { id: docRef.id, ...applicationData };

        res.json({ message: 'Application submitted successfully', application });

        // Send Welcome Email
        const emailSubject = 'Welcome to Lasak Edu! - Enrolment Successful';
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #2c3e50; text-align: center;">Welcome to Lasak Edu!</h2>
                <p>Dear <strong>${student_name}</strong>,</p>
                <p>Congratulations! Your enrolment for the <strong>${course}</strong> course at Lasak Techno Institute has been successfully submitted.</p>
                <h3 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Course Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;"><strong>Application ID:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${application_id}</td>
                    </tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Course:</strong></td><td>${course}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Duration:</strong></td><td>${course_start_date} to ${course_end_date}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Total Fee:</strong></td><td>₹${req.body.fee_total}</td></tr>
                </table>
                <p style="text-align: center; font-weight: bold;">Wishing you all the best!</p>
            </div>
        `;
        sendEmail(email, emailSubject, emailHtml).catch(err => console.error('Error sending welcome email:', err));

    } catch (err) {
        console.error('CRITICAL: Error submitting application:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Get all applications or filter
router.get('/', async (req, res) => {
    const { branch, branch_id, status, search, application_id, email, phone, course, student_name } = req.query;

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        if (application_id) {
            const snapshot = await db.collection('applications').where('application_id', '==', application_id).limit(1).get();
            if (snapshot.empty) return res.status(404).json({ error: 'Application not found' });
            return res.json({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }

        let query = db.collection('applications');

        if (branch_id) {
            const branchDoc = await db.collection('branches').doc(branch_id).get();
            if (branchDoc.exists) {
                query = query.where('branch', '==', branchDoc.data().name);
            }
        } else if (branch) {
            query = query.where('branch', '==', branch);
        }

        if (status) query = query.where('status', '==', status);
        if (course) query = query.where('course', '==', course);

        // Firestore doesn't support case-insensitive ilike or partial matches easily without orderBy.
        // For simplicity, we'll fetch then filter or just use exact matches for now where easy.

        let snapshot = await query.orderBy('created_at', 'desc').get();
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Manual filtering for search/ilike counterparts
        if (email) data = data.filter(a => a.email && a.email.toLowerCase().includes(email.toLowerCase()));
        if (phone) data = data.filter(a => a.phone && a.phone.includes(phone));
        if (student_name) data = data.filter(a => a.student_name && a.student_name.toLowerCase().includes(student_name.toLowerCase()));
        if (search) {
            const s = search.toLowerCase();
            data = data.filter(a => (a.student_name && a.student_name.toLowerCase().includes(s)) || (a.phone && a.phone.includes(s)));
        }

        res.json(data);
    } catch (err) {
        console.error('GET /api/applications error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update Application Penalty
router.put('/:id/penalty', async (req, res) => {
    const { id } = req.params;
    const { penalty_amount } = req.body;

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        await db.collection('applications').doc(id).update({ penalty_amount: parseFloat(penalty_amount) });
        const updated = await db.collection('applications').doc(id).get();
        res.json({ message: 'Penalty updated successfully', application: { id: updated.id, ...updated.data() } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Application Status
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, software_covered } = req.body;

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const appRef = db.collection('applications').doc(id);
        const appDoc = await appRef.get();
        if (!appDoc.exists) return res.status(404).json({ error: 'Application not found' });
        const currentApp = appDoc.data();

        let updatePayload = { status };
        if (status === 'Completed' && software_covered !== undefined) {
            updatePayload.software_covered = software_covered;
        }

        if (status === 'Completed') {
            if (!currentApp.application_id) {
                const sequence = await getNextSequence();
                updatePayload.application_id = `LTIEC${String(sequence).padStart(4, '0')}`;
            }
            if (!currentApp.certificate_number || currentApp.certificate_number === 'PENDING') {
                const appId = updatePayload.application_id || currentApp.application_id;
                updatePayload.certificate_number = `TN/CBE/043/${appId}`;
            }
        }

        await appRef.update(updatePayload);
        let application = { id, ...currentApp, ...updatePayload };

        if (status === 'Completed') {
            try {
                const courseName = (application.course || '').trim();
                const mapKey = Object.keys(COURSE_CATEGORY_MAP).find(k => k.toLowerCase() === courseName.toLowerCase());
                const category = mapKey ? COURSE_CATEGORY_MAP[mapKey] : 'CSE / IT';
                console.log(`Generating FINAL certificate for course: "${application.course}", category: "${category}"`);

                const templateSnapshot = await db.collection('course_templates')
                    .where('category', '==', category)
                    .get();

                const templateDocs = templateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                const template = templateDocs[0] || {};
                const backgroundTemplateUrl = template.template_url || "https://firebasestorage.googleapis.com/v0/b/lasak-c1db5.firebasestorage.app/o/assets%2Fcourse%20template%20(1).png?alt=media";
                console.log(`Background Template: ${backgroundTemplateUrl}`);

                const logoOptions = { x: template.x_offset, y: template.y_offset };

                const partnerSnapshot = await db.collection('course_templates')
                    .where('category', '==', `_partner_${category}`)
                    .get();

                // Fetch ALL logos for this category, just like the preview
                const partnerLogoUrls = partnerSnapshot.docs.map(doc => doc.data().template_url);
                console.log(`Partner Logos Found: ${partnerLogoUrls.length}`);

                const pdfBuffer = await generateCertificate(application, partnerLogoUrls, logoOptions, backgroundTemplateUrl);

                // Upload to Firebase Storage
                const bucket = storage.bucket();
                const safeId = (application.application_id || id).replace(/\//g, '-');
                const fileName = `certificates/certificate_${safeId}_${Date.now()}.pdf`;
                const file = bucket.file(fileName);

                await file.save(pdfBuffer, { contentType: 'application/pdf' });
                await file.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

                await appRef.update({
                    certificate_url: publicUrl,
                    certificate_uploaded_at: new Date().toISOString()
                });
                application.certificate_url = publicUrl;
                application.certificate_uploaded_at = new Date().toISOString();

            } catch (certErr) {
                console.error('Certificate generation failed:', certErr.message);
            }
        }

        res.json({ message: 'Status updated', application });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Stats
router.get('/stats', async (req, res) => {
    const { branch } = req.query;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        let query = db.collection('applications');
        if (branch) query = query.where('branch', '==', branch);
        const snapshot = await query.get();
        res.json({ totalApplications: snapshot.size });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Certificate Alerts
router.get('/alerts', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const { branch, branch_id } = req.query;
        const today = new Date();

        let query = db.collection('applications')
            .where('certificate_url', '==', null);
        // Note: Firestore doesn't support multiple filters easily without index.

        const snapshot = await query.get();
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (branch_id) {
            const branchDoc = await db.collection('branches').doc(branch_id).get();
            if (branchDoc.exists) data = data.filter(a => a.branch === branchDoc.data().name);
        } else if (branch) {
            data = data.filter(a => a.branch === branch);
        }

        const alerts = data.map(student => {
            const endDate = new Date(student.course_end_date);
            const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            return { ...student, days_remaining: daysRemaining, is_overdue: daysRemaining < 0 };
        });

        res.json(alerts.sort((a, b) => new Date(a.course_end_date) - new Date(b.course_end_date)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload Certificate
router.put('/:id/certificate', async (req, res) => {
    const { id } = req.params;
    const { certificate_url } = req.body;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        await db.collection('applications').doc(id).update({
            certificate_url,
            certificate_uploaded_at: new Date().toISOString()
        });
        const updated = await db.collection('applications').doc(id).get();
        res.json({ message: 'Certificate uploaded successfully', application: { id: updated.id, ...updated.data() } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Application Details
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const updateData = { ...req.body };
        delete updateData.id;
        await db.collection('applications').doc(id).update(updateData);
        const updated = await db.collection('applications').doc(id).get();
        res.json({ message: 'Application updated successfully', application: { id: updated.id, ...updated.data() } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Course Dates
router.put('/:id/course-dates', async (req, res) => {
    const { id } = req.params;
    const { course_start_date, course_end_date } = req.body;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        await db.collection('applications').doc(id).update({ course_start_date, course_end_date });
        const updated = await db.collection('applications').doc(id).get();
        res.json({ message: 'Course dates updated successfully', application: { id: updated.id, ...updated.data() } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Application
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        const appRef = db.collection('applications').doc(id);
        const appDoc = await appRef.get();

        if (!appDoc.exists) {
            return res.status(404).json({ error: 'Application not found' });
        }

        await appRef.delete();
        res.json({ message: 'Application deleted successfully' });
    } catch (err) {
        console.error('DELETE /api/applications/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
