import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { AiSummaryView } from '../../components/AiSummaryView.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import { AI_SUMMARY_DISCLAIMER } from '../../shared/constants.ts';
import type { StructuredAiSummary } from '../../db/schema.ts';

interface SummaryRecordRow {
  id: string;
  title: string;
  category: string;
  visitDate: string;
  hospitalName: string | null;
  aiSummaryJson: StructuredAiSummary | null;
}

export function AiSummaryPage() {
  const { pushToast, t } = useAuth();
  const [records, setRecords] = useState<SummaryRecordRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/worker/records')
      .then((res) => {
        if (cancelled) return;
        const list = (res.data.records || []) as SummaryRecordRow[];
        setRecords(list);
        const firstWithSummary = list.find((r) => r.aiSummaryJson) || list[0];
        if (firstWithSummary) setSelectedId(firstWithSummary.id);
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
  }, [pushToast]);

  const selectedRecord = records.find((r) => r.id === selectedId) || null;

  const handleGenerate = async (recordId: string) => {
    setGeneratingId(recordId);
    try {
      const { data } = await api.post(`/worker/records/${recordId}/ai-summary`);
      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, aiSummaryJson: data.summary } : r))
      );
      setSelectedId(recordId);
      pushToast('success', 'AI summary generated and persisted in PostgreSQL.');
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to generate AI summary.'));
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <AppShell breadcrumb="Worker / AI Health Summaries" title={t.navAiSummaries}>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-xs leading-relaxed text-amber-950">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p>{AI_SUMMARY_DISCLAIMER}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-[#0F1E2E]">No health records available yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Add a health record or upload an OCR document first to generate structured Gemini AI
            summaries.
          </p>
          <Link
            to="/worker/records/new"
            className="mt-4 inline-block rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
          >
            Add Health Record
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Record Selector Sidebar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-4">
            <h2 className="px-2 pb-3 text-xs font-semibold text-slate-500">
              Select Record to Summarize
            </h2>
            <div className="space-y-1.5">
              {records.map((rec) => {
                const active = rec.id === selectedId;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedId(rec.id)}
                    className={`w-full rounded-lg border px-3.5 py-3 text-left transition-colors ${
                      active
                        ? 'border-[#0D7A6F] bg-[#EEF7F6]'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-[#0F1E2E]">{rec.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      {rec.category} · {rec.visitDate} ·{' '}
                      {rec.aiSummaryJson ? 'Summarized' : 'Not summarized'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-8">
            {selectedRecord?.aiSummaryJson ? (
              <AiSummaryView
                summary={selectedRecord.aiSummaryJson}
                onRegenerate={() => handleGenerate(selectedRecord.id)}
                regenerating={generatingId === selectedRecord.id}
              />
            ) : selectedRecord ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-[#0D7A6F]" />
                <h3 className="mt-3 font-display text-base font-semibold text-[#0F1E2E]">
                  {selectedRecord.title}
                </h3>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-600">
                  Generate a structured summary highlighting observations, explicit diagnoses,
                  medicines, lab values, and missing information directly from your stored record.
                </p>
                <button
                  type="button"
                  onClick={() => handleGenerate(selectedRecord.id)}
                  disabled={generatingId === selectedRecord.id}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
                >
                  {generatingId === selectedRecord.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {t.generateSummaryBtn}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </AppShell>
  );
}
