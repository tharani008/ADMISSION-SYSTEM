const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
    // Check if SMTP credentials exists
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('[EMAIL WARNING] SMTP not configured. Email not sent.');
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: `"Lasak Edu Admission" <${process.env.SMTP_FROM || 'admissions@lasakedu.in'}>`,
            to: to,
            subject: subject,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Message sent: ${info.messageId} to ${to}`);
        return true;
    } catch (error) {
        console.error('[EMAIL ERROR] Failed to send email:', error);
        return false;
    }
};

module.exports = { sendEmail };
