import { createClient } from "@deepgram/sdk";
import "dotenv/config";

// Configuración de Deepgram
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";
const DEEPGRAM_MODEL_SST = process.env.DEEPGRAM_MODEL_SST || "nova-3";
const DEEPGRAM_MODEL_TTS = process.env.DEEPGRAM_MODEL_TTS || "nova-3";
const deepgram = createClient(DEEPGRAM_API_KEY);

export async function speechToText(audioFileUrl: string | Buffer) {
  try {
    let audioData: Buffer;
    let transcription: any;

    if (typeof audioFileUrl === 'string') {
      // Si es una URL, hacer fetch
      transcription = await deepgram.listen.prerecorded.transcribeUrl(
        {
          url:audioFileUrl
        }, {
        model: DEEPGRAM_MODEL_SST,
        smart_format: true,
        detect_language: true,
        //utterances: true,
      });
    } else {
      // Si es un Buffer, usar directamente
      audioData = audioFileUrl;
      
      transcription = await deepgram.listen.prerecorded.transcribeFile(audioData, {
        model: DEEPGRAM_MODEL_SST,
        smart_format: true,
        detect_language: true,
        //utterances: true,
      });
    }
    
    // Extraer el texto de la transcripción
    if (transcription.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
      return transcription.result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    }
    
    return null;
  } catch (error) {
    console.error("Error en speechToText de Deepgram:", error);
    throw new Error(`Error en speechToText de Deepgram: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function textToSpeech(text: string) {
  try {
    // Solicitar síntesis de voz
    const response = await deepgram.speak.request(
      { text },
      {
        model: DEEPGRAM_MODEL_TTS, // Modelo de voz por defecto
        encoding: "mp3",
      }
    );
    
    // Obtener el stream de audio
    const stream = await response.getStream();
    
    if (stream) {
      // Convertir ReadableStream a Buffer
      const chunks: Buffer[] = [];
      const reader = stream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
      
      return Buffer.concat(chunks);
    }
    
    throw new Error("No se pudo generar el audio");
  } catch (error) {
    console.error("Error en textToSpeech de Deepgram:", error);
    throw new Error(`Error en textToSpeech de Deepgram: ${error instanceof Error ? error.message : String(error)}`);
  }
}