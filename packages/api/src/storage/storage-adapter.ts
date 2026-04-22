export interface StorageAdapter {
  /** Saves file and returns public URL (not path). */
  upload(buffer: Buffer, relativePath: string): Promise<string>;
  delete(relativePath: string): Promise<void>;
  getUrl(relativePath: string): string;
}
