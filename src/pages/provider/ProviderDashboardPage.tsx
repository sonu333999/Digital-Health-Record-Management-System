import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Save, Search } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import { KERALA_DISTRICTS } from '../../shared/constants.ts';

interface ProviderDashboardData {
  profile: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    designation: string;
    hospitalName: string;
    registrationNumber: string;
    address: string | null;
    district: string | null;
  };
  stats: {
    authorizedWorkers: number;
    pendingRequests: number;
    recordsAdded: number;
  };
  authorizedWorkers: Array<{
    id: string;
    workerCode: string;
    fullName: string;
    district: string | null;
    bloodGroup: string | null;
    consent: {
      id: string;
      permittedCategories: string[];
      expiresAt: string;
    };
  }>;
  recentHistory: Array<{
    id: string;
    action: string;
    resourceType: string;
    createdAt: string;
  }>;
}

export function ProviderDashboardPage() {
  const { refreshSession, pushToast, t } = useAuth();
  const [data, setData] = useState<ProviderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phoneNumber: '',
    designation: '',
    hospitalName: '',
    registrationNumber: '',
    district: 'Ernakulam',
    address: '',
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/provider/dashboard')
      .then((res) => {
        if (cancelled) return;
        const d = res.data as ProviderDashboardData;
        setData(d);
        setProfileForm({
          fullName: d.profile.fullName || '',
          phoneNumber: d.profile.phoneNumber || '',
          designation: d.profile.designation || '',
          hospitalName: d.profile.hospitalName || '',
          registrationNumber: d.profile.registrationNumber || '',
          district: d.profile.district || 'Ernakulam',
          address: d.profile.address || '',
        });
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data: updated } = await api.put('/provider/profile', {
        ...profileForm,
        phoneNumber: profileForm.phoneNumber.trim() || null,
        address: profileForm.address.trim() || null,
      });
      setData((prev) => (prev ? { ...prev, profile: updated.profile } : prev));
      setEditingProfile(false);
      await refreshSession();
      pushToast('success', 'Provider profile updated.');
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <AppShell
      breadcrumb="Provider / Overview"
      title={t.navDashboard}
      action={
        <Link
          to="/provider/search"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B] whitespace-nowrap shrink-0"
        >
          <Search className="h-4 w-4" />
          Search Workers
        </Link>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-800">
          Unable to load provider dashboard.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Provider Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Active Consented Workers</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-[#0F1E2E] tabular-nums">
                {data.stats.authorizedWorkers}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Pending Access Requests</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-[#0F1E2E] tabular-nums">
                {data.stats.pendingRequests}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Clinical Records Authored</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-[#0F1E2E] tabular-nums">
                {data.stats.recordsAdded}
              </p>
            </div>
          </div>

          {/* Provider Profile Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                  {data.profile.fullName} · {data.profile.designation}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data.profile.hospitalName} · Reg ID:{' '}
                  <span className="font-mono text-[#0F1E2E]">
                    {data.profile.registrationNumber}
                  </span>{' '}
                  · {data.profile.district || 'Kerala'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfile((prev) => !prev)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
              >
                {editingProfile ? 'Cancel' : 'Edit Provider Profile'}
              </button>
            </div>

            {editingProfile && (
              <form onSubmit={handleSaveProfile} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Designation *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.designation}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, designation: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Hospital / Clinic *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.hospitalName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, hospitalName: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.registrationNumber}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, registrationNumber: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phoneNumber}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phoneNumber: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">District</label>
                  <select
                    value={profileForm.district}
                    onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {KERALA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Address</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end sm:col-span-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
                  >
                    {savingProfile ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save Profile
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Authorized Workers & Access History */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                  Authorized Workers (Active Consent)
                </h2>
                <Link
                  to="/provider/records"
                  className="text-xs font-medium text-[#0D7A6F] hover:underline"
                >
                  Open All
                </Link>
              </div>

              {data.authorizedWorkers.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-500">
                    No active worker consents right now. Search by Worker ID to send a consent
                    request.
                  </p>
                  <Link
                    to="/provider/search"
                    className="mt-4 inline-block rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
                  >
                    Search Workers
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.authorizedWorkers.map((w) => (
                    <Link
                      key={w.id}
                      to={`/provider/workers/${w.id}/records`}
                      className="flex items-center justify-between gap-4 py-3.5 hover:bg-slate-50/70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0F1E2E]">
                          {w.fullName}{' '}
                          <span className="font-mono text-xs text-slate-500">({w.workerCode})</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {w.consent.permittedCategories.length} categories · Expires{' '}
                          <span className="font-mono tabular-nums">
                            {new Date(w.consent.expiresAt).toLocaleDateString()}
                          </span>
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
                  Provider Access History
                </h2>
              </div>
              {data.recentHistory.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">No recent activity.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.recentHistory.map((h) => (
                    <div key={h.id} className="py-3">
                      <p className="text-xs font-medium text-[#0F1E2E]">
                        {h.action.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                        {new Date(h.createdAt).toLocaleString()}
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
