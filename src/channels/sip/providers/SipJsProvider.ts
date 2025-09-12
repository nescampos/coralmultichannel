import { UserAgent, Session, Invitation, Registerer, RegistererState, URI, SessionDescriptionHandler, SessionDescriptionHandlerOptions, SessionDescriptionHandlerModifier, BodyAndContentType } from 'sip.js';
import { ISIPProvider, SIPInitConfig, SIPCallInfo } from '../ISIPProvider';
import { handleIncomingSIPCall } from '../../sip';
//import { SessionDescriptionHandler } from 'sip.js/lib/platform/web';

// SessionDescriptionHandler personalizado para Node.js
// SessionDescriptionHandler personalizado para Node.js
class NodeSessionDescriptionHandler implements SessionDescriptionHandler {
  private closed = false;

  constructor() {
    // Constructor simple sin logger
  }

  close(): void {
    this.closed = true;
  }

  getDescription(options?: SessionDescriptionHandlerOptions, modifiers?: SessionDescriptionHandlerModifier[]): Promise<BodyAndContentType> {
    if (this.closed) {
      return Promise.reject(new Error('SessionDescriptionHandler is closed'));
    }

    // SDP básico para Node.js
    const sdp = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 0 RTP/AVP 0
c=IN IP4 127.0.0.1
a=rtpmap:0 PCMU/8000`;

    return Promise.resolve({
      body: sdp,
      contentType: 'application/sdp'
    });
  }

  setDescription(sdp: string, options?: SessionDescriptionHandlerOptions, modifiers?: SessionDescriptionHandlerModifier[]): Promise<void> {
    if (this.closed) {
      return Promise.reject(new Error('SessionDescriptionHandler is closed'));
    }

    // En Node.js, no necesitamos procesar el SDP real
    return Promise.resolve();
  }

  hasDescription(contentType: string): boolean {
    return contentType === 'application/sdp';
  }

  rollbackDescription?(): Promise<void> {
    return Promise.resolve();
  }

  sendDtmf(tones: string, options?: unknown): boolean {
    // En Node.js, no manejamos DTMF real
    return false;
  }
}

export class SipJsProvider implements ISIPProvider {
  private ua: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private sessions = new Map<string, Session>();

  async initialize(config: SIPInitConfig): Promise<void> {
    if (!config.sipUri || !config.password || !config.wsServers) throw new Error('Missing SIP WSS config');
    
    const fullUri = new URI('sip', config.sipUri.split(':')[1].split('@')[0], config.sipUri.split('@')[1]);
    this.ua = new UserAgent({
      uri: fullUri,
      authorizationUsername: config.sipUri.split(':')[1].split('@')[0],
      authorizationPassword: config.password,
      transportOptions: { server: config.wsServers },
      displayName: config.displayName,
      // Configuración adicional para registro
      registererOptions: {
        expires: 600, // 10 minutos
        extraHeaders: [`Contact: <${fullUri.toString()}>`]
      },
      sessionDescriptionHandlerFactory: () => {
        return new NodeSessionDescriptionHandler();
      }
    } as any);

    this.ua.delegate = {
      onInvite: (invitation: Invitation) => this.handleInvite(invitation),
      onConnect: () => {
        console.log('SIP UserAgent connected');
        this.register();
      },
      onDisconnect: (error?: Error) => console.log('SIP UserAgent disconnected', error?.message),
      onNotify: (notification) => console.log('SIP NOTIFY received', notification)
    };
    await (this.ua as any).start();
  }

  private async register() {
    if (!this.ua) return;
    
    try {
      this.registerer = new Registerer(this.ua);
      
      this.registerer.stateChange.addListener((newState: RegistererState) => {
        console.log('SIP Registration state:', newState);
        
        switch (newState) {
          case RegistererState.Registered:
            console.log('SIP User successfully registered and discoverable');
            break;
          case RegistererState.Unregistered:
            console.log('SIP User unregistered');
            break;
          case RegistererState.Terminated:
            console.log('SIP Registration terminated');
            break;
        }
      });
      
      // Iniciar el registro
      await this.registerer.register();
      console.log('SIP Registration initiated');
      
    } catch (error) {
      console.error('SIP Registration failed:', error);
    }
  }

  private async handleInvite(invitation: Invitation) {
    console.log('SIP INVITE received');
    const session = invitation as Session;
    (session as any).accept();
    const id = session.id || Date.now().toString();
    this.sessions.set(id, session);
    console.log('SIP call accepted, session ID:', id);

    // Obtener información del llamador
    const callerId = invitation.remoteIdentity?.uri?.toString() || 'unknown';
    console.log('SIP caller ID:', callerId);

    try {
      await handleIncomingSIPCall(id, callerId);
    } catch (error) {
      console.error('Error procesando llamada SIP:', error);
      // Enviar mensaje de error al llamador
      await this.sendTextOrAudio(callerId, 'Lo siento, hubo un error procesando tu llamada.', id, true);
    }

    session.delegate = {
      onBye: () => {
        console.log('SIP call ended by remote party');
        this.sessions.delete(id);
      }
    };
  }

  async makeCall(to: string): Promise<SIPCallInfo> {
    if (!this.ua) throw new Error('UA not initialized');
    if (!this.registerer || this.registerer.state !== RegistererState.Registered) {
      throw new Error('SIP user not registered');
    }
    const session = (this.ua as any).invite(to, { media: { audio: true, video: false } });
    const id = (session as any).id || Date.now().toString();
    this.sessions.set(id, session);
    return new Promise((resolve, reject) => {
      (session as any).on('accepted', () => resolve({ callId: id, status: 'connected', to }));
      (session as any).on('failed', () => reject(new Error('Call failed')));
    });
  }

  async endCall(callId: string): Promise<void> {
    const session = this.sessions.get(callId);
    if (!session) throw new Error('No session found');
    
    try {
      await session.bye();
      this.sessions.delete(callId);
      console.log('SIP call ended, session ID:', callId);
    } catch (error) {
      console.error('Error ending SIP call:', error);
      throw error;
    }
  }

  async sendTextOrAudio(to: string, text: string, callId?: string, isAudio: boolean = true) {
    console.log(`Enviando mensaje SIP a ${to}: ${text} (Audio: ${isAudio}, Call ID: ${callId})`);
    
    // Aquí podrías implementar la lógica para enviar audio real
    // Por ahora, solo logueamos el mensaje
    if (isAudio) {
      console.log(`[AUDIO] ${text}`);
      // TODO: Implementar envío de audio real usando textToSpeech
    } else {
      console.log(`[TEXT] ${text}`);
    }
    
    return { status: isAudio ? 'audio_sent' : 'text_sent', callId };
  }


  getActiveCalls(): string[] { return Array.from(this.sessions.keys()); }
  isCallActive(callId: string): boolean { return this.sessions.has(callId); }

  async terminate(): Promise<void> {
    // Desregistrar antes de terminar
    if (this.registerer) {
      try {
        await this.registerer.unregister();
        console.log('SIP user unregistered');
      } catch (error) {
        console.error('Error unregistering:', error);
      }
    }
    
    for (const session of this.sessions.values()) {
      try {
        await session.bye();
      } catch (error) {
        console.error('Error terminating session:', error);
      }
    }
    this.sessions.clear();
    if (this.ua) await this.ua.stop();
    this.ua = null;
    this.registerer = null;
  }
}