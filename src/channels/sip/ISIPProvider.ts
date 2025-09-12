export interface SIPInitConfig {
    sipUri?: string;
    password?: string;
    wsServers?: string;
    displayName?: string;
  
    drachtio?: {
      host: string;
      port: number;
      secret?: string;
      protocol?: 'tcp' | 'tls';
    };
  
    ari?: {
      url: string;            // http(s)://host:port
      username: string;
      password: string;
      app: string;            // nombre de la app ARI
      endpoint?: string;      // PJSIP/<peer> para llamadas salientes
      playbackBaseUrl?: string; // base para reproducir TTS (archivos o endpoints)
    };
  }
  
  export interface SIPCallInfo {
    callId: string;
    status: 'connected' | 'ringing' | 'ended' | 'failed';
    from?: string;
    to?: string;
  }
  
  export interface ISIPProvider {
    initialize(config: SIPInitConfig): Promise<void>;
    makeCall(to: string): Promise<SIPCallInfo>;
    endCall(callId: string): Promise<void>;
    sendTextOrAudio(to: string, text: string, callId?: string, isAudio?: boolean): Promise<{ status: string; callId?: string }>;
    getActiveCalls(): string[];
    isCallActive(callId: string): boolean;
    terminate(): Promise<void>;
  }