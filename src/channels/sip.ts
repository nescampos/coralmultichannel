import { ISIPProvider, SIPInitConfig } from './sip/ISIPProvider';
import { SipJsProvider } from './sip/providers/SipJsProvider';
import { messageService } from '../services/messageService';

//import { DrachtioProvider } from './sip/providers/DrachtioProvider';
//import { AsteriskARIProvider } from './sip/providers/AsteriskARIProvider';

export const CHANNEL_TYPE = 'sip';

class SIPManager {
  private provider: ISIPProvider | null = null;

  async initialize(config: SIPInitConfig & { provider: 'ws'|'drachtio'|'ari'|'freeswitch' }) {
    if (this.provider) return;

    if (config.provider === 'ws') this.provider = new SipJsProvider();
    //else if (config.provider === 'drachtio') this.provider = new DrachtioProvider();
    //else if (config.provider === 'ari') this.provider = new AsteriskARIProvider();
    else throw new Error('Unsupported SIP provider');

    await this.provider.initialize(config);
  }

  async makeCall(to: string) {
    if (!this.provider) throw new Error('SIP not initialized');
    return this.provider.makeCall(to);
  }

  

  async endCall(callId: string) {
    if (!this.provider) throw new Error('SIP not initialized');
    return this.provider.endCall(callId);
  }

  async sendSIPMessage(to: string, text: string, callId?: string, isAudio: boolean = true) {
    if (!this.provider) throw new Error('SIP not initialized');
    return this.provider.sendTextOrAudio(to, text, callId, isAudio);
  }

  getActiveCalls() {
    return this.provider?.getActiveCalls() || [];
  }

  isCallActive(callId: string) {
    return this.provider?.isCallActive(callId) || false;
  }

  async terminate() {
    await this.provider?.terminate();
    this.provider = null;
  }
}

export const sipManager = new SIPManager();

export async function initializeSIP(config: SIPInitConfig & { provider: 'ws'|'drachtio'|'ari'|'freeswitch' }) {
  return sipManager.initialize(config);
}
export async function sendSIPMessage(to: string, text: string, callId?: string, isAudio: boolean = true) {
  return sipManager.sendSIPMessage(to, text, callId, isAudio);
}
export async function makeCall(to: string) {
  return sipManager.makeCall(to);
}

// Función para parsear mensajes SIP
export async function parseSIPMessage(body: any) {
  return {
    from: body.from || body.callerId || 'unknown',
    text: body.text || body.message || 'Llamada SIP iniciada',
    provider: 'sip',
    isAudio: body.isAudio || false,
    callId: body.sipCallId || body.callId
  };
}

// Función para procesar llamadas SIP entrantes
export async function handleIncomingSIPCall(callId: string, callerId: string) {
  try {
    console.log(`Procesando llamada SIP entrante: ${callerId} (Call ID: ${callId})`);
    
    // Crear un mensaje de bienvenida
    const welcomeMessage = {
      from: callerId,
      text: 'Llamada SIP iniciada',
      provider: 'sip',
      isAudio: true,
      callId: callId
    };

    // Procesar el mensaje con el asistente
    const response = await messageService.processUserMessage(
      'sip',
      callerId,
      'Hola, soy tu asistente de voz. ¿En qué puedo ayudarte?',
      undefined,
      //callId
    );

    console.log(`Respuesta del asistente para ${callerId}: ${response}`);

    // Enviar la respuesta como audio
    await sendSIPMessage(callerId, response, callId, true);

    return response;
  } catch (error) {
    console.error('Error procesando llamada SIP:', error);
    throw error;
  }
}