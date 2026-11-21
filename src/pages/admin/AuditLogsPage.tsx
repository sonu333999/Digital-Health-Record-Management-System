import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';

interface AuditLogRow {
  id: string;
  actorUserId: string | null;
  actorRole: string;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetWorkerId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const COMMON_ACTIONS = [
  'USER_REGISTERED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'HEALTH_RECORD_CREATED',
  'HEALTH_RECORD_UPDATED',
  'HEALTH_RECORD_DELETED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_VIEWED',
  'DOCUMENT_OCR_COMPLETED',
  'AI_SUMMARY_GENERATED',
  'CONSENT_REQUESTED',
  'CONSENT_GRANTED',
  'CONSENT_APPROVED',
  'CONSENT_REJECTED',
  'CONSENT_REVOKED',
  'PROVIDER_RECORDS_VIEWED',
  'EMERGENCY_QR_GENERATED',
  'EMERGENCY_QR_REVOKED',
  'EMERGENCY_PROFILE_ACCESSED',
  'EVALUATION_ROLE_SWITCHED',
];

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function summarizeDetails(details: Record<string, unknown> | null) {
  if (!details || Object.keys(details).length === 0) return '—';
  return Object.entries(details)
    .slice(0, 4)
    .map(([key, val]) => {
      const formatted =
        Array.isArray(val) ? val.join(', ') : typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val);
      return `${key}: ${formatted}`;
    })
    .join(' · ');
}

export function AuditLogsPage() {
  const { t, pushToast } = useAuth();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (actionFilter !== 'ALL') params.action = actionFilter;

      const res = await api.get<{ logs: AuditLogRow[] }>('/admin/audit-logs', { params });
      setLogs(res.data.logs);
    } catch (error) {
      pushToast('error', extractApiError(error));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, actionFilter, pushToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  return (
    <AppShell
      breadcrumb="Administrator / Security"
      title={t.navAuditLogs}
      action={
        <button
          type="button"
          onClick={() => loadLogs()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action, actor email, or resource..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-[#0F1E2E] placeholder:text-slate-400 focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/15"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by actor role"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0F1E2E] focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/15"
              >
                <option value="ALL">All Actor Roles</option>
                <option value="WORKER">Worker</option>
                <option value="PROVIDER">Provider</option>
                <option value="ADMIN">Admin</option>
                <option value="PUBLIC_EMERGENCY">Public Emergency QR</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                aria-label="Filter by event action"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0F1E2E] focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/15"
              >
                <option value="ALL">All Security Events</option>
                {COMMON_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-[#0F1E2E]">Immutable Access & Action Log</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              Showing latest {logs.length} events
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-[#0D7A6F]" />
              <span>{t.loadingText}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No audit events match your selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Actor</th>
                    <th className="px-6 py-3">Event Action</th>
                    <th className="px-6 py-3">Resource</th>
                    <th className="px-6 py-3">Details</th>
                    <th className="px-6 py-3">Source IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((entry) => (
                    <tr key={entry.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-xs font-semibold text-[#0F1E2E]">{entry.actorRole}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {entry.actorEmail || 'Public QR Scan'}
                        </p>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs font-medium text-[#0D7A6F] whitespace-nowrap">
                        {entry.action}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                        <p className="font-medium">{entry.resourceType}</p>
                        {entry.resourceId && (
                          <p className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                            {entry.resourceId.slice(0, 12)}…
                          </p>
                        )}
                      </td>
                      <td className="max-w-xs px-6 py-3.5 text-xs leading-relaxed text-slate-600">
                        {summarizeDetails(entry.details)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {entry.ipAddress || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
