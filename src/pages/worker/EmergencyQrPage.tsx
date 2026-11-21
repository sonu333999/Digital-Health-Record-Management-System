import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  Download,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldOff,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { ConfirmModal } from '../../components/ConfirmModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';

interface EmergencyTokenData {
  id: string;
  token: string;
  emergencyIdentifier: string;
  isActive: boolean;
  shareEmergencyContact: boolean;
  accessCount: number;
  lastAccessedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export function EmergencyQrPage() {
  const { pushToast, t } = useAuth();
  const [activeToken, setActiveToken] = useState<EmergencyTokenData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [emergencyUrl, setEmergencyUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<Omit<EmergencyTokenData, 'token'>>>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const loadQr = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/emergency/my-qr');
      setActiveToken(data.activeToken || null);
      setQrDataUrl(data.qrDataUrl || null);
      setEmergencyUrl(data.emergencyUrl || null);
      setHistory(data.history || []);
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadQr();
  }, [loadQr]);

  const handleGenerate = async () => {
    setWorking(true);
    try {
      const { data } = await api.post('/emergency/generate');
      setActiveToken(data.activeToken);
      setQrDataUrl(data.qrDataUrl);
      setEmergencyUrl(data.emergencyUrl);
      pushToast('success', 'New cryptographic Emergency QR generated. Previous QR codes revoked.');
      await loadQr();
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async () => {
    setWorking(true);
    try {
      await api.post('/emergency/revoke');
      setConfirmRevoke(false);
      pushToast('info', 'Active Emergency QR token revoked immediately.');
      await loadQr();
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setWorking(false);
    }
  };

  const handleToggleContactShare = async (share: boolean) => {
    try {
      await api.patch('/emergency/settings', { shareEmergencyContact: share });
      setActiveToken((prev) => (prev ? { ...prev, shareEmergencyContact: share } : prev));
      pushToast(
        'success',
        share
          ? 'Emergency contact is now visible on your Emergency QR page.'
          : 'Emergency contact hidden from public Emergency QR page.'
      );
    } catch (err) {
      pushToast('error', extractApiError(err));
    }
  };

  const handleCopyUrl = async () => {
    if (!emergencyUrl) return;
    try {
      await navigator.clipboard.writeText(emergencyUrl);
      pushToast('success', 'Emergency access link copied.');
    } catch {
      pushToast('info', emergencyUrl);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !activeToken) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `CareBridge-Emergency-${activeToken.emergencyIdentifier}.png`;
    link.click();
  };

  return (
    <AppShell breadcrumb="Worker / Emergency QR Access" title={t.navEmergencyQr}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* QR Card Display */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center lg:col-span-5">
              {activeToken && qrDataUrl ? (
                <>
                  <img
                    src={qrDataUrl}
                    alt="CareBridge Emergency QR Code"
                    className="h-60 w-60 rounded-xl border border-slate-200 p-3"
                  />
                  <p className="mt-4 font-mono text-sm font-semibold text-[#0F1E2E] tabular-nums">
                    {activeToken.emergencyIdentifier}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    Active · Scanned {activeToken.accessCount} times
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D7A6F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A645B]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t.downloadQrBtn}
                    </button>
                    <Link
                      to={`/emergency/${activeToken.token}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Card
                    </Link>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <QrCode className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-[#0F1E2E]">
                    No Active Emergency QR Code
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Generate a fresh 256-bit cryptographic QR code for emergency medical responders.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={working}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#0A645B]"
                  >
                    {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Generate Emergency QR
                  </button>
                </div>
              )}
            </div>

            {/* Security Controls & Privacy Scope */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
              <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                Emergency Privacy & Token Controls
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                Scanning this QR opens a rate-limited emergency card showing ONLY your name,
                emergency identifier, blood group, known allergies, chronic conditions, and
                emergency contact (if enabled below). Complete medical records, prescriptions, and
                documents are strictly excluded.
              </p>

              {activeToken && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">Cryptographic Emergency URL</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 truncate font-mono text-xs text-[#0F1E2E]">
                        {emergencyUrl}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
                    <input
                      type="checkbox"
                      checked={activeToken.shareEmergencyContact}
                      onChange={(e) => handleToggleContactShare(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0D7A6F]"
                    />
                    <div className="text-xs">
                      <p className="font-medium text-[#0F1E2E]">
                        Include Emergency Contact on Public QR Card
                      </p>
                      <p className="mt-0.5 text-slate-500">
                        Update your emergency contact details anytime in{' '}
                        <Link to="/worker/profile" className="text-[#0D7A6F] hover:underline">
                          My Profile
                        </Link>
                        .
                      </p>
                    </div>
                  </label>

                  <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={working}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${working ? 'animate-spin' : ''}`} />
                      {t.generateQrBtn} (Revokes Old)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRevoke(true)}
                      disabled={working}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                      {t.revokeQrBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Token History */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                Emergency Token Audit History
              </h2>
            </div>
            {history.length === 0 ? (
              <p className="px-6 py-10 text-center text-xs text-slate-500">No token history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <tr>
                      <th className="px-6 py-3">Emergency ID</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Scans</th>
                      <th className="px-6 py-3">Created</th>
                      <th className="px-6 py-3">Last Scanned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {history.map((tok) => (
                      <tr key={tok.id}>
                        <td className="px-6 py-3 font-mono font-medium text-[#0F1E2E] tabular-nums">
                          {tok.emergencyIdentifier}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`font-semibold ${
                              tok.isActive ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {tok.isActive ? 'ACTIVE' : 'REVOKED'}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-mono tabular-nums">{tok.accessCount}</td>
                        <td className="px-6 py-3 font-mono text-slate-500 tabular-nums">
                          {new Date(tok.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-mono text-slate-500 tabular-nums">
                          {tok.lastAccessedAt ? new Date(tok.lastAccessedAt).toLocaleString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmRevoke}
        title="Revoke Emergency QR Code"
        description="Scanning your printed QR code will immediately stop working until you generate a new code."
        confirmLabel="Revoke QR Now"
        destructive
        loading={working}
        onConfirm={handleRevoke}
        onCancel={() => setConfirmRevoke(false)}
      />
    </AppShell>
  );
}
