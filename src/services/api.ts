import axios from 'axios';
import { auth } from '../lib/firebase.ts';

export const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
});

// Inject fresh Firebase ID token in memory on every authenticated request (never localStorage)
api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractApiError(error: unknown, fallback = 'Request failed. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/**
 * Fetches private medical document binary through authenticated Express endpoint
 * and returns a temporary Blob object URL (caller must URL.revokeObjectURL on cleanup).
 */
export async function fetchPrivateDocumentBlobUrl(documentId: string): Promise<{
  blobUrl: string;
  mimeType: string;
}> {
  const response = await api.get(`/documents/${documentId}/content`, {
    responseType: 'blob',
  });
  const rawContentType = response.headers['content-type'];
  const mimeType =
    typeof rawContentType === 'string' ? rawContentType : 'application/octet-stream';
  const blobUrl = URL.createObjectURL(response.data);
  return { blobUrl, mimeType };
}
