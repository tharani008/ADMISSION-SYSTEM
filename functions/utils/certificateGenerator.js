const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Download a remote image and return a Buffer
const fetchImageBuffer = (url, timeout = 10000) => new Promise((resolve, reject) => {
    if (!url) return reject(new Error('No URL provided'));
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, (res) => {
        if (res.statusCode !== 200) {
            return reject(new Error(`Failed to fetch image: ${res.statusCode} ${res.statusMessage}`));
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(timeout, () => {
        request.destroy();
        reject(new Error(`Image fetch timed out for URL: ${url}`));
    });
});

// Helper to wrap text generation in a Promise
// application: { application_id, certificate_number, student_name, course,
//                course_start_date, course_end_date, software_covered, branch }
// partnerLogoUrls: optional array of image URLs to draw at the bottom
// logoOptions: optional { x, y } to pin the top-left of the first logo (null = auto-centre)
// templateUrl: optional URL of the background image to use
const generateCertificate = async (application, partnerLogoUrls = [], logoOptions = {}, templateUrl = null) => {
    // Download partner logo buffers before building PDF (async)
    const partnerBuffers = [];
    for (const url of partnerLogoUrls) {
        try {
            const buf = await fetchImageBuffer(url);
            partnerBuffers.push(buf);
        } catch (e) {
            console.warn('Could not fetch partner logo:', url, e.message);
        }
    }

    // Download template buffer if provided
    let templateBuffer = null;
    if (templateUrl) {
        try {
            templateBuffer = await fetchImageBuffer(templateUrl);
        } catch (e) {
            console.warn('Could not fetch custom template:', templateUrl, e.message);
        }
    }

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: [1414, 2000], // User specified dimensions (Portrait)
                margin: 0
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            doc.on('error', (err) => {
                reject(err);
            });

            // 1. Draw Background Template
            if (templateBuffer) {
                doc.image(templateBuffer, 0, 0, { width: 1414, height: 2000 });
            } else {
                // Fallback to local template if no templateUrl or fetch failed
                const assetsDir = path.join(__dirname, '..', 'assets');
                const templateFile = 'course template (1).png';
                const templatePath = path.join(assetsDir, templateFile);

                if (fs.existsSync(templatePath)) {
                    doc.image(templatePath, 0, 0, { width: 1414, height: 2000 });
                } else {
                    doc.rect(0, 0, 1414, 2000).fill('#f0f0f0');
                    doc.fontSize(80).fillColor('#333').text(`TEMPLATE MISSING: ${templateFile}`, 100, 500);
                }
            }

            // 2. Overlay Text
            // Dimensions: 1414 x 2000
            // User feedback adjustments:
            // - Course: 1095
            // - Duration: 1185
            // - Issued On: Up by ~6px (0.2 line) -> 1279
            // - Branch: Up by ~6px (0.2 line) -> 1459

            // coordinates for 1414 x 2000 (Shifting all down by 0.1 inch = 7.2 points)
            const lineY_Admission = 896.2; // 889 + 7.2
            const lineY_Cert = 902.2;      // 895 + 7.2
            const lineY_Name = 1001.2;     // 994 + 7.2
            const lineY_Course = 1089.2;   // 1082 + 7.2
            const lineY_Duration = 1183.2; // 1176 + 7.2
            const lineY_Issued = 1273.2;   // 1266 + 7.2
            const lineY_Software = 1365.2; // 1358 + 7.2
            const lineY_Branch = 1461.4;   // 1454.2 + 7.2 (0.1 inch further down)

            // X Positions
            const valX_Admission = 345;
            const valX_Cert = 980;
            const valX_Main = 450;

            // Font settings
            doc.fillColor('#000000'); // Solid Black
            const standardFontSize = 36; // Reduced from 42 as requested

            // Admission No
            doc.fontSize(standardFontSize).font('Helvetica-Bold')
                .text(application.application_id, valX_Admission, lineY_Admission);

            // Certificate No
            doc.fontSize(standardFontSize).font('Helvetica-Bold')
                .text(application.certificate_number || 'PENDING', valX_Cert, lineY_Cert);

            // Student Name
            doc.fontSize(standardFontSize).font('Helvetica-Bold')
                .text((application.student_name || '').toUpperCase(), valX_Main, lineY_Name);

            // Course Title
            doc.fontSize(standardFontSize).font('Helvetica-Bold')
                .text((application.course || '').toUpperCase(), valX_Main, lineY_Course);

            // Course Duration
            const startDate = new Date(application.course_start_date).toLocaleDateString('en-GB');
            const endDate = new Date(application.course_end_date).toLocaleDateString('en-GB');
            doc.fontSize(standardFontSize).font('Helvetica-Bold')
                .text(`${startDate} to ${endDate}`, valX_Main, lineY_Duration);

            // Issued On
            const issueDate = new Date().toLocaleDateString('en-GB');
            doc.fontSize(standardFontSize).font('Helvetica-Bold')
                .text(issueDate, valX_Main, lineY_Issued);

            // Software Covered
            const softwareText = application.software_covered || '';
            const softwareStartX = valX_Main;
            const softwareMaxWidth = 850;

            if (softwareText) {
                // Moving down ~0.1 inch per line if it exceeds width
                doc.fontSize(standardFontSize).font('Helvetica-Bold');
                const parts = softwareText.split(',').map(s => s.trim()).filter(Boolean);
                doc.text(parts.join(', '), softwareStartX, lineY_Software, {
                    width: softwareMaxWidth,
                    lineGap: 17.2 // Increased from 10 to push the second line down by another 0.1 inch
                });
            }

            // Branch
            doc.fontSize(standardFontSize).font('Helvetica-Bold')
                .text(`LASAK EDU, ${application.branch || ''}`.toUpperCase(), valX_Main, lineY_Branch);

            // 3. Draw Partner Logos
            console.log(`Finalizing PDF with ${partnerBuffers.length} partner logos.`);
            if (partnerBuffers.length > 0) {
                const logoMaxH = 130; // Reduced from 180
                const logoMaxW = 220; // Reduced from 300
                const logoPadding = 60;

                let startX, logoAreaY;
                if (logoOptions.x != null && logoOptions.y != null) {
                    startX = Number(logoOptions.x);
                    logoAreaY = Number(logoOptions.y);
                } else {
                    startX = 120;
                    logoAreaY = 1760; // Slightly lower to be centered in the white space
                }

                partnerBuffers.forEach((buf, i) => {
                    const x = startX + i * (logoMaxW + logoPadding);
                    try {
                        doc.image(buf, x, logoAreaY, { fit: [logoMaxW, logoMaxH] });
                    } catch (imgErr) {
                        console.error('Error drawing logo:', imgErr.message);
                    }
                });
            }

            doc.end();

        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generateCertificate };


