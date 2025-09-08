import * as elevenLabs from './providers/elevenlabs';
import * as deepgram from './providers/deepgram';


const SPEECH_SERVICE = process.env.SPEECH_SERVICE || "";

export async function speechToText(audioFileUrl: string | Buffer) {
    if (SPEECH_SERVICE === "elevenlabs") return elevenLabs.speechToText(audioFileUrl);
    if (SPEECH_SERVICE === "deepgram") return deepgram.speechToText(audioFileUrl);
    throw new Error("Speech service not supported");
}

export async function textToSpeech(text: string) {
    if (SPEECH_SERVICE === "elevenlabs") return elevenLabs.textToSpeech(text);
    if (SPEECH_SERVICE === "deepgram") return deepgram.textToSpeech(text);
    throw new Error("Speech service not supported");
}