const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const mockLog = ({ to, subject, text }) => {
  const line = `[${new Date().toISOString()}] TO=${to} SUBJECT=${subject}\n${text || ''}\n---\n`;
  logger.info(`[EMAIL:mock] to=${to} subject=${subject}`);
  try {
    const serverLogDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(serverLogDir)) fs.mkdirSync(serverLogDir, { recursive: true });
    fs.appendFileSync(path.join(serverLogDir, 'emails.log'), line);
  } catch (e) {
    logger.warn(`Could not write email log: ${e.message}`);
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n===== MOCK EMAIL =====\nTo: ${to}\nSubject: ${subject}\n${text || ''}\n======================\n`);
  }
};

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Real email via Mailtrap (Sending API, or Sandbox when MAILTRAP_USE_SANDBOX=true).
// Falls back to the mock log when no API key is configured (local dev, tests)
// and NEVER throws, so auth flows can't 500 just because email is down.
const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.MAILTRAP_API_KEY) {
    mockLog({ to, subject, text });
    return true;
  }

  try {
    const { MailtrapClient } = require('mailtrap');
    const sandbox = String(process.env.MAILTRAP_USE_SANDBOX || 'false').toLowerCase() === 'true';
    const inboxId = parseInt(process.env.MAILTRAP_INBOX_ID || '', 10);
    const client = new MailtrapClient({
      token: process.env.MAILTRAP_API_KEY,
      sandbox,
      testInboxId: sandbox && Number.isInteger(inboxId) ? inboxId : undefined,
    });

    const bodyHtml = html || `<div style="font-family:sans-serif;line-height:1.6">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
    await client.send({
      from: {
        name: process.env.MAILTRAP_FROM_NAME || 'Central Library',
        email: sandbox ? 'sandbox@example.com' : process.env.MAILTRAP_FROM_EMAIL,
      },
      to: [{ email: to }],
      subject,
      text: text || '',
      html: bodyHtml,
      category: 'library-system',
    });
    logger.info(`[EMAIL:sent] to=${to} subject=${subject} sandbox=${sandbox}`);
    return true;
  } catch (e) {
    logger.error(`[EMAIL:failed] to=${to} subject=${subject} error=${e.message}`);
    mockLog({ to, subject, text }); // keep a local record of what should have gone out
    return false;
  }
};

module.exports = sendEmail;
