import * as twilio from './twilio';
import * as waba from './waba';
import * as webrtc from './webrtc';
import * as telegram from './telegram';
import * as email from './email';
import { isChannelEnabled } from '../config/channels';

export const CHANNEL_META_MAP: Record<string, { CHANNEL_TYPE: string }> = {
  twilio: { CHANNEL_TYPE: twilio.CHANNEL_TYPE },
  waba: { CHANNEL_TYPE: waba.CHANNEL_TYPE },
  webrtc: { CHANNEL_TYPE: webrtc.CHANNEL_TYPE },
  telegram: { CHANNEL_TYPE: telegram.CHANNEL_TYPE },
  email: { CHANNEL_TYPE: email.CHANNEL_TYPE },
  // ...otros canales
};

export function detectChannel(body: any) {
  if (body.From && (body.Body || body.NumMedia) && isChannelEnabled('twilio')) return 'twilio';
  if (body.messages && body.messages[0]?.type === 'text' && isChannelEnabled('waba')) return 'waba';
  if (body.type && (body.type === 'audio' || body.type === 'text' || body.type === 'call_start' || body.type === 'call_end') && isChannelEnabled('webrtc')) return 'webrtc';
  if (body.message || body.edited_message && isChannelEnabled('telegram')) return 'telegram';
  if (body.to && (body.from || body.sender) && (body.subject || body.text || body.html) && isChannelEnabled('email')) return 'email';
  return null;
}

export async function parseMessage(body: any) {
  const channel = detectChannel(body);
  if (channel === 'twilio' && isChannelEnabled('twilio')) return twilio.parseTwilioMessage(body);
  if (channel === 'waba' && isChannelEnabled('waba')) return waba.parseWabaMessage(body);
  if (channel === 'webrtc' && isChannelEnabled('webrtc')) return webrtc.parseWebRTCMessage(body);
  if (channel === 'telegram' && isChannelEnabled('telegram')) return telegram.parseTelegramMessage(body);
  if (channel === 'email' && isChannelEnabled('email')) return email.parseEmailMessage(body);
  throw new Error('Unknown channel');
}

const senders: Record<string, (to: string, text: string, reply?: any, isAudio?: boolean) => Promise<any>> = {
  twilio: twilio.sendTwilioMessage,
  waba: (to, text) => waba.sendWabaMessage(to, text),
  webrtc: (to, text, reply, isAudio) => webrtc.sendWebRTCResponse(to, text, reply?.sessionId || ''),
  telegram: (to, text, reply, isAudio) => telegram.sendTelegramMessage(to, text, isAudio),
  email: (to, text, reply) => email.sendEmailMessage(to, text, reply?.subject, reply),
};

export async function sendMessage(provider: string, to: string, text: string, reply?: any, isAudio?: boolean) {
  const sender = senders[provider];
  if (!sender) throw new Error('Unknown provider');
  return sender(to, text, reply, isAudio);
}