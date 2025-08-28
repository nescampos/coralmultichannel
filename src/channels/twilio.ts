import { FastifyReply } from 'fastify';
import twilio from 'twilio';
import { speechToText, textToSpeech } from '../services/ai/speech';
import { uploadAudioAndGetUrl } from '../services/audio/uploadService';

export const CHANNEL_TYPE = 'whatsapp';

const allowAudioFiles = process.env.TWILIO_ALLOW_AUDIO_FILES === 'true';
// Normaliza el número de Twilio a formato internacional con +
function normalizeTwilioNumber(input: string): string {
  if (input.startsWith('whatsapp:')) input = input.replace('whatsapp:', '');
  if (!input.startsWith('+')) input = '+' + input;
  return input;
}
// Formatea para Twilio (agrega whatsapp:)
function formatForTwilio(phone: string): string {
  if (!phone.startsWith('+')) phone = '+' + phone;
  return 'whatsapp:' + phone;
}

export async function parseTwilioMessage(body: any) {
  
  let mediaUrl = null;
  let text = body.Body;
  let isAudio = false;
  if (allowAudioFiles && body.NumMedia && parseInt(body.NumMedia) > 0 && body.MediaContentType0.includes("audio")) {
    mediaUrl = body.MediaUrl0;
    text = await speechToText(mediaUrl);
    isAudio = true;
  }
  return {
    from: normalizeTwilioNumber(body.From),
    text: text,
    provider: 'twilio',
    isAudio: isAudio
  };
}

export async function sendTwilioMessage(to: string, text: string, reply?: FastifyReply, isAudio?: boolean) {
  const formattedTo = formatForTwilio(to);
  // Si se pasa el objeto reply, usa ResponseHandler para responder en formato TwiML
  if (reply) {
    if (isAudio) {
      // Convertir texto a audio
      const audioBuffer = await textToSpeech(text);
      // Subir archivo de audio y obtener URL
      const audioUrl = await uploadAudioAndGetUrl(audioBuffer);
      // Enviar mensaje con audio
      sendSuccessWithMedia(reply, audioUrl);
    } else {
      sendSuccess(reply, text);
    }
    return;
  }
}

function sendSuccess(reply: FastifyReply, message: string): void {
  reply
      .type('text/xml')
      .header('Cache-Control', 'private, no-cache')
      .send(createTwiml(message));
}

function sendSuccessWithMedia(reply: FastifyReply, mediaUrl: string): void {
  reply
      .type('text/xml')
      .header('Cache-Control', 'private, no-cache')
      .send(createTwimlWithMedia(mediaUrl));
}

function createTwiml(message: string): string {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);
  return twiml.toString();
}

function createTwimlWithMedia(mediaUrl: string): string {
  const twiml = new twilio.twiml.MessagingResponse();
  const msg = twiml.message("");
  msg.media(mediaUrl);
  return twiml.toString();
}

function sendError(reply: FastifyReply, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  reply
      .type('text/xml')
      .code(500)
      .header('Cache-Control', 'no-store')
      .send(createTwiml(`Error: ${errorMessage}`));
}