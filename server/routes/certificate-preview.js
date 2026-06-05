const express = require('express');
const router = express.Router();
const { generateCertificate } = require('../utils/certificateGenerator');
const { db } = require('../config/firebaseAdmin');

const { COURSE_CATEGORY_MAP } = require('../config/constants');

// POST /api/certificate/preview
// Accepts sample field values and returns a PDF for preview
router.post('/preview', async (req, res) => {
    try {
        const {
            application_id = 'ADM-SAMPLE-001',
            certificate_number = 'CERT-2024-001',
            student_name = 'SAMPLE STUDENT',
            course = 'Sample Course',
            course_start_date = '2024-01-01',
            course_end_date = '2024-06-30',
            software_covered = 'Sample Software A, Sample Software B',
            branch = 'Sample Branch',
            logoX = null,
            logoY = null
        } = req.body;

        // Look up partner logos and background template for this course's category
        const courseName = (course || '').trim();
        const mapKey = Object.keys(COURSE_CATEGORY_MAP).find(k => k.toLowerCase() === courseName.toLowerCase());
        const category = mapKey ? COURSE_CATEGORY_MAP[mapKey] : 'CSE / IT';

        // Fetch background template from Firestore (Sort in memory to avoid index errors)
        const templateSnapshot = await db.collection('course_templates')
            .where('category', '==', category)
            .get();

        const templateDocs = templateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        const currentTemplate = templateDocs.length > 0 ? templateDocs[0] : {};
        const backgroundTemplateUrl = currentTemplate.template_url || "https://firebasestorage.googleapis.com/v0/b/lasak-c1db5.firebasestorage.app/o/assets%2Fcourse%20template%20(1).png?alt=media";

        // Fetch partner logos for this category
        const partnerKey = `_partner_${category}`;
        const partnerSnapshot = await db.collection('course_templates')
            .where('category', '==', partnerKey)
            .get();

        // Map all partner logo URLs (Firebase version of your row mapping)
        const partnerLogoUrls = partnerSnapshot.docs.map(doc => doc.data().template_url);

        const fakeApplication = {
            application_id,
            certificate_number,
            student_name,
            course,
            course_start_date,
            course_end_date,
            software_covered,
            branch
        };

        // Pass picked position (if any) and background template to the generator
        // Use the picked logoX/Y from UI, or fall back to the template's saved offsets
        const logoOptions = {
            x: logoX !== null ? logoX : (currentTemplate.x_offset || null),
            y: logoY !== null ? logoY : (currentTemplate.y_offset || null)
        };

        const pdfBuffer = await generateCertificate(fakeApplication, partnerLogoUrls, logoOptions, backgroundTemplateUrl);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="certificate-preview.pdf"',
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Certificate preview error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
