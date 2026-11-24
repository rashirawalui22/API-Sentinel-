const nodemailer = require('nodemailer');
const { User } = require('./models');

async function sendStateAlert(monitor, state) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !monitor.owner) return;
  const user = await User.findById(monitor.owner).select('email alertEmail alertEnabled');
  const recipient = user?.alertEnabled && (user.alertEmail || user.email);
  if (!recipient) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.ALERT_FROM || 'API Sentinel <alerts@example.com>',
    to: recipient,
    subject: `${monitor.name} is ${state}`,
    text: `${monitor.name} (${monitor.url}) is ${state}.`,
  });
}

module.exports = { sendStateAlert };
