require('dotenv').config();
const { sendEmail } = require('./utils/emailService');

async function testEmail() {
    const to = 'lasakedu@gmail.com'; // Testing to user's known address or any valid one
    const subject = 'Test Email from Lasak System';
    const html = '<h1>Test</h1><p>This is a manual test of the SMTP configuration.</p>';

    console.log(`Starting email test to ${to}...`);
    const success = await sendEmail(to, subject, html);

    if (success) {
        console.log('✅ Email sent successfully!');
    } else {
        console.error('❌ Email failed to send. Check the console for detailed errors above.');
    }
    process.exit(0);
}

testEmail();
