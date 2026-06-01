// Email provider adapter — Nodemailer + Gmail SMTP.
// If EMAIL_USER / EMAIL_PASS are not set, falls back to console.log of the
// payload (dev behavior) and returns silently without throwing.

import nodemailer from 'nodemailer';

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  name?: string;
}

const FROM = process.env.EMAIL_FROM ?? 'HoReCa Hub <team.horeca1@gmail.com>';

let cachedTransporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  cachedTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE ?? 'gmail',
    host: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT ?? '465'),
    secure: true,
    auth: { user, pass },
  });
  return cachedTransporter;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email:dev]', input.subject, '→', input.to, '\n', input.text.slice(0, 200));
    }
    return;
  }
  const html = input.html ?? `<p>${input.text.replace(/\n/g, '<br>')}</p>`;
  await transporter.sendMail({
    from: FROM,
    to: input.name ? `${input.name} <${input.to}>` : input.to,
    subject: input.subject,
    text: input.text,
    html,
  });
}
