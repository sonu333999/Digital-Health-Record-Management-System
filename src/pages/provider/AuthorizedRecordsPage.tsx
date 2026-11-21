import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FilePlus2, Loader2, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { AiSummaryView } from '../../components/AiSummaryView.tsx';
import { PrivateDocumentViewer } from '../../components/PrivateDocumentViewer.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import type { StructuredAiSummary } from '../../db/schema.ts';

interface AuthorizedWorkerSummary {
  id: string;
  workerCode: string;
  fullName: string;
  district: string | null;
  bloodGroup: string | null;
  knownAllergies: string | null;
  chronicConditions: string | null;
  consent: {
    id: string;
    permittedCategories: string[];
    canAddRecords: boolean;
    canEditRecords: boolean;
    expiresAt: string;
  };
}

interface ProviderRecordRow {
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
  attachments: Array<{
    id: string;
    originalFileName: string;
    mimeType: string;
    ocrVerifiedText: string | null;
  }>;
}

export function AuthorizedRecordsPage() {
  const { workerId } = useParams<{ workerId?: string }>();
  const navigate = useNavigate();
  const { pushToast, t } = useAuth();

  const [workers, setWorkers] = useState<AuthorizedWorkerSummary[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workerId || '');
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  const [loadingRecords, setLoadingRecords] = useState(false);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(null);
  const [workerDetail, setWorkerDetail] = useState<AuthorizedWorkerSummary | null>(null);
  const [records, setRecords] = useState<ProviderRecordRow[]>([]);

  // Add / Edit Record Drawer Modal
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({
    title: '',
    category: '',
    visitDate: new Date().toISOString().slice(0, 10),
    diagnosis: '',
    prescriptionDetails: '',
    medicationDetails: '',
    laboratoryResults: '',
    medicalNotes: '',
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingWorkers(true);
    api
      .get('/provider/authorized-workers')
      .then((res) => {
        if (cancelled) return;
        const list = (res.data.authorizedWorkers || []) as AuthorizedWorkerSummary[];
        setWorkers(list);
        if (!workerId && list.length > 0) {
          setSelectedWorkerId(list[0].id);
        } else if (workerId) {
          setSelectedWorkerId(workerId);
        }
      })
      .catch((err) => {
        if (!cancelled) pushToast('error', extractApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workerId, pushToast]);

  const loadWorkerRecords = useCallback(async (targetId: string) => {
    if (!targetId) return;
    setLoadingRecords(true);
    setAccessDeniedMsg(null);
    try {
      const { data } = await api.get(`/provider/workers/${targetId}/records`);
      setWorkerDetail({ ...data.worker, consent: data.consent });
      setRecords(data.records || []);
      const defaultCat = data.consent?.permittedCategories?.[0] || 'General Checkup';
      setRecordForm((prev) => ({ ...prev, category: prev.category || defaultCat }));
    } catch (err) {
      setWorkerDetail(null);
      setRecords([]);
      setAccessDeniedMsg(extractApiError(err, 'Consent required to access worker records.'));
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWorkerId) {
      loadWorkerRecords(selectedWorkerId);
    }
  }, [selectedWorkerId, loadWorkerRecords]);

  const openAddForm = () => {
    const firstCat = workerDetail?.consent.permittedCategories[0] || 'General Checkup';
    setEditingRecordId(null);
    setRecordForm({
      title: '',
      category: firstCat,
      visitDate: new Date().toISOString().slice(0, 10),
      diagnosis: '',
      prescriptionDetails: '',
      medicationDetails: '',
      laboratoryResults: '',
      medicalNotes: '',
    });
    setShowRecordForm(true);
  };

  const openEditForm = (rec: ProviderRecordRow) => {
    setEditingRecordId(rec.id);
    setRecordForm({
      title: rec.title,
      category: rec.category,
      visitDate: rec.visitDate,
      diagnosis: rec.diagnosis || '',
      prescriptionDetails: rec.prescriptionDetails || '',
      medicationDetails: rec.medicationDetails || '',
      laboratoryResults: rec.laboratoryResults || '',
      medicalNotes: rec.medicalNotes || '',
    });
    setShowRecordForm(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;
    setSavingRecord(true);
    try {
      const payload = {
        ...recordForm,
        diagnosis: recordForm.diagnosis.trim() || null,
        prescriptionDetails: recordForm.prescriptionDetails.trim() || null,
        medicationDetails: recordForm.medicationDetails.trim() || null,
        laboratoryResults: recordForm.laboratoryResults.trim() || null,
        medicalNotes: recordForm.medicalNotes.trim() || null,
      };
      if (editingRecordId) {
        await api.put(`/provider/workers/${selectedWorkerId}/records/${editingRecordId}`, payload);
        pushToast('success', 'Permitted health record updated.');
      } else {
        await api.post(`/provider/workers/${selectedWorkerId}/records`, payload);
        pushToast('success', 'New clinical record added for worker.');
      }
      setShowRecordForm(false);
      await loadWorkerRecords(selectedWorkerId);
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to save clinical record.'));
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <AppShell
      breadcrumb="Provider / Authorized Worker Records"
      title={t.navAuthorizedRecords}
      action={
        workerDetail?.consent.canAddRecords ? (
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B] whitespace-nowrap"
          >
            <FilePlus2 className="h-4 w-4" />
            Add Permitted Record
          </button>
        ) : undefined
      }
    >
      {loadingWorkers ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : workers.length === 0 && !workerId ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-[#0F1E2E]">No active consented workers</p>
          <p className="mt-1 text-xs text-slate-500">
            Request worker consent from Worker Search to inspect permitted records.
          </p>
          <Link
            to="/provider/search"
            className="mt-4 inline-block rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white"
          >
            Go to Worker Search
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Worker Switcher */}
          {workers.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <label htmlFor="auth-worker-select" className="text-xs font-medium text-slate-600">
                Authorized Worker:
              </label>
              <select
                id="auth-worker-select"
                value={selectedWorkerId}
                onChange={(e) => {
                  setSelectedWorkerId(e.target.value);
                  navigate(`/provider/workers/${e.target.value}/records`, { replace: true });
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F1E2E]"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.workerCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingRecords ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
            </div>
          ) : accessDeniedMsg ? (
            <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-red-700" />
              <h2 className="mt-3 font-display text-base font-semibold text-[#0F1E2E]">
                Consent Required
              </h2>
              <p className="mt-1 text-sm text-slate-600">{accessDeniedMsg}</p>
              <Link
                to="/provider/search"
                className="mt-4 inline-block rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white"
              >
                Request Access
              </Link>
            </div>
          ) : workerDetail ? (
            <>
              {/* Active Consent Banner & Worker Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#0F1E2E]">
                      {workerDetail.fullName}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                      {workerDetail.workerCode} · District: {workerDetail.district || 'Kerala'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <span className="font-medium tabular-nums">
                      Consent valid until{' '}
                      {new Date(workerDetail.consent.expiresAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Blood Group</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#0F1E2E]">
                      {workerDetail.bloodGroup || 'Not recorded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Known Allergies</p>
                    <p className="mt-0.5 text-sm font-medium text-red-800">
                      {workerDetail.knownAllergies || 'None reported'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Chronic Conditions</p>
                    <p className="mt-0.5 text-sm font-medium text-[#0F1E2E]">
                      {workerDetail.chronicConditions || 'None reported'}
                    </p>
                  </div>
                </div>

                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  Permitted Categories: {workerDetail.consent.permittedCategories.join(', ')}
                </p>
              </div>

              {/* Permitted Records List */}
              {records.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  No health records found within the worker's approved categories.
                </div>
              ) : (
                <div className="space-y-6">
                  {records.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-slate-200 bg-white p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            {rec.category} ·{' '}
                            <span className="font-mono tabular-nums">{rec.visitDate}</span> ·{' '}
                            {rec.hospitalName || 'Clinic not specified'}
                          </p>
                          <h3 className="mt-1 font-display text-base font-semibold text-[#0F1E2E]">
                            {rec.title}
                          </h3>
                        </div>
                        {workerDetail.consent.canEditRecords && (
                          <button
                            type="button"
                            onClick={() => openEditForm(rec)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Update Record
                          </button>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-slate-500">Diagnosis / Observation</p>
                          <p className="mt-1 text-[#0F1E2E]">{rec.diagnosis || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Medications</p>
                          <p className="mt-1 text-[#0F1E2E]">{rec.medicationDetails || '—'}</p>
                        </div>
                        {rec.prescriptionDetails && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-slate-500">Prescription</p>
                            <p className="mt-1 whitespace-pre-line text-[#0F1E2E]">
                              {rec.prescriptionDetails}
                            </p>
                          </div>
                        )}
                        {rec.laboratoryResults && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-slate-500">Laboratory Results</p>
                            <p className="mt-1 whitespace-pre-line text-[#0F1E2E]">
                              {rec.laboratoryResults}
                            </p>
                          </div>
                        )}
                        {rec.medicalNotes && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-slate-500">Clinical Notes</p>
                            <p className="mt-1 text-slate-700">{rec.medicalNotes}</p>
                          </div>
                        )}
                      </div>

                      {rec.ocrExtractedText && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <p className="text-xs font-semibold text-slate-600">
                            OCR Extracted Source Text
                          </p>
                          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                            {rec.ocrExtractedText}
                          </pre>
                        </div>
                      )}

                      {rec.aiSummaryJson && (
                        <div className="mt-4">
                          <AiSummaryView summary={rec.aiSummaryJson} />
                        </div>
                      )}

                      {rec.attachments && rec.attachments.length > 0 && (
                        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                          <p className="text-xs font-semibold text-slate-600">
                            Permitted Private Document Attachments
                          </p>
                          {rec.attachments.map((att) => (
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
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Provider Add / Edit Permitted Record Modal */}
      {showRecordForm && workerDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0F1E2E]/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveRecord}
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="font-display text-lg font-semibold text-[#0F1E2E]">
              {editingRecordId ? 'Update Permitted Health Record' : 'Add Clinical Record'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Restricted to approved categories: {workerDetail.consent.permittedCategories.join(', ')}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Title *</label>
                <input
                  type="text"
                  required
                  value={recordForm.title}
                  onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Permitted Category *
                </label>
                <select
                  value={recordForm.category}
                  onChange={(e) => setRecordForm({ ...recordForm, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {workerDetail.consent.permittedCategories.map((c) => (
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Diagnosis</label>
                <input
                  type="text"
                  value={recordForm.diagnosis}
                  onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Prescription</label>
                <textarea
                  rows={2}
                  value={recordForm.prescriptionDetails}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, prescriptionDetails: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  Medications & Lab Findings
                </label>
                <textarea
                  rows={2}
                  value={recordForm.laboratoryResults}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, laboratoryResults: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRecordForm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRecord}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
              >
                {savingRecord && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Clinical Record
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
