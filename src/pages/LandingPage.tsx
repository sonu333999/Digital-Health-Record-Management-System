import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, QrCode } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { DEMO_EMERGENCY_TOKEN } from '../shared/constants.ts';

export function LandingPage() {
  const { t, user } = useAuth();

  const capabilities = [
    {
      index: '01',
      title: 'Portable Multilingual Health Vault',
      body: 'Maintain prescriptions, vaccination dates, discharge summaries, allergies, and chronic conditions across all 14 districts of Kerala in English, Malayalam, Hindi, and Bengali.',
    },
    {
      index: '02',
      title: 'Document OCR & Structured Clinical Summaries',
      body: 'Upload paper prescriptions or lab PDFs securely, verify extracted text before saving, and generate non-diagnostic Gemini clinical summaries preserving every original value.',
    },
    {
      index: '03',
      title: 'Worker-Controlled Time-Bound Consent',
      body: 'Approve or decline healthcare provider requests by specific record category, set exact expiry timestamps, and revoke provider access instantly with full audit logs.',
    },
    {
      index: '04',
      title: 'Restricted Emergency QR Access',
      body: 'Generate a cryptographically random QR code revealing only blood group, allergies, chronic conditions, and optional emergency contact—never exposing complete records.',
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section: balanced 2-column split */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-xs font-medium tracking-wide text-[#0D7A6F]">
                Kerala Migrant Health Initiative · UN SDG 3, 8 & 10
              </p>
              <h1
                className="mt-4 font-display font-bold tracking-tight text-[#0F1E2E] text-balance"
                style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.4rem)', lineHeight: 1.12 }}
              >
                {t.heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                {t.heroSubtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={user ? '/worker/dashboard' : '/register/worker'}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0A645B] whitespace-nowrap shrink-0"
                >
                  {t.heroPrimaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/register/provider"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-[#0F1E2E] transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  {t.heroSecondaryCta}
                </Link>
                <Link
                  to={`/emergency/${DEMO_EMERGENCY_TOKEN}`}
                  className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-[#0D7A6F] hover:underline whitespace-nowrap shrink-0"
                >
                  <QrCode className="h-4 w-4" />
                  Preview Emergency Card
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <SafeImage
                  src="/src/assets/images/hero_kerala_healthcare_1795073267121.jpg"
                  alt="Healthcare clinician reviewing a digital patient health record with a migrant worker in a bright Kerala clinic"
                  fallbackLabel="CareBridge Clinical Consultation"
                  className="h-full min-h-[280px] w-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Full-width 4-column domain strip below hero split */}
          <div className="mt-12 grid grid-cols-2 gap-6 border-t border-slate-200 pt-8 md:grid-cols-4">
            <div>
              <p className="font-mono text-2xl font-semibold text-[#0F1E2E] tabular-nums">4</p>
              <p className="mt-1 text-xs text-slate-600">
                Interface languages: English, Malayalam, Hindi, Bengali
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-[#0F1E2E] tabular-nums">14</p>
              <p className="mt-1 text-xs text-slate-600">
                Kerala districts supported for seamless record portability
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-[#0F1E2E] tabular-nums">8</p>
              <p className="mt-1 text-xs text-slate-600">
                Granular medical categories enforced by consent rules
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-[#0F1E2E] tabular-nums">100%</p>
              <p className="mt-1 text-xs text-slate-600">
                Audit-logged record access with zero public document URLs
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities: Asymmetric 2-column Editorial Layout */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#0F1E2E] sm:text-3xl text-balance">
            Built for continuity of care across workplaces, clinics, and languages
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Every workflow is backed by PostgreSQL persistence, Firebase token verification, and
            server-side consent checks—never client-side assumptions.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {capabilities.map((cap) => (
            <div
              key={cap.index}
              className="rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300"
            >
              <p className="font-mono text-xs font-medium text-[#0D7A6F] tabular-nums">
                {cap.index}.
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold text-[#0F1E2E]">
                {cap.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{cap.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Emergency QR & SDG Impact Split */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <SafeImage
                  src="/src/assets/images/emergency_qr_card_1795073266956.jpg"
                  alt="Clinician scanning a CareBridge emergency medical QR card at a hospital reception desk"
                  fallbackLabel="Restricted Emergency QR Access"
                  className="h-full min-h-[260px] w-full object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col justify-center lg:col-span-7">
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#0F1E2E] text-balance">
                Life-saving clarity during medical emergencies, without sacrificing privacy
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                When an injured or unconscious migrant worker reaches a district hospital without
                shared language fluency, scanning their laminated CareBridge QR card immediately
                reveals only blood group, allergies, chronic conditions, and chosen emergency
                contact.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F1E2E]">SDG 3 · Health</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Prevents repeat lab tests, adverse allergy prescriptions, and lost follow-ups.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F1E2E]">SDG 8 · Decent Work</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Safeguards occupational well-being and medical documentation for mobile workers.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F1E2E]">SDG 10 · Equality</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Bridges language barriers with Malayalam, Hindi, Bengali, and English support.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/about"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1E2E] hover:bg-slate-50 whitespace-nowrap"
                >
                  Read Project Architecture
                </Link>
                <Link
                  to="/login"
                  className="rounded-lg bg-[#0D7A6F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] whitespace-nowrap"
                >
                  Open Platform Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
