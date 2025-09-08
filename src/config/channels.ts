import "dotenv/config";

// Configuración de canales habilitados/deshabilitados
interface ChannelConfig {
  telegram: boolean;
  email: boolean;
  sip: boolean;
  twilio: boolean;
  waba: boolean;
  webrtc: boolean;
}

// Cargar configuración desde variables de entorno
export const channelConfig: ChannelConfig = {
  telegram: process.env.CHANNEL_TELEGRAM_ENABLED === 'true',
  email: process.env.CHANNEL_EMAIL_ENABLED === 'true',
  sip: process.env.CHANNEL_SIP_ENABLED === 'true',
  twilio: process.env.CHANNEL_TWILIO_ENABLED === 'true',
  waba: process.env.CHANNEL_WABA_ENABLED === 'true',
  webrtc: process.env.CHANNEL_WEBRTC_ENABLED === 'true',
};

// Función para verificar si un canal está habilitado
export function isChannelEnabled(channel: keyof ChannelConfig): boolean {
  return channelConfig[channel] === true;
}

// Función para obtener todos los canales habilitados
export function getEnabledChannels(): (keyof ChannelConfig)[] {
  return Object.keys(channelConfig).filter(
    (channel) => channelConfig[channel as keyof ChannelConfig] === true
  ) as (keyof ChannelConfig)[];
}

// Función para obtener todos los canales deshabilitados
export function getDisabledChannels(): (keyof ChannelConfig)[] {
  return Object.keys(channelConfig).filter(
    (channel) => channelConfig[channel as keyof ChannelConfig] !== true
  ) as (keyof ChannelConfig)[];
}