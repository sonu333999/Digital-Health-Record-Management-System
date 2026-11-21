import React from 'react';
import { Check } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { AppShell } from '../components/AppShell.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../shared/constants.ts';

export function LanguagePage() {
  const { user, language, setLanguage, t } = useAuth();

  const content = (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-[#0F1E2E]">
          Interface Language Selection
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Choose your preferred language for navigation, forms, dashboards, notifications, and
          alerts. Original medical document text and clinical prescriptions are always preserved
          verbatim.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code as LanguageCode)}
                className={`flex items-start justify-between rounded-xl border p-5 text-left transition-colors ${
                  active
                    ? 'border-[#0D7A6F] bg-[#EEF7F6]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div>
                  <p className="font-display text-lg font-semibold text-[#0F1E2E]">
                    {lang.nativeLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {lang.label} · {lang.region}
                  </p>
                </div>
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0D7A6F] text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-slate-500">
          {user
            ? 'Your selected language is saved directly to your CareBridge PostgreSQL user profile.'
            : 'Sign in to save your preferred language permanently to your profile.'}
        </p>
      </div>
    </div>
  );

  if (user) {
    return (
      <AppShell breadcrumb="Preferences / Language" title={t.navLanguage}>
        {content}
      </AppShell>
    );
  }

  return (
    <PublicLayout>
      <div className="px-4 py-12 sm:px-6">{content}</div>
    </PublicLayout>
  );
}
