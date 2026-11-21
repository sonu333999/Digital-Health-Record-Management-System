import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';

export interface StoredDocumentResult {
  storageProvider: 'gcs' | 'postgres_private';
  storageKey: string;
  fileDataBase64: string | null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

/**
 * Private medical document storage adapter.
 * Uses Google Cloud Storage when GCS_BUCKET_NAME is configured (strictly private, no public URLs).
 * Otherwise persists encrypted/encoded binary content privately inside Cloud SQL PostgreSQL.
 */
export async function savePrivateDocument(
  buffer: Buffer,
  workerId: string,
  originalFileName: string,
  mimeType: string
): Promise<StoredDocumentResult> {
  const randomSuffix = crypto.randomBytes(16).toString('hex');
  const safeName = sanitizeFileName(originalFileName);
  const storageKey = `private/workers/${workerId}/${Date.now()}_${randomSuffix}_${safeName}`;
  const bucketName = process.env.GCS_BUCKET_NAME?.trim();

  if (bucketName) {
    try {
      const storage = new Storage();
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(storageKey);
      await file.save(buffer, {
        contentType: mimeType,
        resumable: false,
        metadata: {
          cacheControl: 'private, no-store',
        },
      });
      return {
        storageProvider: 'gcs',
        storageKey,
        fileDataBase64: null,
      };
    } catch (error) {
      console.error('GCS private upload failed; falling back to PostgreSQL private blob storage:', error);
    }
  }

  return {
    storageProvider: 'postgres_private',
    storageKey,
    fileDataBase64: buffer.toString('base64'),
  };
}

export async function readPrivateDocument(doc: {
  storageProvider: string;
  storageKey: string;
  fileDataBase64: string | null;
}): Promise<Buffer> {
  if (doc.storageProvider === 'gcs' && process.env.GCS_BUCKET_NAME?.trim()) {
    const storage = new Storage();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME.trim());
    const [contents] = await bucket.file(doc.storageKey).download();
    return contents;
  }

  if (!doc.fileDataBase64) {
    throw new Error('Private document content is unavailable.');
  }

  return Buffer.from(doc.fileDataBase64, 'base64');
}

export async function deletePrivateDocument(doc: {
  storageProvider: string;
  storageKey: string;
}): Promise<void> {
  if (doc.storageProvider === 'gcs' && process.env.GCS_BUCKET_NAME?.trim()) {
    try {
      const storage = new Storage();
      const bucket = storage.bucket(process.env.GCS_BUCKET_NAME.trim());
      await bucket.file(doc.storageKey).delete({ ignoreNotFound: true });
    } catch (error) {
      console.error('GCS private object deletion failed:', error);
    }
  }
}
