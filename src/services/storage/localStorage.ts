import { StorageService } from './types';
import fs from 'fs/promises';
import path from 'path';

export class LocalStorageService implements StorageService {
   private uploadDir: string;
   private publicBaseUrl: string;

   constructor() {
     this.uploadDir = path.join(process.cwd(), 'uploads');
     this.publicBaseUrl = process.env.LOCAL_STORAGE_PUBLIC_URL || 'http://localhost:3000/uploads';

     this.ensureUploadDir();
   }

   private async ensureUploadDir() {
     try {
       await fs.access(this.uploadDir);
     } catch {
       await fs.mkdir(this.uploadDir, { recursive: true });
     }
   }

   async uploadFile(fileName: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
     const filePath = path.join(this.uploadDir, fileName);
     await fs.writeFile(filePath, fileBuffer);
     return `${this.publicBaseUrl}/${fileName}`;
   }

   async deleteFile(fileName: string): Promise<void> {
     const filePath = path.join(this.uploadDir, fileName);
     try {
       await fs.unlink(filePath);
     } catch (error) {
       // Ignorar si el archivo no existe
       if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
         throw error;
       }
     }
   }
}