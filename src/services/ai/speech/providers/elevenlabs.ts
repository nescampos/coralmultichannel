// example.mts
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import "dotenv/config";
import type { SpeechToTextChunkResponseModel } from "@elevenlabs/elevenlabs-js/api/types";
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const elevenLabsOptions = {
    apiKey: process.env.ELEVENLABS_API_KEY,
}

const voiceId = process.env.ELEVENLABS_VOICE_ID || "";

const elevenlabs = new ElevenLabsClient(elevenLabsOptions);

export async function speechToText(audioFileUrl: string | Buffer) {
  let audioBlob: Blob;
  
  if (typeof audioFileUrl === 'string') {
    // Si es una URL, hacer fetch
    const response = await fetch(audioFileUrl);
    audioBlob = new Blob([await response.arrayBuffer()], { type: "audio/mp3" });
  } else {
    // Si es un Buffer, crear Blob directamente
    const uint8Array = new Uint8Array(audioFileUrl);
    audioBlob = new Blob([uint8Array], { type: "audio/webm" });
  }
  
  const transcription = await elevenlabs.speechToText.convert({
    file: audioBlob,
    modelId: "scribe_v1",
    tagAudioEvents: false,
  }) as SpeechToTextChunkResponseModel;
  
  if(transcription.text){
    return transcription.text;
  }
  return null;
}

export async function textToSpeech(text: string) {
    const response = await elevenlabs.textToSpeech.convert(voiceId,{
        text,
        modelId: "eleven_multilingual_v2", // Model to use, for now only "scribe_v1" is supported.
        outputFormat: 'mp3_44100_128'
    });
    // const filename = `node-${0}.mp3`;
    // const filepath = path.join('uploads', filename);
    // await fs.writeFile(filepath, response);

    // Convertir ReadableStream a Buffer
    if (response instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of response) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    return response as unknown as Buffer;
}

