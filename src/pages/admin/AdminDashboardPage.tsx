import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Building2,
  FileText,
  FolderLock,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Users,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';

interface AdminStatsPayload {
  stats: {
    totalWorkers: number;
    totalProviders: number;
    activeUsers: number;
    totalHealthRecords: number;
    totalDocuments: number;
    activeConsents: number;
    emergencyScans: number;
  };
  categoryBreakdown: Array<{ category: string; count: number }>;
  districtBreakdown: Array<{ district: string; count: number }>;
  recentActivities: Array<{
    id: string;
    actorRole: string;
    actorEmail: string | null;
    action: string;
    resourceType: string;
    createdAt: string;
  }>;
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminDashboardPage() {
  const { t, pushToast } = useAuth();
  const [data, setData] = useState<AdminStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api.get<AdminStatsPayload>('/admin/stats');
        setData(res.data);
      } catch (error) {
        pushToast('error', extractApiError(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const maxCategoryCount = Math.max(
    1,
    ...(data?.categoryBreakdown.map((item) => item.count) ?? [1])
  );
  const maxDistrictCount = Math.max(
    1,
    ...(data?.districtBreakdown.map((item) => item.count) ?? [1])
  );

  return (
    <AppShell
      breadcrumb="Administrator / Overview"
      title={t.navDashboard}
      action={
        <button
          type="button"
          onClick={() => loadStats(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {loading || !data ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#0D7A6F]" />
            <span>{t.loadingText}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Privacy Governance Statement */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF7F6] text-[#0D7A6F]">
                  <ShieldOff className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#0F1E2E]">
                    Strict Administrative Privacy Isolation
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
                    System administrators view aggregate health-system metrics, account directory
                    metadata, and security audit trails only. Private medical records, OCR
                    transcriptions, AI summaries, and uploaded clinical attachments remain
                    inaccessible to administrative accounts.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/admin/users"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <span>Manage Users</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Primary KPI Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wide">Total Workers</span>
                <Users className="h-4 w-4 text-[#0D7A6F]" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#0F1E2E] tabular-nums">
                {data.stats.totalWorkers}
              </p>
              <p className="mt-1 text-xs text-slate-500">Registered migrant worker vaults</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wide">
                  Healthcare Providers
                </span>
                <Building2 className="h-4 w-4 text-[#0D7A6F]" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#0F1E2E] tabular-nums">
                {data.stats.totalProviders}
              </p>
              <p className="mt-1 text-xs text-slate-500">Clinics & physicians in directory</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wide">Health Records</span>
                <FileText className="h-4 w-4 text-[#0D7A6F]" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#0F1E2E] tabular-nums">
                {data.stats.totalHealthRecords}
              </p>
              <p className="mt-1 text-xs text-slate-500">Encrypted clinical records stored</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wide">Active Consents</span>
                <ShieldCheck className="h-4 w-4 text-[#0D7A6F]" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#0F1E2E] tabular-nums">
                {data.stats.activeConsents}
              </p>
              <p className="mt-1 text-xs text-slate-500">Time-bound provider grants active</p>
            </div>
          </div>

          {/* Secondary Operational Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Active User Accounts</p>
                <p className="mt-1 text-2xl font-bold text-[#0F1E2E] tabular-nums">
                  {data.stats.activeUsers}
                </p>
              </div>
              <Users className="h-5 w-5 text-slate-400" />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Private Medical Documents</p>
                <p className="mt-1 text-2xl font-bold text-[#0F1E2E] tabular-nums">
                  {data.stats.totalDocuments}
                </p>
              </div>
              <FolderLock className="h-5 w-5 text-slate-400" />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Emergency QR Views</p>
                <p className="mt-1 text-2xl font-bold text-[#0F1E2E] tabular-nums">
                  {data.stats.emergencyScans}
                </p>
              </div>
              <QrCode className="h-5 w-5 text-slate-400" />
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#0F1E2E]">
                  Records by Clinical Category
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {data.stats.totalHealthRecords} total
                </span>
              </div>
              {data.categoryBreakdown.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No health records recorded yet.</p>
              ) : (
                <div className="mt-5 space-y-3.5">
                  {data.categoryBreakdown.map((item) => {
                    const widthPct = Math.max(6, Math.round((item.count / maxCategoryCount) * 100));
                    return (
                      <div key={item.category}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{item.category}</span>
                          <span className="font-mono text-xs text-slate-600 tabular-nums">
                            {item.count}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#0D7A6F]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#0F1E2E]">
                  Workers by Kerala District
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {data.stats.totalWorkers} total
                </span>
              </div>
              {data.districtBreakdown.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No worker profiles registered yet.</p>
              ) : (
                <div className="mt-5 space-y-3.5">
                  {data.districtBreakdown.map((item) => {
                    const widthPct = Math.max(6, Math.round((item.count / maxDistrictCount) * 100));
                    return (
                      <div key={item.district}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{item.district}</span>
                          <span className="font-mono text-xs text-slate-600 tabular-nums">
                            {item.count}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#1E3A5F]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Recent Audit Activity */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-[#0D7A6F]" />
                <h2 className="text-base font-semibold text-[#0F1E2E]">Recent System Activity</h2>
              </div>
              <Link
                to="/admin/audit-logs"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0D7A6F] hover:text-[#0A645B] whitespace-nowrap shrink-0"
              >
                <span>View full audit log</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {data.recentActivities.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">No audit events recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Actor</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Resource</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentActivities.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-700">
                          <span className="font-medium text-[#0F1E2E]">{entry.actorRole}</span>
                          {entry.actorEmail && (
                            <span className="text-slate-500"> · {entry.actorEmail}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs font-medium text-[#0D7A6F]">
                          {entry.action}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">{entry.resourceType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
