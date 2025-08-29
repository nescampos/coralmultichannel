import * as elevenLabs from './elevenlabs';


const SPEECH_SERVICE = process.env.SPEECH_SERVICE || "";

export async function speechToText(audioFileUrl: string | Buffer) {
    if (SPEECH_SERVICE === "elevenlabs") return elevenLabs.speechToText(audioFileUrl);
    throw new Error("Speech service not supported");
}

export async function textToSpeech(text: string) {
    if (SPEECH_SERVICE === "elevenlabs") return elevenLabs.textToSpeech(text);
    throw new Error("Speech service not supported");
}
