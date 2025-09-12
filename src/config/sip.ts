import 'dotenv/config';

export const sipConfig = {
  enabled: process.env.CHANNEL_SIP_ENABLED === 'true',
  provider: (process.env.SIP_PROVIDER || 'ws') as 'ws'|'ari'|'drachtio'|'freeswitch',

  // ws (sip.js)
  sipUri: process.env.SIP_URI,
  password: process.env.SIP_PASSWORD,
  wsServers: process.env.SIP_WS_SERVERS,
  displayName: process.env.SIP_DISPLAY_NAME || 'AI Agent',

  // drachtio
  /** drachtio: process.env.DRACHTIO_HOST ? {
    host: process.env.DRACHTIO_HOST!,
    port: Number(process.env.DRACHTIO_PORT || 9022),
    secret: process.env.DRACHTIO_SECRET,
    protocol: (process.env.DRACHTIO_PROTOCOL as any) || 'tcp'
  } : undefined,

  // asterisk ARI
  ari: process.env.ARI_URL ? {
    url: process.env.ARI_URL!,
    username: process.env.ARI_USERNAME!,
    password: process.env.ARI_PASSWORD!,
    app: process.env.ARI_APP || 'ai-app',
    endpoint: process.env.ARI_ENDPOINT, // p.ej. PJSIP/linphone
    playbackBaseUrl: process.env.ARI_PLAYBACK_BASE_URL // p.ej. http://<server>/uploads
  } : undefined,
   */
};