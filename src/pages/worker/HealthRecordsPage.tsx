import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FilePlus2,
  Loader2,
  Paperclip,
  Pencil,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { ConfirmModal } from '../../components/ConfirmModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import { RECORD_CATEGORIES } from '../../shared/constants.ts';

interface HealthRecordItem {
  id: string;
  title: string;
  category: string;
  diagnosis: string | null;
  doctorName: string | null;
  hospitalName: string | null;
  visitDate: string;
  createdByRole: string;
  aiSummaryJson: unknown | null;
  attachments: Array<{ id: string; originalFileName: string }>;
}

export function HealthRecordsPage() {
  const { t, pushToast } = useAuth();
  const [records, setRecords] = useState<HealthRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [deleteTarget, setDeleteTarget] = useState<HealthRecordItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/worker/records', {
        params: { search: search || undefined, category, sort },
      });
      setRecords(data.records || []);
    } catch (err) {
      pushToast('error', extractApiError(err, 'Failed to fetch health records.'));
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, pushToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecords();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadRecords]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/worker/records/${deleteTarget.id}`);
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      pushToast('success', 'Health record deleted permanently.');
      setDeleteTarget(null);
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to delete health record.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell
      breadcrumb="Worker / Health Records"
      title={t.navHealthRecords}
      action={
        <Link
          to="/worker/records/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B] whitespace-nowrap shrink-0"
        >
          <FilePlus2 className="h-4 w-4" />
          {t.navAddRecord}
        </Link>
      }
    >
      {/* Search, Filter & Sort Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by category"
            >
              <option value="ALL">{t.allCategories}</option>
              {RECORD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Sort by date"
            >
              <option value="newest">{t.newestFirst}</option>
              <option value="oldest">{t.oldestFirst}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
          </div>
        ) : records.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-[#0F1E2E]">{t.noDataYet}</p>
            <p className="mt-1 text-xs text-slate-500">
              Add a record manually or upload a scanned prescription/lab report for OCR extraction.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                to="/worker/records/new"
                className="rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
              >
                {t.navAddRecord}
              </Link>
              <Link
                to="/worker/documents/upload"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
              >
                {t.navUploadDocument}
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-5 py-3">Record Title</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Hospital / Clinician</th>
                  <th className="px-5 py-3">Visit Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/worker/records/${rec.id}`}
                        className="font-medium text-[#0F1E2E] hover:text-[#0D7A6F]"
                      >
                        {rec.title}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        {rec.diagnosis && <span className="truncate max-w-xs">{rec.diagnosis}</span>}
                        {rec.attachments?.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#0D7A6F]">
                            <Paperclip className="h-3 w-3" />
                            {rec.attachments.length}
                          </span>
                        )}
                        {Boolean(rec.aiSummaryJson) && (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Sparkles className="h-3 w-3 text-[#0D7A6F]" />
                            AI Summary
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                      {rec.category}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <p className="font-medium text-slate-800">{rec.hospitalName || '—'}</p>
                      <p className="text-slate-500">{rec.doctorName || 'Self-recorded'}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {rec.visitDate}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/worker/records/${rec.id}`}
                          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                        <Link
                          to={`/worker/records/${rec.id}/edit`}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-[#0F1E2E]"
                          aria-label={`Edit ${rec.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${rec.title}`}
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

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Health Record"
        description={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Record"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
