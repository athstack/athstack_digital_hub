const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    const jsonTransport = require('nodemailer/lib/json-transport');
    transporter = nodemailer.createTransport(new jsonTransport());
    console.log('Mail: using JSON transport (dev mode — emails are logged to stdout)');
  }

  return transporter;
}

async function sendReply({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || 'noreply@athstack.com';
  const transport = getTransporter();
  const info = await transport.sendMail({ from, to, subject, text, html });
  if (transport.transporter && transport.transporter.name === 'JSON') {
    console.log('Mail (dev):', info.message);
  }
  return info;
}

module.exports = { sendReply };
