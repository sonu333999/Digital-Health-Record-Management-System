import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';

interface RequestRow {
  id: string;
  permittedCategories: string[];
  purpose: string | null;
  status: string;
  requestedAt: string;
  grantedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  worker: {
    id: string;
    workerCode: string;
    fullName: string;
    district: string | null;
  };
}

export function AccessRequestsPage() {
  const { pushToast, t } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/provider/requests')
      .then((res) => {
        if (!cancelled) setRequests(res.data.requests || []);
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

  return (
    <AppShell
      breadcrumb="Provider / Access Requests"
      title={t.navAccessRequests}
      action={
        <Link
          to="/provider/search"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B] whitespace-nowrap"
        >
          <Search className="h-3.5 w-3.5" />
          New Request
        </Link>
      }
    >
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
          </div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-[#0F1E2E]">No consent requests submitted yet</p>
            <Link
              to="/provider/search"
              className="mt-4 inline-block rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white"
            >
              Search Workers to Request Access
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-5 py-3">Worker</th>
                  <th className="px-5 py-3">Permitted Categories</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Consent Expiry</th>
                  <th className="px-5 py-3 text-right">Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#0F1E2E]">{req.worker.fullName}</p>
                      <p className="font-mono text-xs text-slate-500 tabular-nums">
                        {req.worker.workerCode} · {req.worker.district || 'Kerala'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs">
                      {req.permittedCategories.join(', ')}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold">
                      <span
                        className={
                          req.status === 'ACTIVE'
                            ? 'text-emerald-700'
                            : req.status === 'PENDING'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {new Date(req.expiresAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {req.status === 'ACTIVE' ? (
                        <Link
                          to={`/provider/workers/${req.worker.id}/records`}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#0D7A6F] hover:bg-[#EEF7F6]"
                        >
                          Open Records
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Blocked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
