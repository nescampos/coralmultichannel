import { StorageService } from './types';
import { LocalStorageService } from './localStorage';

// Aquí podrías importar otros servicios cuando los implementes
// import { S3StorageService } from './s3Storage';
// import { AzureStorageService } from './azureStorage';
class StorageManager {
   private service: StorageService;

   constructor() {
     const storageType = process.env.STORAGE_TYPE || 'local';
     switch (storageType) {
       case 'local':
         this.service = new LocalStorageService();
         break;
       // case 's3':
       //   this.service = new S3StorageService();
       //   break;
       // case 'azure':
       //   this.service = new AzureStorageService();
       //   break;
       default:
         this.service = new LocalStorageService();
     }
   }

   getService(): StorageService {
     return this.service;
   }
}

export const storageManager = new StorageManager();