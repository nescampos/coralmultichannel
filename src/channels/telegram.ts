import { speechToText, textToSpeech } from '../services/ai/speech';
import { uploadAudioAndGetUrl } from '../services/audio/uploadService';

export const CHANNEL_TYPE = 'telegram';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const allowAudioFiles = process.env.TELEGRAM_ALLOW_AUDIO_FILES === 'true';

// Normaliza el ID de usuario de Telegram
function normalizeTelegramId(input: string): string {
  // Telegram user IDs are already normalized as numbers
  return input.toString();
}

// Formatea para Telegram (no necesita formato especial)
function formatForTelegram(userId: string): string {
  return userId;
}

export async function parseTelegramMessage(body: any) {
  const message = body.message || body.edited_message;
  if (!message) {
    throw new Error('Invalid Telegram message format');
  }

  const from = message.from?.id || message.chat?.id;
  let text = message.text || '';
  let isAudio = false;
  let audioBuffer: Buffer | null = null;

  // Verificar si el mensaje contiene audio
  if (allowAudioFiles && message.voice) {
    try {
      // Obtener la URL del archivo de audio
      const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${message.voice.file_id}`);
      const fileData = await fileResponse.json();
      
      if (fileData.ok) {
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        // Convertir audio a texto
        text = await speechToText(fileUrl);
        isAudio = true;
      }
    } catch (error) {
      console.error('Error processing audio message:', error);
      // Si falla la conversión, mantener el texto vacío
      text = '';
    }
  }

  return {
    from: normalizeTelegramId(from.toString()),
    text: text,
    provider: 'telegram',
    isAudio: isAudio,
    // Include additional Telegram-specific data
    chatId: message.chat?.id,
    messageId: message.message_id,
    fromUsername: message.from?.username,
    fromFirstName: message.from?.first_name,
    fromLastName: message.from?.last_name
  };
}

export async function sendTelegramMessage(to: string, text: string, isAudio?: boolean) {
  
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }

  const formattedTo = formatForTelegram(to);
  
  if (isAudio && allowAudioFiles) {
    try {
      // Convertir texto a audio
      const audioBuffer = await textToSpeech(text);
      // Subir archivo de audio y obtener URL
      const audioUrl = await uploadAudioAndGetUrl(audioBuffer);
      
      // Enviar audio como mensaje de voz
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: formattedTo,
          voice: audioUrl,
          caption: text // Agregar texto como caption por si acaso
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }

      return response.json();
    } catch (error) {
      // Si falla el envío de audio, enviar como texto normal
      console.error('Error sending audio message, falling back to text:', error);
    }
  }
  
  // Envío de texto normal
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
