import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { ConfirmModal } from '../../components/ConfirmModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  type UserRole,
} from '../../shared/constants.ts';

const ROLE_OPTIONS: Array<{
  role: UserRole;
  label: string;
  description: string;
  dashboardPath: string;
}> = [
  {
    role: 'WORKER',
    label: 'Migrant Worker',
    description: 'Manage personal health vault, OCR uploads, AI summaries, consents, and Emergency QR.',
    dashboardPath: '/worker/dashboard',
  },
  {
    role: 'PROVIDER',
    label: 'Healthcare Provider',
    description: 'Search workers, send access requests, and review consent-authorized clinical records.',
    dashboardPath: '/provider/dashboard',
  },
  {
    role: 'ADMIN',
    label: 'System Administrator',
    description: 'Review aggregate health metrics, manage user status, and inspect audit logs.',
    dashboardPath: '/admin/dashboard',
  },
];

export function SettingsPage() {
  const {
    user,
    workerProfile,
    providerProfile,
    canEvaluateRoles,
    language,
    setLanguage,
    switchEvaluationRole,
    logout,
    t,
  } = useAuth();
  const navigate = useNavigate();

  const [switchingRole, setSwitchingRole] = useState<UserRole | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const handleLanguageChange = async (code: LanguageCode) => {
    if (code === language) return;
    await setLanguage(code);
  };

  const handleRoleSwitch = async (targetRole: UserRole, dashboardPath: string) => {
    if (!user || user.role === targetRole) return;
    setSwitchingRole(targetRole);
    try {
      await switchEvaluationRole(targetRole);
      navigate(dashboardPath);
    } finally {
      setSwitchingRole(null);
    }
  };

  const handleConfirmSignOut = async () => {
    setSignOutOpen(false);
    await logout();
    navigate('/login');
  };

  const roleProfileLink =
    user?.role === 'WORKER'
      ? { to: '/worker/profile', label: 'Edit Worker Health Profile' }
      : user?.role === 'PROVIDER'
        ? { to: '/provider/dashboard', label: 'Open Provider Workspace' }
        : { to: '/admin/dashboard', label: 'Open Administrator Dashboard' };

  return (
    <AppShell breadcrumb="Account / Preferences" title={t.navSettings}>
      <div className="space-y-6">
        {/* Account Overview */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0F1E2E]">Account Information</h2>
              <p className="mt-1 text-sm text-slate-600">
                Authenticated identity verified via Firebase Authentication and synced to CareBridge.
              </p>
            </div>
            <Link
              to={roleProfileLink.to}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-[#0F1E2E] hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <span>{roleProfileLink.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Full Name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#0F1E2E]">{user?.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-1 truncate text-sm text-slate-700">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Active Role
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#0D7A6F]">{user?.role}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Identifier
              </dt>
              <dd className="mt-1 font-mono text-sm text-slate-700 tabular-nums">
                {user?.role === 'WORKER'
                  ? workerProfile?.workerCode || '—'
                  : user?.role === 'PROVIDER'
                    ? providerProfile?.registrationNumber || '—'
                    : 'Administrator'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Interface Language Selection */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF7F6] text-[#0D7A6F]">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#0F1E2E]">Interface Language</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Saved to your user account across English, Malayalam, Hindi, and Bengali.
                </p>
              </div>
            </div>
            <Link
              to="/language"
              className="text-sm font-medium text-[#0D7A6F] hover:text-[#0A645B] whitespace-nowrap shrink-0"
            >
              Full Language Guide
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    selected
                      ? 'border-[#0D7A6F] bg-[#EEF7F6]/70'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-base font-semibold text-[#0F1E2E]">{lang.nativeLabel}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {lang.label}
                    {selected ? ' · Active' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Academic Project Evaluation Role Switcher (only shown for authorized evaluator/admin accounts) */}
        {canEvaluateRoles && (
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF7F6] text-[#0D7A6F]">
                <UserCog className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#0F1E2E]">
                  Academic Evaluation Role Switcher
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Available exclusively for authorized project evaluation accounts to inspect the
                  Worker, Healthcare Provider, and Administrator portals from one authenticated
                  session. Backend RBAC remains strictly enforced for whichever role is active.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {ROLE_OPTIONS.map((option) => {
                const isCurrent = user?.role === option.role;
                const isBusy = switchingRole === option.role;
                return (
                  <div
                    key={option.role}
                    className={`flex flex-col justify-between rounded-xl border p-4 ${
                      isCurrent ? 'border-[#0D7A6F] bg-[#EEF7F6]/60' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0F1E2E]">{option.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {option.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isCurrent || switchingRole !== null}
                      onClick={() => handleRoleSwitch(option.role, option.dashboardPath)}
                      className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#0D7A6F] text-white opacity-90'
                          : 'border border-slate-200 bg-white text-[#0F1E2E] hover:bg-slate-50 disabled:opacity-50'
                      }`}
                    >
                      {isCurrent
                        ? 'Active Role'
                        : isBusy
                          ? 'Switching...'
                          : `Switch to ${option.label}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Privacy & Session Security */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-[#0F1E2E]">Privacy & Session Controls</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F1E2E]">
                <KeyRound className="h-4 w-4 text-[#0D7A6F]" />
                <span>Verified Sessions</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                Every protected API request validates a fresh Firebase ID token and verifies
                role-based permissions server-side.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F1E2E]">
                <ShieldCheck className="h-4 w-4 text-[#0D7A6F]" />
                <span>Explicit Consent</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                Healthcare providers can access worker records only under active, time-bound,
                category-scoped consent grants.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F1E2E]">
                <Lock className="h-4 w-4 text-[#0D7A6F]" />
                <span>Private Document Vault</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                Uploaded prescriptions and laboratory PDFs are streamed exclusively through
                authenticated endpoints with no public links.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-500">
              Need to reset an email/password credential? Use the password recovery page after
              signing out.
            </p>
            <button
              type="button"
              onClick={() => setSignOutOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span>{t.navSignOut}</span>
            </button>
          </div>
        </section>
      </div>

      <ConfirmModal
        open={signOutOpen}
        title="Sign out of CareBridge?"
        description="You will be signed out on this device and returned to the sign-in screen."
        confirmLabel="Sign Out"
        destructive
        onConfirm={handleConfirmSignOut}
        onCancel={() => setSignOutOpen(false)}
      />
    </AppShell>
  );
}
