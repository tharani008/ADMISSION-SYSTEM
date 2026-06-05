const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const app = require("./app");
const { db, storage } = require("./config/firebaseAdmin");
const { generateCertificate } = require("./utils/certificateGenerator");
const { COURSE_CATEGORY_MAP } = require("./config/constants");

// main API endpoint
exports.api = onRequest({
    region: "asia-south1", // Revert to asia-south1 as it's faster to update in-place
    memory: "512MiB",
    timeoutSeconds: 60
}, app);

// Daily Certificate Generation Cron Job
exports.dailyCertificateCheck = onSchedule({
    schedule: "0 0 * * *",
    region: "us-central1"
}, async (event) => {
    logger.log("Running Daily Certificate Check...");
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 5);
    const dateString = targetDate.toISOString().split('T')[0];

    try {
        if (!db) {
            logger.error("Database not initialized");
            return;
        }

        const snapshot = await db.collection('applications')
            .where('course_end_date', '==', dateString)
            .where('certificate_url', '==', null)
            .get();

        if (snapshot.empty) {
            logger.log("No applications needing certificates found.");
            return;
        }

        logger.log(`Found ${snapshot.size} applications needing certificates.`);

        for (const doc of snapshot.docs) {
            const appData = { id: doc.id, ...doc.data() };
            try {
                logger.log(`Generating certificate for: ${appData.student_name} (${appData.id})`);

                const courseName = (appData.course || '').trim();
                const mapKey = Object.keys(COURSE_CATEGORY_MAP).find(k => k.toLowerCase() === courseName.toLowerCase());
                const category = mapKey ? COURSE_CATEGORY_MAP[mapKey] : 'CSE / IT';

                const templateSnapshot = await db.collection('course_templates').where('category', '==', category).limit(1).get();
                const template = templateSnapshot.empty ? {} : templateSnapshot.docs[0].data();
                const backgroundTemplateUrl = template.template_url || null;
                const logoOptions = { x: template.x_offset, y: template.y_offset };

                const partnerSnapshot = await db.collection('course_templates').where('category', '==', `_partner_${category}`).get();
                const partnerLogoUrls = partnerSnapshot.docs.map(doc => doc.data().template_url);

                const pdfBuffer = await generateCertificate(appData, partnerLogoUrls, logoOptions, backgroundTemplateUrl);

                const bucket = storage.bucket();
                const safeId = (appData.application_id || appData.id).replace(/\//g, '-');
                const fileName = `certificates/certificate_${safeId}_${Date.now()}.pdf`;
                const file = bucket.file(fileName);

                await file.save(pdfBuffer, { contentType: 'application/pdf' });
                await file.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

                await db.collection('applications').doc(appData.id).update({
                    certificate_url: publicUrl,
                    certificate_uploaded_at: new Date().toISOString()
                });

                logger.log(`Certificate uploaded & linked for ${appData.student_name}: ${publicUrl}`);

            } catch (innerErr) {
                logger.error(`Failed to generate/upload for application ${appData.id}:`, innerErr);
            }
        }
    } catch (err) {
        logger.error("Error in Certificate Cron Job:", err);
    }
});
