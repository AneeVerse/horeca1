// SMS / WhatsApp provider adapter — MSG91 (India-friendly) via HTTP.
// If MSG91_AUTH_KEY is not set, falls back to logging (useful for dev).

interface SendSmsInput {
  to: string;
  body: string;
  channel: 'sms' | 'whatsapp';
}

export async function sendSms(input: SendSmsInput): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || 'HORECA';
  // MSG91_WHATSAPP_NUMBER: your WhatsApp Business number registered in MSG91 (e.g. "919876543210")
  // MSG91_WHATSAPP_TEMPLATE_ID: approved Meta template ID from MSG91 dashboard
  const templateId = input.channel === 'whatsapp'
    ? process.env.MSG91_WHATSAPP_TEMPLATE_ID
    : process.env.MSG91_SMS_TEMPLATE_ID;
  const whatsappNumber = process.env.MSG91_WHATSAPP_NUMBER;

  const normalized = normalizePhone(input.to);

  if (!authKey || !templateId || (input.channel === 'whatsapp' && !whatsappNumber)) {
    console.warn(`[${input.channel}:dev] ${normalized} | ${input.body.slice(0, 120)}…`);
    return;
  }

  const endpoint = input.channel === 'whatsapp'
    ? 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/'
    : 'https://api.msg91.com/api/v5/flow/';

  const payload = input.channel === 'whatsapp'
    ? {
        integrated_number: whatsappNumber,
        content_type: 'template',
        payload: { to: normalized, template_id: templateId, body: input.body },
      }
    : {
        template_id: templateId,
        sender: senderId,
        recipients: [{ mobiles: normalized, body: input.body }],
      };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`MSG91 ${res.status}: ${detail}`);
  }
}

// MSG91 expects country-code-prefixed numbers without "+" (e.g. 919876543210).
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}
