import * as twilio from './twilio';
import * as waba from './waba';
import * as webrtc from './webrtc';
import * as telegram from './telegram';

export const CHANNEL_META_MAP: Record<string, { CHANNEL_TYPE: string }> = {
  twilio: { CHANNEL_TYPE: twilio.CHANNEL_TYPE },
  waba: { CHANNEL_TYPE: waba.CHANNEL_TYPE },
  webrtc: { CHANNEL_TYPE: webrtc.CHANNEL_TYPE },
  telegram: { CHANNEL_TYPE: telegram.CHANNEL_TYPE },
  // ...otros canales
};

export function detectChannel(body: any) {
  if (body.From && (body.Body || body.NumMedia)) return 'twilio';
  if (body.messages && body.messages[0]?.type === 'text') return 'waba';
  if (body.type && (body.type === 'audio' || body.type === 'text' || body.type === 'call_start' || body.type === 'call_end')) return 'webrtc';
  if (body.message || body.edited_message) return 'telegram';
  return null;
}

export async function parseMessage(body: any) {
  const channel = detectChannel(body);
  if (channel === 'twilio') return twilio.parseTwilioMessage(body);
  if (channel === 'waba') return waba.parseWabaMessage(body);
  if (channel === 'webrtc') return webrtc.parseWebRTCMessage(body);
  if (channel === 'telegram') return telegram.parseTelegramMessage(body);
  throw new Error('Unknown channel');
}

const senders: Record<string, (to: string, text: string, reply?: any, isAudio?: boolean) => Promise<any>> = {
  twilio: twilio.sendTwilioMessage,
  waba: (to, text) => waba.sendWabaMessage(to, text),
  webrtc: (to, text, reply, isAudio) => webrtc.sendWebRTCResponse(to, text, reply?.sessionId || ''),
  telegram: (to, text, reply, isAudio) => telegram.sendTelegramMessage(to, text, isAudio),
};

export async function sendMessage(provider: string, to: string, text: string, reply?: any, isAudio?: boolean) {
  const sender = senders[provider];
  if (!sender) throw new Error('Unknown provider');
  return sender(to, text, reply, isAudio);
}