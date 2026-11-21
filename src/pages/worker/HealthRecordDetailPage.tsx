import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { AiSummaryView } from '../../components/AiSummaryView.tsx';
import { PrivateDocumentViewer } from '../../components/PrivateDocumentViewer.tsx';
import { ConfirmModal } from '../../components/ConfirmModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import type { StructuredAiSummary } from '../../db/schema.ts';

interface FullHealthRecord {
  id: string;
  title: string;
  category: string;
  diagnosis: string | null;
  doctorName: string | null;
  hospitalName: string | null;
  visitDate: string;
  prescriptionDetails: string | null;
  medicationDetails: string | null;
  laboratoryResults: string | null;
  medicalNotes: string | null;
  ocrExtractedText: string | null;
  aiSummaryJson: StructuredAiSummary | null;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    id: string;
    originalFileName: string;
    mimeType: string;
    fileSizeBytes: number;
  }>;
}

export function HealthRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pushToast } = useAuth();

  const [record, setRecord] = useState<FullHealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get(`/worker/records/${id}`)
      .then((res) => {
        if (!cancelled) setRecord(res.data.record);
      })
      .catch((err) => {
        if (!cancelled) pushToast('error', extractApiError(err, 'Record not found.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, pushToast]);

  const handleGenerateAiSummary = async () => {
    if (!id) return;
    setGeneratingAi(true);
    try {
      const { data } = await api.post(`/worker/records/${id}/ai-summary`);
      setRecord((prev) => (prev ? { ...prev, aiSummaryJson: data.summary } : prev));
      pushToast('success', 'Structured Gemini AI summary saved to PostgreSQL.');
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to generate AI summary.'));
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/worker/records/${id}`);
      pushToast('success', 'Health record deleted.');
      navigate('/worker/records', { replace: true });
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell
      breadcrumb="Worker / Health Records / Details"
      title={record?.title || 'Record Details'}
      action={
        record && (
          <div className="flex items-center gap-2">
            <Link
              to={`/worker/records/${record.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50 whitespace-nowrap"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )
      }
    >
      <div className="mb-4">
        <Link
          to="/worker/records"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#0D7A6F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Health Records
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : !record ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Record not found or inaccessible.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs text-slate-500">
                  {record.category} · Visit Date:{' '}
                  <span className="font-mono text-[#0F1E2E] tabular-nums">{record.visitDate}</span>{' '}
                  · Added by {record.createdByRole}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-[#0F1E2E]">
                  {record.title}
                </h2>
              </div>

              {!record.aiSummaryJson && (
                <button
                  type="button"
                  onClick={handleGenerateAiSummary}
                  disabled={generatingAi}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B] disabled:opacity-60 whitespace-nowrap"
                >
                  {generatingAi ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate AI Summary
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DetailField label="Diagnosis / Medical Observation" value={record.diagnosis} />
              <DetailField label="Hospital / Clinic" value={record.hospitalName} />
              <DetailField label="Attending Doctor" value={record.doctorName} />
              <DetailField label="Medication Details" value={record.medicationDetails} />
              <DetailField label="Prescription Details" value={record.prescriptionDetails} full />
              <DetailField label="Laboratory Results" value={record.laboratoryResults} full />
              <DetailField label="Clinical Notes" value={record.medicalNotes} full />
            </div>

            {record.ocrExtractedText && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-xs font-semibold text-slate-600">
                  Original Preserved OCR Extracted Text
                </h3>
                <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
                  {record.ocrExtractedText}
                </pre>
              </div>
            )}
          </div>

          {record.aiSummaryJson && (
            <AiSummaryView
              summary={record.aiSummaryJson}
              onRegenerate={handleGenerateAiSummary}
              regenerating={generatingAi}
            />
          )}

          {record.attachments && record.attachments.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-display text-base font-semibold text-[#0F1E2E]">
                Attached Private Medical Documents ({record.attachments.length})
              </h3>
              {record.attachments.map((att) => (
                <PrivateDocumentViewer
                  key={att.id}
                  documentId={att.id}
                  fileName={att.originalFileName}
                  mimeType={att.mimeType}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Delete Health Record"
        description="This permanently removes the record from PostgreSQL. Attached private documents remain safely stored in your Documents archive."
        confirmLabel="Delete Permanently"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppShell>
  );
}

function DetailField({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#0F1E2E]">
        {value || 'Not recorded'}
      </p>
    </div>
  );
}
