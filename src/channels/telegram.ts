export const CHANNEL_TYPE = 'telegram';

// Normaliza el ID de usuario de Telegram
function normalizeTelegramId(input: string): string {
  // Telegram user IDs are already normalized as numbers
  return input.toString();
}

// Formatea para Telegram (no necesita formato especial)
function formatForTelegram(userId: string): string {
  return userId;
}

export function parseTelegramMessage(body: any) {

  const message = body.message || body.edited_message;
  if (!message) {
    throw new Error('Invalid Telegram message format');
  }

  const from = message.from?.id || message.chat?.id;
  const text = message.text || '';

  return {
    from: normalizeTelegramId(from.toString()),
    text: text,
    provider: 'telegram',
    // Include additional Telegram-specific data
    chatId: message.chat?.id,
    messageId: message.message_id,
    fromUsername: message.from?.username,
    fromFirstName: message.from?.first_name,
    fromLastName: message.from?.last_name
  };
}

export async function sendTelegramMessage(to: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }

  const formattedTo = formatForTelegram(to);
  
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: formattedTo,
      text: text,
      parse_mode: 'HTML'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }

  return response.json();
}

// Helper function to set webhook
export async function setTelegramWebhook(webhookUrl: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      max_connections: 40
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to set webhook: ${error}`);
  }

  return response.json();
}
