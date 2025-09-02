import { UserAgent, Web, Session } from 'sip.js';
import { speechToText, textToSpeech } from '../services/ai/speech';
import { uploadAudioAndGetUrl } from '../services/audio/uploadService';

export const CHANNEL_TYPE = 'sip';

interface SIPMessage {
  type: 'call_start' | 'call_end' | 'dtmf' | 'audio';
  callId: string;
  from: string;
  to: string;
  audioData?: string; // Base64 encoded audio
  dtmf?: string;      // Para tonos DTMF
}

// Configuración del agente SIP
let userAgent: UserAgent;
let session: Session;

export function initializeSIP(config: {
  sipUri: string;
  password: string;
  wsServers: string;
  displayName?: string;
}) {
  userAgent = new UserAgent({
    uri: UserAgent.makeURI(config.sipUri)!,
    authorizationUsername: config.sipUri.split(':')[1].split('@')[0],
    authorizationPassword: config.password,
    transportOptions: {
      wsServers: [config.wsServers]
    },
    displayName: config.displayName
  });

  // Manejador de llamadas entrantes
  userAgent.delegate = {
    onInvite: async (invitation) => {
      session = invitation;
      
      // Aceptar la llamada
      await session.accept();
      
      // Configurar manejadores de medios
      setupMediaHandlers(session);
    }
  };

  // Iniciar el agente
  userAgent.start();
}

async function setupMediaHandlers(session: Session) {
  // Configurar manejadores de audio
  session.delegate = {
    onTrackAdded: () => {
      // Iniciar la grabación o procesamiento de audio
    },
    onTrackRemoved: () => {
      // Finalizar la grabación
    }
  };
}

export async function parseSIPMessage(body: SIPMessage) {
  let text = '';
  let isAudio = false;

  if (body.type === 'audio' && body.audioData) {
    try {
      const audioBuffer = Buffer.from(body.audioData, 'base64');
      text = await speechToText(audioBuffer) || '';
      isAudio = true;
    } catch (error) {
      console.error('Error processing SIP audio:', error);
    }
  }

  return {
    from: body.from,
    to: body.to,
    text,
    provider: 'sip',
    isAudio,
    callId: body.callId,
    dtmf: body.dtmf
  };
}

export async function sendSIPMessage(to: string, text: string, reply?: any, isAudio: boolean = true) {
  if (!session) {
    throw new Error('No active SIP session');
  }

  if (isAudio) {
    const audioBuffer = await textToSpeech(text);
    // Enviar audio a través de la sesión SIP
    // Nota: La implementación real dependerá de cómo manejes los medios en tu aplicación
    return { status: 'audio_sent', text };
  } else {
    // Enviar como mensaje de texto (DTMF o mensaje SIP)
    return { status: 'text_sent', text };
  }
}

// Función para realizar una llamada saliente
export async function makeCall(to: string) {
  if (!userAgent) {
    throw new Error('SIP User Agent not initialized');
  }

  const target = UserAgent.makeURI(`sip:${to}@${userAgent.configuration.uri?.host}`);
  if (!target) {
    throw new Error(`Invalid target URI: ${to}`);
  }

  const session = userAgent.invite(target.toString(), {
    sessionDescriptionHandlerOptions: {
      constraints: { audio: true, video: false }
    }
  });

  return new Promise((resolve, reject) => {
    session.delegate = {
      onAccepted: () => {
        setupMediaHandlers(session);
        resolve({ callId: session.id, status: 'connected' });
      },
      onFailed: () => {
        reject(new Error('Call failed'));
      }
    };
  });
}