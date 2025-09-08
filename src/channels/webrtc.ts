import { speechToText, textToSpeech } from '../services/ai/speech';
import { uploadAudioAndGetUrl } from '../services/audio/uploadService';

export const CHANNEL_TYPE = 'webrtc';

interface WebRTCMessage {
  type: 'audio' | 'text' | 'call_start' | 'call_end';
  sessionId: string;
  userId: string;
  data?: any;
  audioData?: string; // Base64 encoded audio data
}

export async function parseWebRTCMessage(body: WebRTCMessage) {
  let text = '';
  let isAudio = false;
  if (body.type === 'audio' && body.audioData) {
    try {
      // Convertir base64 a Buffer
      const audioBuffer = Buffer.from(body.audioData, 'base64');
      
      // Usar directamente el Buffer para speech-to-text
      text = await speechToText(audioBuffer) || '';
      isAudio = true;
      
    } catch (error) {
      console.error('Error processing audio:', error);
      text = '';
    }
  } else if (body.type === 'text') {
    text = body.data;
  }

  return {
    from: body.userId,
    text: text,
    provider: 'webrtc',
    isAudio: isAudio,
    sessionId: body.sessionId
  };
}

export async function sendWebRTCResponse(to: string, text: string, sessionId: string) {
  // Convertir texto a audio
  const audioBuffer = await textToSpeech(text);
  const audioUrl = await uploadAudioAndGetUrl(audioBuffer);
  
  // Enviar respuesta a través de WebSocket
  return {
    type: 'audio_response',
    sessionId: sessionId,
    audioUrl: audioUrl,
    text: text
  };
}