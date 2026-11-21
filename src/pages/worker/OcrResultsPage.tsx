import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  FileScan,
  Loader2,
  Save,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { PrivateDocumentViewer } from '../../components/PrivateDocumentViewer.tsx';
import { AiSummaryView } from '../../components/AiSummaryView.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import { RECORD_CATEGORIES, type RecordCategory } from '../../shared/constants.ts';
import type { StructuredAiSummary } from '../../db/schema.ts';

interface MedicalDocDetail {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  processingStatus: string;
  ocrEngine: string | null;
  ocrRawText: string | null;
  ocrVerifiedText: string | null;
  aiSummaryJson: StructuredAiSummary | null;
  healthRecordId: string | null;
  createdAt: string;
}

export function OcrResultsPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { pushToast, t } = useAuth();

  const [documents, setDocuments] = useState<MedicalDocDetail[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<MedicalDocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningOcr, setRunningOcr] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  const [verifiedText, setVerifiedText] = useState('');
  const [recordForm, setRecordForm] = useState({
    title: '',
    category: 'Prescription' as RecordCategory,
    visitDate: new Date().toISOString().slice(0, 10),
    doctorName: '',
    hospitalName: '',
    diagnosis: '',
    medicationDetails: '',
    laboratoryResults: '',
  });

  const hydrateSelection = useCallback((doc: MedicalDocDetail | null) => {
    setSelectedDoc(doc);
    if (doc) {
      setVerifiedText(doc.ocrVerifiedText || doc.ocrRawText || '');
      setRecordForm((prev) => ({
        ...prev,
        title: doc.originalFileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
      }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/documents')
      .then((res) => {
        if (cancelled) return;
        const list = (res.data.documents || []) as MedicalDocDetail[];
        setDocuments(list);
        const target = id ? list.find((d) => d.id === id) || list[0] || null : list[0] || null;
        hydrateSelection(target);
      })
      .catch((err) => {
        if (!cancelled) pushToast('error', extractApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, hydrateSelection, pushToast]);

  const handleRunOcr = async () => {
    if (!selectedDoc) return;
    setRunningOcr(true);
    try {
      const { data } = await api.post(`/documents/${selectedDoc.id}/ocr`);
      const updated = data.document as MedicalDocDetail;
      setSelectedDoc((prev) => (prev ? { ...prev, ...updated } : updated));
      setVerifiedText(updated.ocrVerifiedText || updated.ocrRawText || '');
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      pushToast('success', 'OCR text extracted. Please review and verify before saving.');
    } catch (err) {
      pushToast('error', extractApiError(err, 'OCR extraction failed.'));
    } finally {
      setRunningOcr(false);
    }
  };

  const handleSaveVerifiedText = async () => {
    if (!selectedDoc || !verifiedText.trim()) return;
    setSavingVerification(true);
    try {
      const { data } = await api.put(`/documents/${selectedDoc.id}/ocr`, {
        ocrVerifiedText: verifiedText,
      });
      setSelectedDoc((prev) => (prev ? { ...prev, ...data.document } : data.document));
      pushToast('success', 'Verified OCR text saved.');
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setSavingVerification(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!selectedDoc) return;
    setGeneratingAi(true);
    try {
      if (verifiedText.trim() && verifiedText !== selectedDoc.ocrVerifiedText) {
        await api.put(`/documents/${selectedDoc.id}/ocr`, { ocrVerifiedText: verifiedText });
      }
      const { data } = await api.post(`/documents/${selectedDoc.id}/ai-summary`);
      setSelectedDoc((prev) =>
        prev ? { ...prev, aiSummaryJson: data.summary } : prev
      );
      pushToast('success', 'Structured Gemini AI summary generated.');
    } catch (err) {
      pushToast('error', extractApiError(err, 'AI summary failed.'));
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSaveAsHealthRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setSavingRecord(true);
    try {
      const { data } = await api.post(`/documents/${selectedDoc.id}/save-record`, {
        ...recordForm,
        doctorName: recordForm.doctorName.trim() || null,
        hospitalName: recordForm.hospitalName.trim() || null,
        diagnosis: recordForm.diagnosis.trim() || null,
        medicationDetails: recordForm.medicationDetails.trim() || null,
        laboratoryResults: recordForm.laboratoryResults.trim() || null,
        ocrVerifiedText: verifiedText,
      });
      pushToast('success', 'Verified document saved as a linked health record.');
      navigate(`/worker/records/${data.record.id}`);
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to save as health record.'));
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <AppShell
      breadcrumb="Worker / OCR & Verification"
      title={t.navOcrResults}
      action={
        <Link
          to="/worker/documents/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B] whitespace-nowrap"
        >
          <UploadCloud className="h-4 w-4" />
          Upload New
        </Link>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <FileScan className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-[#0F1E2E]">
            No uploaded medical documents found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Upload a prescription photo or PDF laboratory report to extract text using OCR.
          </p>
          <Link
            to="/worker/documents/upload"
            className="mt-5 inline-block rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
          >
            Upload Medical Document
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Document Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="ocr-doc-select" className="text-xs font-medium text-slate-600">
                Active Document:
              </label>
              <select
                id="ocr-doc-select"
                value={selectedDoc?.id || ''}
                onChange={(e) => {
                  const found = documents.find((d) => d.id === e.target.value) || null;
                  hydrateSelection(found);
                  if (found) navigate(`/worker/documents/${found.id}/ocr`, { replace: true });
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F1E2E]"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.originalFileName} ({doc.processingStatus.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>

            {selectedDoc && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunOcr}
                  disabled={runningOcr}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B] disabled:opacity-60 whitespace-nowrap"
                >
                  {runningOcr ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileScan className="h-3.5 w-3.5" />
                  )}
                  {runningOcr ? 'Extracting Text...' : t.runOcrBtn}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAiSummary}
                  disabled={generatingAi || !verifiedText.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {generatingAi ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-[#0D7A6F]" />
                  )}
                  {t.generateSummaryBtn}
                </button>
              </div>
            )}
          </div>

          {selectedDoc && (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left: Private document preview */}
                <div className="lg:col-span-6">
                  <PrivateDocumentViewer
                    documentId={selectedDoc.id}
                    fileName={selectedDoc.originalFileName}
                    mimeType={selectedDoc.mimeType}
                  />
                </div>

                {/* Right: Manual OCR Verification */}
                <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                        OCR Result Preview & Manual Verification
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Engine: {selectedDoc.ocrEngine || 'gemini-multimodal'} · Status:{' '}
                        {selectedDoc.processingStatus.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {selectedDoc.processingStatus === 'OCR_VERIFIED' && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    )}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-600">
                    Review the extracted text carefully against your original document. Correct any{' '}
                    <span className="font-mono">[illegible]</span> words before saving. Unreadable
                    values are never fabricated.
                  </p>

                  <textarea
                    rows={12}
                    value={verifiedText}
                    onChange={(e) => setVerifiedText(e.target.value)}
                    placeholder='Click "Extract Text (OCR)" above to transcribe this document.'
                    className="mt-3 w-full flex-1 rounded-lg border border-slate-300 bg-slate-50/40 p-3.5 font-mono text-xs leading-relaxed text-[#0F1E2E]"
                  />

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    {selectedDoc.healthRecordId ? (
                      <Link
                        to={`/worker/records/${selectedDoc.healthRecordId}`}
                        className="text-xs font-medium text-[#0D7A6F] hover:underline"
                      >
                        Linked to Health Record →
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">Not yet saved as a record</span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveVerifiedText}
                      disabled={savingVerification || !verifiedText.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50 disabled:opacity-50"
                    >
                      {savingVerification ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Approve & Save Verified Text
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Summary Output if generated */}
              {selectedDoc.aiSummaryJson && (
                <AiSummaryView
                  summary={selectedDoc.aiSummaryJson}
                  onRegenerate={handleGenerateAiSummary}
                  regenerating={generatingAi}
                />
              )}

              {/* Save Verified OCR as Structured Health Record */}
              <form
                onSubmit={handleSaveAsHealthRecord}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <h3 className="font-display text-base font-semibold text-[#0F1E2E]">
                  Save Verified Document as Health Record
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Attaches this private document, your verified OCR text, and any AI summary to a
                  permanent PostgreSQL health record.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Record Title *</label>
                    <input
                      type="text"
                      required
                      value={recordForm.title}
                      onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Category *</label>
                    <select
                      value={recordForm.category}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, category: e.target.value as RecordCategory })
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {RECORD_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Visit Date *</label>
                    <input
                      type="date"
                      required
                      value={recordForm.visitDate}
                      onChange={(e) => setRecordForm({ ...recordForm, visitDate: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Doctor Name</label>
                    <input
                      type="text"
                      value={recordForm.doctorName}
                      onChange={(e) => setRecordForm({ ...recordForm, doctorName: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Hospital / Clinic
                    </label>
                    <input
                      type="text"
                      value={recordForm.hospitalName}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, hospitalName: e.target.value })
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Explicit Diagnosis (if stated)
                    </label>
                    <input
                      type="text"
                      value={recordForm.diagnosis}
                      onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingRecord}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
                  >
                    {savingRecord && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Verified Record
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
