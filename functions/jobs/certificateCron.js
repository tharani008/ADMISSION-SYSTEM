const cron = require('node-cron');
const { db, storage } = require('../config/firebaseAdmin');
const { generateCertificate } = require('../utils/certificateGenerator');
const { COURSE_CATEGORY_MAP } = require('../config/constants');

const initCertificateCron = () => {
    console.log('Initializing Certificate Generation Cron Job (Daily at 00:00)...');

    cron.schedule('0 0 * * *', async () => {
        console.log('Running Daily Certificate Check...');
        const today = new Date();
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + 5);
        const dateString = targetDate.toISOString().split('T')[0];

        try {
            if (!db) return;
            const snapshot = await db.collection('applications')
                .where('course_end_date', '==', dateString)
                .where('certificate_url', '==', null)
                .get();

            if (snapshot.empty) {
                console.log('No applications needing certificates found.');
                return;
            }

            console.log(`Found ${snapshot.size} applications needing certificates.`);

            for (const doc of snapshot.docs) {
                const app = { id: doc.id, ...doc.data() };
                try {
                    console.log(`Generating certificate for: ${app.student_name} (${app.id})`);

                    const courseName = (app.course || '').trim();
                    const mapKey = Object.keys(COURSE_CATEGORY_MAP).find(k => k.toLowerCase() === courseName.toLowerCase());
                    const category = mapKey ? COURSE_CATEGORY_MAP[mapKey] : 'CSE / IT';

                    const templateSnapshot = await db.collection('course_templates').where('category', '==', category).limit(1).get();
                    const template = templateSnapshot.empty ? {} : templateSnapshot.docs[0].data();
                    const backgroundTemplateUrl = template.template_url || null;
                    const logoOptions = { x: template.x_offset, y: template.y_offset };

                    const partnerSnapshot = await db.collection('course_templates').where('category', '==', `_partner_${category}`).get();
                    const partnerLogoUrls = partnerSnapshot.docs.map(doc => doc.data().template_url);

                    const pdfBuffer = await generateCertificate(app, partnerLogoUrls, logoOptions, backgroundTemplateUrl);

                    const bucket = storage.bucket();
                    const safeId = (app.application_id || app.id).replace(/\//g, '-');
                    const fileName = `certificates/certificate_${safeId}_${Date.now()}.pdf`;
                    const file = bucket.file(fileName);

                    await file.save(pdfBuffer, { contentType: 'application/pdf' });
                    await file.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

                    await db.collection('applications').doc(app.id).update({
                        certificate_url: publicUrl,
                        certificate_uploaded_at: new Date().toISOString()
                    });

                    console.log(`Certificate uploaded & linked for ${app.student_name}: ${publicUrl}`);

                } catch (innerErr) {
                    console.error(`Failed to generate/upload for application ${app.id}:`, innerErr.message);
                }
            }
        } catch (err) {
            console.error('Error in Certificate Cron Job:', err.message);
        }
    });
};

module.exports = initCertificateCron;
