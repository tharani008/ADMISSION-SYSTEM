
require('dotenv').config();
const nodemailer = require('nodemailer');

async function verifySmtp() {
    console.log('--- SMTP Connection Test ---');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('User:', process.env.SMTP_USER);
    // Do not log the full password
    console.log('Pass:', process.env.SMTP_PASS ? '****** (Set)' : 'Not Set');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        debug: true, // show debug output
        logger: true // log information to console
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('✅ Connection Successful! Credentials are correct.');

        console.log('Attempting to send test email...');
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.SMTP_USER, // Send to self
            subject: 'Test Email from Admission System',
            text: 'If you see this, your email configuration is working perfectly!',
        });
        console.log('✅ Test Email Sent!');
    } catch (error) {
        console.error('❌ Connection Failed:', error);

        if (error.responseCode === 535) {
            console.error('\n--> DIAGNOSIS: "Username and Password not accepted"');
            console.error('    1. Make sure "2-Step Verification" is ON for this Google Account.');
            console.error('    2. Make sure you generated the App Password for THIS specific email address.');
            console.error('    3. Try generating a BRAND NEW App Password.');
        }
    }
}

verifySmtp();
