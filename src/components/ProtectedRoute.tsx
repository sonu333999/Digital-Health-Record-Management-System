import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { UserRole } from '../shared/constants.ts';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { loading, firebaseUser, user, needsRegistration, accountDeactivated, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFB] text-slate-600">
        <Loader2 className="h-7 w-7 animate-spin text-[#0D7A6F]" />
        <p className="mt-3 text-sm font-medium">Verifying your secure session...</p>
      </div>
    );
  }

  if (accountDeactivated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFB] px-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
            <ShieldOff className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#0F1E2E]">Account Deactivated</h2>
          <p className="mt-2 text-sm text-slate-600">
            This CareBridge account has been deactivated by an administrator. Contact your district
            health coordinator for assistance.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-6 rounded-lg bg-[#0F1E2E] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (needsRegistration || !user) {
    return <Navigate to="/register/worker" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home =
      user.role === 'PROVIDER'
        ? '/provider/dashboard'
        : user.role === 'ADMIN'
          ? '/admin/dashboard'
          : '/worker/dashboard';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
