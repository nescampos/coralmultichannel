export interface StorageService {
    uploadFile(fileName: string, fileBuffer: Buffer, mimeType: string): Promise<string>;
    deleteFile(fileName: string): Promise<void>;
}