// src/utils/emailClient.js
const nodemailer = require("nodemailer");

const {
  GMAIL_USER,
  GMAIL_PASS,
  MAIL_DISABLED, // "true" => skip sending
} = process.env;

if (!GMAIL_USER || !GMAIL_PASS) {
  console.warn("⚠️ GMAIL_USER or GMAIL_PASS not set. Email sending will fail.");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * sendEmail
 * ---------
 * Transport-only.
 * Caller is responsible for building replyTo (e.g. using reply_token).
 *
 * @param {Object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.text
 * @param {string} [params.html]
 * @param {string} [params.replyTo]  // optional
 */
async function sendEmail({ to, subject, text, html, replyTo }) {
  if (MAIL_DISABLED === "true") {
    console.log("MAIL_DISABLED=true → Skipping actual send");
    console.log("To:", to);
    console.log("Subject:", subject);
    return {
      messageId: "dev-skip-" + Date.now(),
      rawInfo: { skipped: true },
    };
  }

  if (!GMAIL_USER || !GMAIL_PASS) {
    throw new Error("GMAIL_USER / GMAIL_PASS not configured for emailClient");
  }

  const mailOptions = {
    from: GMAIL_USER,
    to,
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
  };

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId,
    rawInfo: info,
  };
}

module.exports = {
  sendEmail,
};
