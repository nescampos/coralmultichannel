import { ISIPProvider, SIPInitConfig, SIPCallInfo } from '../ISIPProvider';
import { handleIncomingSIPCall } from '../../sip';
import { v4 as uuidv4 } from 'uuid';
import { textToSpeech } from '../../../services/ai/speech';
import { uploadAudioAndGetUrl } from '../../../services/audio/uploadService';
import Srf =  require("drachtio-srf");
import dotenv from 'dotenv';
dotenv.config();


type DrachtioSession = {
	id: string;
	dialog: any;
	callerId?: string;
};

export class DrachtioProvider implements ISIPProvider {
	private srf: any;
	private sessions = new Map<string, DrachtioSession>();

	async initialize(config: SIPInitConfig): Promise<void> {
		if (!config.drachtio?.host || !config.drachtio.port) {
			//console.log("Config:", config)
			throw new Error('Missing Drachtio config');
		}

		this.srf = new Srf();
		await this.srf.connect({
			host: config.drachtio.host,
			port: config.drachtio.port,
			secret: config.drachtio.secret,
			protocol: config.drachtio.protocol || 'tcp'
		});

		//console.log('Connected to drachtio server');

		//await this.srf.register(() => {console.log("Dratchio registered")});

		this.srf.on('connect', (err: any, hostport: any) => {
			console.log(`Drachtio connected: ${hostport}`);
		});
		this.srf.on('error', (err: any) => {
			console.error('Drachtio error:', err);
		});

		// INVITE entrante
		this.srf.invite(async (req: any, res: any) => {
			console.log("Body", req.body);
			try {
				// Contestamos 200 OK sin SDP local (media la gestiona un media server externo)
				const uas = await this.srf.createUAS(req, res /** , { localSdp: req.body || undefined } */);
				//console.log("UAS",uas);
				const id = (uas.sip?.callId as string) || uuidv4();
				const callerId = req.callingNumber || req.callingName || req.get('From') || 'unknown';
				this.sessions.set(id, { id, dialog: uas, callerId });
				console.log(`SIP call accepted, dialog id: ${id}`);

				// Dispara el flujo de bienvenida (enviará TTS si está configurado)
				try {
					await handleIncomingSIPCall(id, String(callerId));
				} catch (e) {
					console.error('Error en handleIncomingSIPCall:', e);
				}

				uas.on('destroy', () => {
					this.sessions.delete(id);
					console.log(`SIP call ended by remote, dialog id: ${id}`);
				});
			} catch (err) {
				console.error('Error handling INVITE:', err);
				try { res.send(480); } catch {}
			}
		});
	}

	async makeCall(to: string): Promise<SIPCallInfo> {
		// Outbound-call via drachtio requires routing and a media server; leaving as not implemented here.
		throw new Error('Not implemented: makeCall for DrachtioProvider');
	}

	async endCall(callId: string): Promise<void> {
		const s = this.sessions.get(callId);
		if (!s) throw new Error('No session found');
		try {
			await s.dialog?.bye?.();
			this.sessions.delete(callId);
			console.log(`SIP call ended, dialog id: ${callId}`);
		} catch (err) {
			console.error('Error ending SIP call:', err);
			throw err;
		}
	}

	async sendTextOrAudio(to: string, text: string, callId?: string, isAudio: boolean = true) {
		const s = callId ? this.sessions.get(callId) : undefined;
		console.log(`sendTextOrAudio(to=${to}, isAudio=${isAudio}, callId=${callId})`);

		// IMPORTANTE: Drachtio no maneja media; necesitas un media server (p.ej., FreeSWITCH).
		// 1) Genera TTS y sube a URL pública (ya implementado en SipJsProvider si quieres reutilizar).
		// 2) Reproduce la URL en el canal mediante FreeSWITCH (ESL) o drachtio-fsmrf.
		// Por ahora, devolvemos estados placeholder.
		if (isAudio) {
			try {
				 // Generate audio using existing TTS service
				const audioBuffer = await textToSpeech(text);
				const url = await uploadAudioAndGetUrl(audioBuffer);
			   	console.log(`[AUDIO URL] ${url}`);
			   
				// TODO: Send the audio URL to the media server for streaming
				// This would require integrating with FreeSWITCH via ESL or drachtio-fsmrf
				
				return { status: 'audio_streamed', callId };
			} catch (err: any) {
			   	console.error('Error generando/enviando audio:', err?.message || err);
			   	return { status: 'audio_failed', callId };
			}
		} else {
			// podrías enviar SIP MESSAGE si el peer lo soporta (no es audio)
			return { status: 'text_sent_placeholder', callId };
		}
	}

	getActiveCalls(): string[] {
		return Array.from(this.sessions.keys());
	}

	isCallActive(callId: string): boolean {
		return this.sessions.has(callId);
	}

	async terminate(): Promise<void> {
		for (const s of this.sessions.values()) {
			try { await s.dialog?.bye?.(); } catch {}
		}
		this.sessions.clear();
		try { await this.srf?.disconnect?.(); } catch {}
	}
}