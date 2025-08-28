import { storageManager } from '../storage';
import { v4 as uuidv4 } from 'uuid';

export async function uploadAudioAndGetUrl(audioBuffer: Buffer): Promise<string> {
   const storageService = storageManager.getService();
   const fileName = `audio-${uuidv4()}.mp3`;
   const mimeType = 'audio/mpeg';

   try {
      const url = await storageService.uploadFile(fileName, audioBuffer, mimeType);
      return url;
   } catch (error) {
      throw new Error(`Failed to upload audio file: ${error instanceof Error ? error.message :
      String(error)}`);
   }
}