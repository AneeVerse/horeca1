// Email provider adapter — Resend by default (simplest HTTP API, no SDK dependency).
// If RESEND_API_KEY is not set, falls back to logging (useful for dev).

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  name?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'HoReCa Hub <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn(`[email:dev] ${input.to} | ${input.subject} | ${input.text.slice(0, 100)}…`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<p>${input.text.replace(/\n/g, '<br/>')}</p>`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
}
