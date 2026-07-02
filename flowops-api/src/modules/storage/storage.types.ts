export interface UploadFileInput {
  buffer: Buffer;
  storageKey: string;
  mimeType: string;
}

export interface GenerateSignedDownloadUrlOptions {
  expiresInSeconds?: number;
}
