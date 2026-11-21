import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { ConfirmModal } from '../../components/ConfirmModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';

interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: 'WORKER' | 'PROVIDER' | 'ADMIN';
  preferredLanguage: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  workerCode: string | null;
  workerDistrict: string | null;
  hospitalName: string | null;
  registrationNumber: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return 'Never';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function UserManagementPage() {
  const { user: currentUser, t, pushToast } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pendingTarget, setPendingTarget] = useState<AdminUserRow | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get<{ users: AdminUserRow[] }>('/admin/users', { params });
      setUsers(res.data.users);
    } catch (error) {
      pushToast('error', extractApiError(error));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, pushToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleConfirmToggle = async () => {
    if (!pendingTarget) return;
    setUpdating(true);
    try {
      const nextActive = !pendingTarget.isActive;
      await api.patch(`/admin/users/${pendingTarget.id}/status`, { isActive: nextActive });
      setUsers((prev) =>
        prev.map((row) => (row.id === pendingTarget.id ? { ...row, isActive: nextActive } : row))
      );
      pushToast(
        'success',
        nextActive
          ? `${pendingTarget.fullName} has been reactivated.`
          : `${pendingTarget.fullName} has been deactivated.`
      );
      setPendingTarget(null);
    } catch (error) {
      pushToast('error', extractApiError(error));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AppShell breadcrumb="Administrator / Directory" title={t.navUserManagement}>
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by full name or email address..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-[#0F1E2E] placeholder:text-slate-400 focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/15"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0F1E2E] focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/15"
              >
                <option value="ALL">All Roles</option>
                <option value="WORKER">Migrant Workers</option>
                <option value="PROVIDER">Healthcare Providers</option>
                <option value="ADMIN">Administrators</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0F1E2E] focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/15"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-[#0F1E2E]">Registered Accounts</h2>
            <span className="text-xs text-slate-500 tabular-nums">{users.length} accounts</span>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-[#0D7A6F]" />
              <span>{t.loadingText}</span>
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No accounts matched the current search or filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Account</th>
                    <th className="px-6 py-3">Role & Affiliation</th>
                    <th className="px-6 py-3">Registered</th>
                    <th className="px-6 py-3">Last Login</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((row) => {
                    const isSelf = row.id === currentUser?.id;
                    const affiliation =
                      row.role === 'WORKER'
                        ? [row.workerCode, row.workerDistrict].filter(Boolean).join(' · ') ||
                          'Worker Vault'
                        : row.role === 'PROVIDER'
                          ? [row.hospitalName, row.registrationNumber]
                              .filter(Boolean)
                              .join(' · ') || 'Healthcare Provider'
                          : 'Platform Governance';

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <p className="font-medium text-[#0F1E2E]">{row.fullName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{row.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{row.role}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                            {affiliation}
                          </p>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                          {formatDate(row.lastLoginAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {row.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D7A6F]">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                              <ShieldOff className="h-3.5 w-3.5" />
                              Deactivated
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isSelf ? (
                            <span className="text-xs text-slate-400">Current session</span>
                          ) : row.isActive ? (
                            <button
                              type="button"
                              onClick={() => setPendingTarget(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 whitespace-nowrap shrink-0"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span>Deactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingTarget(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0D7A6F]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#0D7A6F] transition-colors hover:bg-[#EEF7F6] whitespace-nowrap shrink-0"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Reactivate</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        open={Boolean(pendingTarget)}
        title={pendingTarget?.isActive ? 'Deactivate User Account' : 'Reactivate User Account'}
        description={
          pendingTarget?.isActive
            ? `Deactivating ${pendingTarget.fullName} (${pendingTarget.email}) will immediately block API access for this account while preserving audit history and stored records.`
            : `Reactivating ${pendingTarget?.fullName} (${pendingTarget?.email}) will restore authenticated access to their ${pendingTarget?.role.toLowerCase()} workspace.`
        }
        confirmLabel={pendingTarget?.isActive ? 'Deactivate Account' : 'Reactivate Account'}
        destructive={Boolean(pendingTarget?.isActive)}
        loading={updating}
        onConfirm={handleConfirmToggle}
        onCancel={() => setPendingTarget(null)}
      />
    </AppShell>
  );
}
