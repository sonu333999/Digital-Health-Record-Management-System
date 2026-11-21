import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FilePlus2,
  Loader2,
  QrCode,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';

interface DashboardData {
  profile: {
    workerCode: string;
    fullName: string;
    district: string | null;
    bloodGroup: string | null;
    knownAllergies: string | null;
    chronicConditions: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  };
  stats: {
    totalRecords: number;
    totalDocuments: number;
    activeConsents: number;
    pendingRequests: number;
    unreadNotifications: number;
  };
  recentRecords: Array<{
    id: string;
    title: string;
    category: string;
    hospitalName: string | null;
    doctorName: string | null;
    visitDate: string;
    createdByRole: string;
  }>;
  recentHistory: Array<{
    id: string;
    actorRole: string;
    actorEmail: string | null;
    action: string;
    createdAt: string;
  }>;
  activeEmergencyToken: {
    emergencyIdentifier: string;
    token: string;
    accessCount: number;
    isActive: boolean;
  } | null;
}

export function WorkerDashboardPage() {
  const { t } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.get('/worker/dashboard'), api.get('/emergency/my-qr')])
      .then(([dashRes, qrRes]) => {
        if (!cancelled) {
          setData(dashRes.data);
          setQrPreview(qrRes.data.qrDataUrl || null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, 'Unable to load dashboard.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell
      breadcrumb="Worker / Overview"
      title={t.navDashboard}
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
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : error || !data ? (
        <div className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-800">
          {error || 'Dashboard unavailable.'}
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Health Records" value={data.stats.totalRecords} />
            <StatTile label="Private Documents" value={data.stats.totalDocuments} />
            <StatTile label="Active Consents" value={data.stats.activeConsents} />
            <StatTile
              label="Pending Requests"
              value={data.stats.pendingRequests}
              highlight={data.stats.pendingRequests > 0}
            />
          </div>

          {/* Pending consent alert banner */}
          {data.stats.pendingRequests > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-4">
              <div className="text-sm text-amber-950">
                <p className="font-semibold">
                  You have {data.stats.pendingRequests} pending healthcare provider access request
                  {data.stats.pendingRequests > 1 ? 's' : ''}
                </p>
                <p className="mt-0.5 text-xs text-amber-900">
                  Review requested record categories and set an expiry duration before approving.
                </p>
              </div>
              <Link
                to="/worker/consents"
                className="rounded-lg bg-[#0F1E2E] px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                Review Requests
              </Link>
            </div>
          )}

          {/* Main 2-column grid: Health Summary & Emergency QR */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                    Personal Health Snapshot
                  </h2>
                  <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                    Health ID: {data.profile.workerCode} · District:{' '}
                    {data.profile.district || 'Not set'}
                  </p>
                </div>
                <Link
                  to="/worker/profile"
                  className="text-xs font-medium text-[#0D7A6F] hover:underline whitespace-nowrap"
                >
                  Edit Profile
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">{t.bloodGroupLabel}</p>
                  <p className="mt-1 font-display text-xl font-bold text-[#0F1E2E] tabular-nums">
                    {data.profile.bloodGroup || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.allergiesLabel}</p>
                  <p className="mt-1 text-sm font-medium text-[#0F1E2E]">
                    {data.profile.knownAllergies || 'None recorded'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.chronicConditionsLabel}</p>
                  <p className="mt-1 text-sm font-medium text-[#0F1E2E]">
                    {data.profile.chronicConditions || 'None recorded'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                <Link
                  to="/worker/documents/upload"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5 text-[#0D7A6F]" />
                  Upload Medical Document
                </Link>
                <Link
                  to="/worker/consents"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0D7A6F]" />
                  Manage Provider Consent
                </Link>
              </div>
            </div>

            {/* Emergency QR card on Worker Dashboard */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                    Emergency QR Card
                  </h2>
                  <QrCode className="h-4 w-4 text-[#0D7A6F]" />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Restricted responder access · Blood group & allergies only
                </p>
              </div>

              <div className="my-4 flex flex-col items-center justify-center">
                {qrPreview && data.activeEmergencyToken ? (
                  <>
                    <img
                      src={qrPreview}
                      alt="Worker emergency QR code"
                      className="h-36 w-36 rounded-lg border border-slate-200 p-1.5"
                    />
                    <p className="mt-2 font-mono text-xs text-slate-600 tabular-nums">
                      {data.activeEmergencyToken.emergencyIdentifier}
                    </p>
                  </>
                ) : (
                  <p className="py-8 text-center text-xs text-slate-500">
                    No active emergency QR token.
                  </p>
                )}
              </div>

              <Link
                to="/worker/emergency-qr"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
              >
                Manage & Download QR
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Recent Health Records & Access History */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                  Recent Health Records
                </h2>
                <Link
                  to="/worker/records"
                  className="text-xs font-medium text-[#0D7A6F] hover:underline"
                >
                  View all records
                </Link>
              </div>

              {data.recentRecords.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-500">
                    You have not added any health records yet.
                  </p>
                  <Link
                    to="/worker/records/new"
                    className="mt-4 inline-block rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
                  >
                    Add Your First Record
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.recentRecords.map((rec) => (
                    <Link
                      key={rec.id}
                      to={`/worker/records/${rec.id}`}
                      className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-slate-50/70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0F1E2E]">{rec.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {rec.category} · {rec.hospitalName || 'Self-recorded'} ·{' '}
                          <span className="font-mono tabular-nums">{rec.visitDate}</span>
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                  Record Access History
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Every consent change, provider access, and emergency scan is recorded.
                </p>
              </div>

              {data.recentHistory.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No access activity yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.recentHistory.map((item) => (
                    <div key={item.id} className="py-3">
                      <p className="text-xs font-medium text-[#0F1E2E]">
                        {item.action.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                        {item.actorRole} · {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 ${
        highlight ? 'border-amber-300' : 'border-slate-200'
      }`}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-[#0F1E2E] tabular-nums">{value}</p>
    </div>
  );
}
