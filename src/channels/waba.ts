export const CHANNEL_TYPE = 'whatsapp';

// Normaliza el número de WABA a formato internacional con +
function normalizeWabaNumber(input: string): string {
  if (!input.startsWith('+')) input = '+' + input;
  return input;
}
// Formatea para WABA (sin +)
function formatForWaba(phone: string): string {
  return phone.replace(/^\+/, '');
}

export async function parseWabaMessage(body: any) {
  const msg = body.messages?.[0];
  return {
    from: normalizeWabaNumber(msg?.from),
    text: msg?.text?.body,
    provider: 'waba',
    isAudio: false
  };
}

export async function sendWabaMessage(to: string, text: string) {
  const phoneNumberId = process.env.WABA_PHONE_NUMBER_ID;
  const accessToken = process.env.WABA_ACCESS_TOKEN;
  const formattedTo = formatForWaba(to);
  await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: formattedTo,
      type: 'text',
      text: { body: text }
    })
  });
} 