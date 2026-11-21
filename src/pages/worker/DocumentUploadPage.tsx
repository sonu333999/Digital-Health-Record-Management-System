import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileScan,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { ConfirmModal } from '../../components/ConfirmModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import { ALLOWED_DOCUMENT_MIMES, MAX_DOCUMENT_SIZE_BYTES } from '../../shared/constants.ts';

interface DocumentItem {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageProvider: string;
  processingStatus: string;
  healthRecordId: string | null;
  createdAt: string;
}

export function DocumentUploadPage() {
  const { pushToast, t } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const { data } = await api.get('/documents');
      setDocuments(data.documents || []);
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to load uploaded documents.'));
    } finally {
      setLoadingDocs(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const validateAndSelectFile = (selected: File | null) => {
    setValidationError(null);
    if (!selected) {
      setFile(null);
      return;
    }

    const allowed: readonly string[] = ALLOWED_DOCUMENT_MIMES;
    if (!allowed.includes(selected.type.toLowerCase())) {
      setValidationError('Unsupported format. Please choose a JPG, JPEG, PNG, or PDF file.');
      setFile(null);
      return;
    }

    if (selected.size > MAX_DOCUMENT_SIZE_BYTES) {
      setValidationError('File exceeds the 10 MB maximum upload limit.');
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setValidationError('Please select a file first.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setValidationError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      });

      pushToast('success', 'Document stored privately. Ready for OCR extraction.');
      setFile(null);
      setUploadProgress(0);
      await loadDocuments();
      if (data.document?.id) {
        navigate(`/worker/documents/${data.document.id}/ocr`);
      }
    } catch (err) {
      setValidationError(extractApiError(err, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      pushToast('success', 'Private document deleted.');
      setDeleteTarget(null);
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <AppShell breadcrumb="Worker / Medical Documents" title={t.navUploadDocument}>
      <div className="space-y-8">
        {/* Upload Card */}
        <form
          onSubmit={handleUpload}
          className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
            Upload Prescription, Lab Report, or Discharge Summary
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Supported formats: JPG, JPEG, PNG, PDF · Maximum file size: 10 MB · Stored privately
            with zero public URLs.
          </p>

          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center transition-colors hover:border-[#0D7A6F] hover:bg-[#EEF7F6]/40">
            <UploadCloud className="h-8 w-8 text-[#0D7A6F]" />
            <p className="mt-3 text-sm font-medium text-[#0F1E2E]">
              {file ? file.name : 'Click to select a medical document'}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {file
                ? `${file.type} · ${formatBytes(file.size)}`
                : 'JPG, JPEG, PNG, or PDF up to 10 MB'}
            </p>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(e) => validateAndSelectFile(e.target.files?.[0] || null)}
              className="sr-only"
            />
          </label>

          {validationError && (
            <p className="mt-3 text-xs font-medium text-red-700">{validationError}</p>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Uploading securely to private storage...</span>
                <span className="font-mono tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-[#0D7A6F] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Upload & Continue to OCR
            </button>
          </div>
        </form>

        {/* Uploaded Private Documents Archive */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
              Uploaded Private Medical Documents
            </h2>
          </div>

          {loadingDocs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
            </div>
          ) : documents.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              No medical documents uploaded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <tr>
                    <th className="px-6 py-3">Document File</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Size</th>
                    <th className="px-6 py-3">Uploaded</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 shrink-0 text-[#0D7A6F]" />
                          <span className="font-medium text-[#0F1E2E]">{doc.originalFileName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                        {doc.processingStatus.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatBytes(doc.fileSizeBytes)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/worker/documents/${doc.id}/ocr`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-[#0D7A6F] hover:bg-[#EEF7F6]"
                          >
                            <FileScan className="h-3.5 w-3.5" />
                            OCR & Review
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                            aria-label={`Delete ${doc.originalFileName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Private Document"
        description={`Delete "${deleteTarget?.originalFileName}" from private storage?`}
        confirmLabel="Delete Document"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
