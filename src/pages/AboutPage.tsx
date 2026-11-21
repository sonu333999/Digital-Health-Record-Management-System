import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';

export function AboutPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-medium text-[#0D7A6F]">
              B.Tech Computer Engineering Final Year Project
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#0F1E2E] text-balance sm:text-4xl">
              Digital Health Record Management System for Migrant Workers in Kerala
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Inter-state migrant workers across Kerala move frequently between construction sites,
              plantations, mills, and districts. Paper prescriptions are easily damaged or lost,
              while language differences between Malayalam, Hindi, Bengali, and English hinder
              timely diagnosis and medication safety.
            </p>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              CareBridge solves this through a centralized, consent-governed, multilingual digital
              health vault backed by PostgreSQL, Firebase Authentication, private document storage,
              and Gemini multimodal OCR and clinical structuring.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <SafeImage
                src="/src/assets/images/sdg_community_care_1795073266433.jpg"
                alt="Kerala community health outreach clinic supporting diverse workers"
                fallbackLabel="Kerala Public Health Outreach"
                className="h-full min-h-[240px] w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 border-t border-slate-200 pt-10 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs text-[#0D7A6F]">SDG 3</p>
            <h2 className="mt-2 font-display text-lg font-semibold text-[#0F1E2E]">
              Good Health and Well-being
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Ensures clinicians can inspect verified past prescriptions, allergies, lab reports,
              and immunizations regardless of which district clinic treated the patient earlier.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs text-[#0D7A6F]">SDG 8</p>
            <h2 className="mt-2 font-display text-lg font-semibold text-[#0F1E2E]">
              Decent Work and Economic Growth
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Protects workforce health continuity by reducing lost workdays from repeated
              diagnostics and untreated occupational or chronic conditions.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs text-[#0D7A6F]">SDG 10</p>
            <h2 className="mt-2 font-display text-lg font-semibold text-[#0F1E2E]">
              Reduced Inequalities
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Gives vulnerable migrant communities equal access to portable medical ownership in
              their native script—Malayalam, Hindi, Bengali, or English.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-[#0F1E2E]">
            Security & Ethical Governance
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-[#0F1E2E]">Server-Side Enforcement</p>
              <p className="mt-1 leading-relaxed">
                Every protected API verifies Firebase ID tokens, confirms role authorization in
                PostgreSQL, and validates active unexpired consent before returning clinical data.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#0F1E2E]">Responsible AI & Privacy Scope</p>
              <p className="mt-1 leading-relaxed">
                Gemini AI assists strictly with OCR extraction and factual organization—it never
                diagnoses or prescribes. This is an academic prototype using fictional demonstration
                records and does not claim official ABDM/ABHA integration.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/register/worker"
              className="rounded-lg bg-[#0D7A6F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B]"
            >
              Create Worker Account
            </Link>
            <Link
              to="/register/provider"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1E2E] hover:bg-slate-50"
            >
              Register Healthcare Provider
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
