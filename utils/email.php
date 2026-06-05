<?php
// utils/email.php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendEmail($to, $subject, $html) {
    $host = $_ENV['SMTP_HOST'] ?? null;
    $port = $_ENV['SMTP_PORT'] ?? 587;
    $user = $_ENV['SMTP_USER'] ?? null;
    $pass = $_ENV['SMTP_PASS'] ?? null;
    $from = $_ENV['SMTP_FROM'] ?? 'admissions@lasakedu.in';

    if (!$host || !$user || !$pass) {
        error_log('[EMAIL WARNING] SMTP credentials missing in .env. Email not sent.');
        return false;
    }

    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = $host;
        $mail->SMTPAuth   = true;
        $mail->Username   = $user;
        $mail->Password   = $pass;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = intval($port);

        // Recipients
        $mail->setFrom($from, 'Lasak Edu Admission');
        $mail->addAddress($to);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html;

        $mail->send();
        error_log("[EMAIL SENT] Successfully sent email to: " . $to);
        return true;
    } catch (Exception $e) {
        error_log("[EMAIL ERROR] Failed to send email to " . $to . ". Mailer Error: " . $mail->ErrorInfo);
        return false;
    }
}
