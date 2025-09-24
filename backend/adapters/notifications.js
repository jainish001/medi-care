// backend/adapters/notifications.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export async function sendEmailOtp(email, otp) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",   // Gmail SMTP
    port: 465,                // Secure port
    secure: true,             // Use SSL
    auth: {
      user: process.env.SMTP_EMAIL,   // your email from .env
      pass: process.env.SMTP_PASS,    // app password from .env
    },
  });

  const info = await transporter.sendMail({
    from: `"Medical App" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`,
  });

  console.log(`✅ OTP email sent to ${email}: ${info.messageId}`);
}
