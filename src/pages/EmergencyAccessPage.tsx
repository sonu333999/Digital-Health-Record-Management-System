import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Loader2, PhoneCall, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api, extractApiError } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface EmergencyProfile {
  workerName: string;
  emergencyIdentifier: string;
  bloodGroup: string;
  knownAllergies: string;
  chronicConditions: string;
  preferredLanguage: string;
  emergencyContact: {
    name: string | null;
    phone: string | null;
    relation: string | null;
  } | null;
  accessedAt: string;
}

export function EmergencyAccessPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useAuth();
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing emergency token.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get(`/emergency/public/${encodeURIComponent(token)}`)
      .then((res) => {
        if (!cancelled) setProfile(res.data.emergencyProfile);
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, 'Emergency card not found or revoked.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8FAFB] px-4 py-10 text-[#0F1E2E]">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between pb-6">
          <Link to="/" className="font-display text-lg font-bold tracking-tight text-[#0F1E2E]">
            CareBridge
          </Link>
          <span className="text-xs font-medium text-red-700">Emergency Responder View</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-slate-600">
            <Loader2 className="h-7 w-7 animate-spin text-[#0D7A6F]" />
            <p className="mt-3 text-sm">Loading verified emergency information...</p>
          </div>
        ) : error || !profile ? (
          <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-xl font-bold text-[#0F1E2E]">
              Emergency Card Unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-lg bg-[#0F1E2E] px-4 py-2 text-sm font-medium text-white"
            >
              Go to CareBridge Home
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* High-contrast clinical emergency header */}
            <div className="border-b border-red-200 bg-red-50/80 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-red-800">{t.emergencyCardTitle}</p>
                  <h1 className="mt-1 font-display text-2xl font-bold text-[#0F1E2E]">
                    {profile.workerName}
                  </h1>
                  <p className="mt-1 font-mono text-xs text-slate-700 tabular-nums">
                    {t.emergencyIdLabel}: {profile.emergencyIdentifier}
                  </p>
                </div>

                <div className="rounded-lg border border-red-300 bg-white px-5 py-3 text-center">
                  <p className="text-xs font-medium text-slate-500">{t.bloodGroupLabel}</p>
                  <p className="mt-0.5 font-display text-3xl font-bold text-red-700 tabular-nums">
                    {profile.bloodGroup}
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200 px-6">
              <div className="py-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{t.allergiesLabel}</span>
                </div>
                <p className="mt-2 text-base font-medium text-[#0F1E2E]">
                  {profile.knownAllergies}
                </p>
              </div>

              <div className="py-5">
                <p className="text-sm font-semibold text-[#0F1E2E]">{t.chronicConditionsLabel}</p>
                <p className="mt-2 text-base text-slate-800">{profile.chronicConditions}</p>
              </div>

              <div className="py-5">
                <p className="text-sm font-semibold text-[#0F1E2E]">{t.emergencyContactLabel}</p>
                {profile.emergencyContact &&
                (profile.emergencyContact.name || profile.emergencyContact.phone) ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-[#0F1E2E]">
                        {profile.emergencyContact.name || 'Listed Contact'}
                        {profile.emergencyContact.relation
                          ? ` (${profile.emergencyContact.relation})`
                          : ''}
                      </p>
                      <p className="mt-0.5 font-mono text-sm text-slate-700 tabular-nums">
                        {profile.emergencyContact.phone || 'Not provided'}
                      </p>
                    </div>
                    {profile.emergencyContact.phone && (
                      <a
                        href={`tel:${profile.emergencyContact.phone}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A645B]"
                      >
                        <PhoneCall className="h-4 w-4" />
                        Call Contact
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    The worker chose not to display emergency contact details publicly.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0D7A6F]" />
                <div>
                  <p>{t.emergencyRestrictedNotice}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                    Access logged at {new Date(profile.accessedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
