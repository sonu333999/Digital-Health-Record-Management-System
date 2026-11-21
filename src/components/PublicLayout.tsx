import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { DEMO_EMERGENCY_TOKEN } from '../shared/constants.ts';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, t } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath =
    user?.role === 'PROVIDER'
      ? '/provider/dashboard'
      : user?.role === 'ADMIN'
        ? '/admin/dashboard'
        : '/worker/dashboard';

  const navLinks = [
    { to: '/about', label: t.navAbout },
    { to: `/emergency/${DEMO_EMERGENCY_TOKEN}`, label: t.navEmergency },
    { to: '/language', label: t.navLanguage },
    { to: '/login', label: t.navLogin },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFB] text-[#0F1E2E]">
      {/* Strict 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single clean wordmark */}
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-[#0F1E2E] whitespace-nowrap shrink-0"
          >
            CareBridge
          </Link>

          {/* Zone 2: 4 concise single-line text links */}
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {navLinks.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-[#0D7A6F] underline decoration-[#0D7A6F] underline-offset-8'
                      : 'hover:text-[#0F1E2E]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="hidden items-center shrink-0 md:flex">
            <Link
              to={user ? dashboardPath : '/register/worker'}
              className="rounded-lg bg-[#0D7A6F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0A645B] whitespace-nowrap shrink-0"
            >
              {user ? t.navDashboard : t.navGetStarted}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu drawer */}
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {navLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to={user ? dashboardPath : '/register/worker'}
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-lg bg-[#0D7A6F] px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-[#0A645B]"
              >
                {user ? t.navDashboard : t.navGetStarted}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-display text-sm font-semibold text-[#0F1E2E]">
              CareBridge – Migrant Health Records
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Digital Health Record Management System for Migrant Workers in Kerala · Aligned with
              UN SDG 3, SDG 8, and SDG 10 · Academic Prototype
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
            <Link to="/about" className="hover:text-[#0D7A6F]">
              {t.navAbout}
            </Link>
            <Link to="/register/worker" className="hover:text-[#0D7A6F]">
              {t.registerWorkerLink}
            </Link>
            <Link to="/register/provider" className="hover:text-[#0D7A6F]">
              {t.registerProviderLink}
            </Link>
            <Link to="/language" className="hover:text-[#0D7A6F]">
              {t.navLanguage}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
