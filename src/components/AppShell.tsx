import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  ClipboardList,
  FilePlus2,
  FileScan,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCircle,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppShellProps {
  breadcrumb: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ breadcrumb, title, action, children }: AppShellProps) {
  const { user, workerProfile, providerProfile, t, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const workerNav: NavItem[] = [
    { to: '/worker/dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { to: '/worker/profile', label: t.navProfile, icon: UserCircle },
    { to: '/worker/records', label: t.navHealthRecords, icon: FileText },
    { to: '/worker/records/new', label: t.navAddRecord, icon: FilePlus2 },
    { to: '/worker/documents/upload', label: t.navUploadDocument, icon: Upload },
    { to: '/worker/documents', label: t.navOcrResults, icon: FileScan },
    { to: '/worker/ai-summaries', label: t.navAiSummaries, icon: Sparkles },
    { to: '/worker/consents', label: t.navConsents, icon: ShieldCheck },
    { to: '/worker/emergency-qr', label: t.navEmergencyQr, icon: QrCode },
  ];

  const providerNav: NavItem[] = [
    { to: '/provider/dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { to: '/provider/search', label: t.navWorkerSearch, icon: Search },
    { to: '/provider/requests', label: t.navAccessRequests, icon: UserPlus },
    { to: '/provider/records', label: t.navAuthorizedRecords, icon: ClipboardList },
  ];

  const adminNav: NavItem[] = [
    { to: '/admin/dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { to: '/admin/users', label: t.navUserManagement, icon: Users },
    { to: '/admin/audit-logs', label: t.navAuditLogs, icon: Activity },
  ];

  const sharedNav: NavItem[] = [
    { to: '/notifications', label: t.navNotifications, icon: Bell },
    { to: '/language', label: t.navLanguage, icon: Globe },
    { to: '/settings', label: t.navSettings, icon: Settings },
  ];

  const roleNav =
    user?.role === 'PROVIDER'
      ? providerNav
      : user?.role === 'ADMIN'
        ? adminNav
        : workerNav;

  const roleCaption =
    user?.role === 'PROVIDER'
      ? `${providerProfile?.hospitalName || 'Healthcare Provider'}`
      : user?.role === 'ADMIN'
        ? 'System Administration'
        : `${workerProfile?.workerCode || 'Worker Vault'}`;

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const renderSidebarLinks = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-[#0F1E2E] whitespace-nowrap"
        >
          CareBridge
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Signed-in identity block */}
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="truncate text-sm font-semibold text-[#0F1E2E]">{user?.fullName}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-slate-500 tabular-nums">
          {roleCaption}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {roleNav.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== '/worker/records' &&
                item.to !== '/worker/documents' &&
                location.pathname.startsWith(`${item.to}/`));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#EEF7F6] text-[#0D7A6F]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F1E2E]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="my-4 border-t border-slate-100" />

        <div className="space-y-1">
          {sharedNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#EEF7F6] text-[#0D7A6F]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F1E2E]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{t.navSignOut}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFB] text-[#0F1E2E]">
      {/* Desktop fixed sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{renderSidebarLinks()}</div>
      </aside>

      {/* Mobile slide-over sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#0F1E2E]/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-white shadow-xl">
            {renderSidebarLinks()}
          </aside>
        </div>
      )}

      {/* Main viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">{breadcrumb}</p>
              <h1 className="truncate text-base font-semibold text-[#0F1E2E] sm:text-lg">
                {title}
              </h1>
            </div>
          </div>

          {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
