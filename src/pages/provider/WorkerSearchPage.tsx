import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Send } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import { RECORD_CATEGORIES } from '../../shared/constants.ts';

interface SearchWorkerRow {
  id: string;
  workerCode: string;
  fullName: string;
  district: string | null;
  preferredLanguage: string;
  originState: string | null;
  consent: {
    id: string;
    status: string;
    expiresAt: string;
  } | null;
}

export function WorkerSearchPage() {
  const { pushToast, t } = useAuth();
  const [query, setQuery] = useState('');
  const [workers, setWorkers] = useState<SearchWorkerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Request Modal State
  const [requestTarget, setRequestTarget] = useState<SearchWorkerRow | null>(null);
  const [categories, setCategories] = useState<string[]>([
    'General Checkup',
    'Prescription',
    'Laboratory Report',
  ]);
  const [purpose, setPurpose] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [canAddRecords, setCanAddRecords] = useState(true);
  const [canEditRecords, setCanEditRecords] = useState(false);
  const [sending, setSending] = useState(false);

  const searchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/provider/workers/search', {
        params: { q: query.trim() || undefined },
      });
      setWorkers(data.workers || []);
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [query, pushToast]);

  useEffect(() => {
    const timer = setTimeout(searchWorkers, 250);
    return () => clearTimeout(timer);
  }, [searchWorkers]);

  const toggleCat = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTarget || categories.length === 0) return;
    setSending(true);
    try {
      await api.post('/provider/requests', {
        workerId: requestTarget.id,
        permittedCategories: categories,
        purpose: purpose.trim(),
        durationDays,
        canAddRecords,
        canEditRecords,
      });
      pushToast('success', `Consent request sent to ${requestTarget.fullName}.`);
      setRequestTarget(null);
      setPurpose('');
      await searchWorkers();
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to send access request.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell breadcrumb="Provider / Worker Search" title={t.navWorkerSearch}>
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label htmlFor="worker-search-input" className="block text-xs font-medium text-slate-700">
            Search by Worker Health ID (e.g. CB-KL-2026-1001), Name, or Phone
          </label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
            <input
              id="worker-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="CB-KL-2026-1001 or Ramesh Mandal..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pr-4 pl-10 text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Privacy Protection: Search displays non-clinical identifiers only. Medical history and
            documents remain locked until the worker explicitly grants consent.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
            </div>
          ) : workers.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              No registered workers matched your search.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Worker Health ID</th>
                    <th className="px-5 py-3">Full Name</th>
                    <th className="px-5 py-3">Kerala District</th>
                    <th className="px-5 py-3">Consent Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-[#0F1E2E] tabular-nums">
                        {w.workerCode}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#0F1E2E]">{w.fullName}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {w.district || '—'} · Lang: {w.preferredLanguage.toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold">
                        {w.consent ? (
                          <span
                            className={
                              w.consent.status === 'ACTIVE'
                                ? 'text-emerald-700'
                                : w.consent.status === 'PENDING'
                                  ? 'text-amber-700'
                                  : 'text-slate-500'
                            }
                          >
                            {w.consent.status}
                          </span>
                        ) : (
                          <span className="text-slate-500">No Consent</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {w.consent?.status === 'ACTIVE' ? (
                          <Link
                            to={`/provider/workers/${w.id}/records`}
                            className="rounded-lg bg-[#0D7A6F] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
                          >
                            View Authorized Records
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRequestTarget(w)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
                          >
                            <Send className="h-3.5 w-3.5 text-[#0D7A6F]" />
                            Request Access
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Access Request Modal */}
      {requestTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1E2E]/45 px-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSendRequest}
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="font-display text-lg font-semibold text-[#0F1E2E]">
              Request Record Consent from {requestTarget.fullName}
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-500">{requestTarget.workerCode}</p>

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-700">Requested Categories *</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {RECORD_CATEGORIES.map((cat) => {
                  const checked = categories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                        checked
                          ? 'border-[#0D7A6F] bg-[#EEF7F6] text-[#0F1E2E]'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCat(cat)}
                        className="h-3.5 w-3.5 text-[#0D7A6F]"
                      />
                      <span className="truncate">{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Access Duration (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="flex flex-col justify-end gap-1.5 text-xs text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={canAddRecords}
                    onChange={(e) => setCanAddRecords(e.target.checked)}
                  />
                  Request permission to add records
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={canEditRecords}
                    onChange={(e) => setCanEditRecords(e.target.checked)}
                  />
                  Request permission to update records
                </label>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700">
                Clinical Purpose *
              </label>
              <textarea
                rows={2}
                required
                minLength={4}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Outpatient follow-up and prescription review"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRequestTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || categories.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
              >
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send Consent Request
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
