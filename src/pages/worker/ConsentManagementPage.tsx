import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck, ShieldOff, X } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { ConfirmModal } from '../../components/ConfirmModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import { RECORD_CATEGORIES } from '../../shared/constants.ts';

interface ProviderDirectoryItem {
  id: string;
  fullName: string;
  designation: string;
  hospitalName: string;
  registrationNumber: string;
  district: string | null;
}

interface ConsentRow {
  id: string;
  permittedCategories: string[];
  purpose: string | null;
  canAddRecords: boolean;
  canEditRecords: boolean;
  status: string;
  requestedAt: string;
  grantedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  provider: ProviderDirectoryItem;
}

export function ConsentManagementPage() {
  const { pushToast, t } = useAuth();
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [providers, setProviders] = useState<ProviderDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'HISTORY'>('ALL');

  // Proactive grant form
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'General Checkup',
    'Prescription',
    'Laboratory Report',
  ]);
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [purpose, setPurpose] = useState('');
  const [canAddRecords, setCanAddRecords] = useState(true);
  const [canEditRecords, setCanEditRecords] = useState(false);
  const [granting, setGranting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<ConsentRow | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/consents'),
        api.get('/auth/providers-directory'),
      ]);
      setConsents(cRes.data.consents || []);
      const provList = (pRes.data.providers || []) as ProviderDirectoryItem[];
      setProviders(provList);
      if (provList.length > 0 && !selectedProviderId) {
        setSelectedProviderId(provList[0].id);
      }
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to load consents.'));
    } finally {
      setLoading(false);
    }
  }, [pushToast, selectedProviderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleGrantConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || selectedCategories.length === 0) {
      pushToast('error', 'Select a provider and at least one record category.');
      return;
    }
    setGranting(true);
    try {
      await api.post('/consents/grant', {
        providerId: selectedProviderId,
        permittedCategories: selectedCategories,
        expiresAt: new Date(expiresAt).toISOString(),
        purpose: purpose.trim() || undefined,
        canAddRecords,
        canEditRecords,
      });
      pushToast('success', 'Time-bound consent granted and logged.');
      setPurpose('');
      await loadData();
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to grant consent.'));
    } finally {
      setGranting(false);
    }
  };

  const handleApprove = async (consentId: string) => {
    setProcessingId(consentId);
    try {
      await api.post(`/consents/${consentId}/approve`, {});
      pushToast('success', 'Provider access request approved.');
      await loadData();
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (consentId: string) => {
    setProcessingId(consentId);
    try {
      await api.post(`/consents/${consentId}/reject`);
      pushToast('info', 'Provider access request declined.');
      await loadData();
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    setProcessingId(revokeTarget.id);
    try {
      await api.post(`/consents/${revokeTarget.id}/revoke`);
      pushToast('success', 'Consent revoked immediately. Provider access is now blocked.');
      setRevokeTarget(null);
      await loadData();
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredConsents = consents.filter((c) => {
    if (statusFilter === 'ACTIVE') return c.status === 'ACTIVE';
    if (statusFilter === 'PENDING') return c.status === 'PENDING';
    if (statusFilter === 'HISTORY')
      return c.status === 'REVOKED' || c.status === 'EXPIRED' || c.status === 'REJECTED';
    return true;
  });

  return (
    <AppShell breadcrumb="Worker / Consent Control" title={t.navConsents}>
      <div className="space-y-8">
        {/* Proactive Grant Form */}
        <form
          onSubmit={handleGrantConsent}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#0D7A6F]" />
            <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
              Grant Consent to a Healthcare Provider
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Providers can access ONLY the record categories you explicitly select, and access stops
            automatically at the expiry date/time or immediately upon revocation.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Select Healthcare Provider *
              </label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {providers.length === 0 && <option value="">No registered providers yet</option>}
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} — {p.hospitalName} ({p.registrationNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Consent Expiry Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-slate-700">Permitted Record Categories *</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RECORD_CATEGORIES.map((cat) => {
                const checked = selectedCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      checked
                        ? 'border-[#0D7A6F] bg-[#EEF7F6] text-[#0F1E2E]'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#0D7A6F]"
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
                Consultation Purpose (optional)
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Blood pressure review at Ernakulam General Hospital"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1 text-xs text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={canAddRecords}
                  onChange={(e) => setCanAddRecords(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0D7A6F]"
                />
                Allow provider to add new records in permitted categories
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={canEditRecords}
                  onChange={(e) => setCanEditRecords(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0D7A6F]"
                />
                Allow provider to update permitted records
              </label>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={granting || providers.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
            >
              {granting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.grantConsentBtn}
            </button>
          </div>
        </form>

        {/* Consent Ledger */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
              Consent Permissions & Requests
            </h2>
            <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
              {(['ALL', 'PENDING', 'ACTIVE', 'HISTORY'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-md px-3 py-1.5 transition-colors whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-white text-[#0F1E2E] shadow-xs'
                      : 'text-slate-600 hover:text-[#0F1E2E]'
                  }`}
                >
                  {tab === 'ALL'
                    ? 'All'
                    : tab === 'PENDING'
                      ? 'Pending'
                      : tab === 'ACTIVE'
                        ? 'Active'
                        : 'Expired / Revoked'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
            </div>
          ) : filteredConsents.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              No consent records in this view.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredConsents.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-[#0F1E2E]">
                        {item.provider.fullName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600">{item.provider.hospitalName}</span>
                      <span className="text-slate-300">·</span>
                      <span
                        className={`text-xs font-semibold ${
                          item.status === 'ACTIVE'
                            ? 'text-emerald-700'
                            : item.status === 'PENDING'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Categories: {item.permittedCategories.join(', ')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 tabular-nums">
                      Expires: {new Date(item.expiresAt).toLocaleString()}
                      {item.purpose ? ` · Purpose: ${item.purpose}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(item.id)}
                          disabled={processingId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D7A6F] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0A645B] whitespace-nowrap"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t.approveBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(item.id)}
                          disabled={processingId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          <X className="h-3.5 w-3.5" />
                          {t.rejectBtn}
                        </button>
                      </>
                    )}
                    {item.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        {t.revokeConsentBtn}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(revokeTarget)}
        title="Revoke Healthcare Provider Access"
        description={`Immediately revoke ${revokeTarget?.provider.fullName}'s access to your medical records? Future API queries by this provider will be blocked at once.`}
        confirmLabel="Revoke Immediately"
        destructive
        loading={processingId === revokeTarget?.id}
        onConfirm={handleConfirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </AppShell>
  );
}
