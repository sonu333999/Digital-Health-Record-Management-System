import React, { useEffect, useState } from 'react';
import { Download, FileText, Loader2, ShieldAlert } from 'lucide-react';
import { extractApiError, fetchPrivateDocumentBlobUrl } from '../services/api.ts';

interface PrivateDocumentViewerProps {
  documentId: string;
  fileName: string;
  mimeType: string;
}

export function PrivateDocumentViewer({
  documentId,
  fileName,
  mimeType,
}: PrivateDocumentViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeUrl: string | null = null;
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchPrivateDocumentBlobUrl(documentId)
      .then(({ blobUrl: url }) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        activeUrl = url;
        setBlobUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(extractApiError(err, 'Unable to load private document.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        <p className="mt-2 text-xs">Loading private medical document...</p>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 p-6 text-center text-red-800">
        <ShieldAlert className="h-6 w-6" />
        <p className="mt-2 text-sm font-medium">{error || 'Document unavailable.'}</p>
      </div>
    );
  }

  const isPdf = mimeType.toLowerCase().includes('pdf');

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-[#0D7A6F]" />
          <span className="truncate text-xs font-medium text-slate-700">{fileName}</span>
        </div>
        <a
          href={blobUrl}
          download={fileName}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>

      <div className="bg-slate-100/70 p-3">
        {isPdf ? (
          <iframe
            src={blobUrl}
            title={fileName}
            className="h-[460px] w-full rounded-lg border border-slate-200 bg-white"
          />
        ) : (
          <img
            src={blobUrl}
            alt={fileName}
            referrerPolicy="no-referrer"
            className="mx-auto max-h-[460px] rounded-lg border border-slate-200 bg-white object-contain"
          />
        )}
      </div>
    </div>
  );
}
