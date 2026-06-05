const fs = require('fs');
const path = require('path');
const { generateCertificate } = require('./utils/certificateGenerator');

async function runTest() {
    const application = {
        application_id: 'LTIEC0032',
        certificate_number: 'TN/CBE/043/LTIEC0032',
        student_name: 'HJG',
        course: 'MS OFFICE',
        course_start_date: '1970-01-01',
        course_end_date: '1970-01-01',
        software_covered: 'AutoCAD, MS Office, Revit, Tally, Java, Python, STAAD.Pro',
        branch: 'LASAK EDU, BANGALORE BRANCH'
    };

    console.log("Generating test certificate...");
    try {
        // null for partner urls, logoOptions, and background template
        // This will fall back to using the local template ('course template (1).png')
        const pdfBuffer = await generateCertificate(application, [], null, null);

        const outputPath = path.join(__dirname, '..', 'test_certificate.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`Certificate successfully generated into: ${outputPath}`);
    } catch (error) {
        console.error("Error generating certificate:", error);
    }
}

runTest();
