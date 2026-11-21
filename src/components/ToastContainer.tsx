import React from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export function ToastContainer() {
  const { toasts, dismissToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2.5"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-md transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-white text-[#0F1E2E]'
              : toast.type === 'error'
                ? 'border-red-200 bg-white text-red-900'
                : 'border-slate-200 bg-white text-[#0F1E2E]'
          }`}
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          )}
          {toast.type === 'error' && (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          )}
          {toast.type === 'info' && (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0D7A6F]" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
