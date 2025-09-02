import { UserAgent, Session, Invitation } from 'sip.js';
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

interface SIPConfig {
  sipUri: string;
  password: string;
  wsServers: string;
  displayName?: string;
}

class SIPManager {
  private userAgent: UserAgent | null = null;
  private sessions: Map<string, Session> = new Map();
  private isInitialized: boolean = false;

  async initialize(config: SIPConfig): Promise<void> {
    try {
      if (this.isInitialized) {
        console.warn('SIP Manager already initialized');
        return;
      }

      this.userAgent = new UserAgent({
        uri: config.sipUri,
        authorizationUser: config.sipUri.split(':')[1].split('@')[0],
        password: config.password,
        wsServers: config.wsServers,
        displayName: config.displayName
      } as any);

      // Setup invitation handler
      (this.userAgent as any).on('invite', async (invitation: Invitation) => {
        await this.handleIncomingCall(invitation);
      });

      (this.userAgent as any).start();
      this.isInitialized = true;
      console.log('SIP Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SIP Manager:', error);
      throw new Error(`SIP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleIncomingCall(invitation: Invitation): Promise<void> {
    try {
      const session = invitation as Session;
      const callId = (session as any).id || Date.now().toString();
      
      // Accept the call
      (session as any).accept();
      
      // Store session
      this.sessions.set(callId, session);
      
      // Setup media handlers
      this.setupMediaHandlers(session, callId);
      
      console.log(`Call accepted with ID: ${callId}`);
    } catch (error) {
      console.error('Error handling incoming call:', error);
      try {
        (invitation as any).reject();
      } catch (rejectError) {
        console.error('Error rejecting call:', rejectError);
      }
    }
  }

  private setupMediaHandlers(session: Session, callId: string): void {
    try {
      // Handle session termination
      (session as any).on('terminated', () => {
        this.sessions.delete(callId);
        console.log(`Call ${callId} terminated`);
      });
      
      // Handle media events
      (session as any).on('trackAdded', () => {
        console.log(`Media track added for call ${callId}`);
        // In a real implementation, you would set up audio processing here
      });
      
      (session as any).on('trackRemoved', () => {
        console.log(`Media track removed for call ${callId}`);
        // Clean up audio processing resources
      });
    } catch (error) {
      console.error(`Error setting up media handlers for call ${callId}:`, error);
    }
  }

  async parseSIPMessage(body: SIPMessage) {
    let text = '';
    let isAudio = false;

    try {
      if (body.type === 'audio' && body.audioData) {
        const audioBuffer = Buffer.from(body.audioData, 'base64');
        text = await speechToText(audioBuffer) || '';
        isAudio = true;
      }
    } catch (error) {
      console.error('Error processing SIP audio:', error);
      // Don't throw error, just return empty text
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

  async sendSIPMessage(to: string, text: string, callId?: string, isAudio: boolean = true) {
    try {
      // If no callId provided, try to find an active session
      let session: Session | undefined;
      
      if (callId) {
        session = this.sessions.get(callId);
      } else {
        // Get the first available session (not ideal for production)
        const sessions = Array.from(this.sessions.values());
        session = sessions.length > 0 ? sessions[0] : undefined;
      }

      if (!session) {
        throw new Error('No active SIP session found');
      }

      if (isAudio) {
        const audioBuffer = await textToSpeech(text);
        // In a real implementation, you would send the audio through the RTP stream
        // For now, we'll just log that we would send it
        console.log(`Would send audio for text: ${text}`);
        return { status: 'audio_sent', text, callId: callId || (session as any).id };
      } else {
        // Send as DTMF or text message
        console.log(`Would send text message: ${text}`);
        return { status: 'text_sent', text, callId: callId || (session as any).id };
      }
    } catch (error) {
      console.error('Error sending SIP message:', error);
      throw new Error(`Failed to send SIP message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async makeCall(to: string): Promise<{ callId: string; status: string }> {
    try {
      if (!this.userAgent) {
        throw new Error('SIP User Agent not initialized');
      }

      const session = (this.userAgent as any).invite(to, {
        media: { audio: true, video: false }
      });

      // Wait for the session to be established
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Call establishment timeout'));
        }, 30000); // 30 second timeout

        (session as any).on('accepted', () => {
          clearTimeout(timeout);
          const callId = (session as any).id || Date.now().toString();
          this.sessions.set(callId, session);
          this.setupMediaHandlers(session, callId);
          resolve({ callId, status: 'connected' });
        });

        (session as any).on('failed', () => {
          clearTimeout(timeout);
          reject(new Error('Call failed'));
        });
      });
    } catch (error) {
      console.error('Error making SIP call:', error);
      throw new Error(`Failed to make SIP call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async endCall(callId: string): Promise<void> {
    try {
      const session = this.sessions.get(callId);
      if (!session) {
        throw new Error(`No session found for call ID: ${callId}`);
      }

      (session as any).terminate();
      this.sessions.delete(callId);
      console.log(`Call ${callId} ended successfully`);
    } catch (error) {
      console.error(`Error ending call ${callId}:`, error);
      throw new Error(`Failed to end call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getActiveCalls(): string[] {
    return Array.from(this.sessions.keys());
  }

  isCallActive(callId: string): boolean {
    return this.sessions.has(callId);
  }

  async terminate(): Promise<void> {
    try {
      // End all active calls
      const callIds = Array.from(this.sessions.keys());
      for (const callId of callIds) {
        try {
          await this.endCall(callId);
        } catch (error) {
          console.error(`Error ending call ${callId} during termination:`, error);
        }
      }

      // Stop the user agent
      if (this.userAgent) {
        (this.userAgent as any).stop();
      }

      this.userAgent = null;
      this.isInitialized = false;
      console.log('SIP Manager terminated successfully');
    } catch (error) {
      console.error('Error terminating SIP Manager:', error);
      throw new Error(`Failed to terminate SIP Manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const sipManager = new SIPManager();

// For backward compatibility, also export the individual functions
export async function initializeSIP(config: SIPConfig) {
  return await sipManager.initialize(config);
}

export async function parseSIPMessage(body: SIPMessage) {
  return await sipManager.parseSIPMessage(body);
}

export async function sendSIPMessage(to: string, text: string, callId?: string, isAudio: boolean = true) {
  return await sipManager.sendSIPMessage(to, text, callId, isAudio);
}

export async function makeCall(to: string) {
  return await sipManager.makeCall(to);
}