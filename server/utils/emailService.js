// emailService.js
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify once at startup
transporter.verify()
  .then(() => console.log("SMTP server is ready"))
  .catch(err => console.error("SMTP connection failed:", err));

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"Riyadah App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}



module.exports = { sendEmail };