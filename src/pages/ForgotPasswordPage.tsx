import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import { auth, sendPasswordResetEmail } from '../lib/firebase.ts';
import { PublicLayout } from '../components/PublicLayout.tsx';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password sign-in is not yet enabled in Firebase Console for this project.'
        );
      } else if (code === 'auth/user-not-found') {
        setError('No email/password account was found with that email address.');
      } else {
        setError((err as Error)?.message || 'Unable to send password reset email.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="font-display text-2xl font-bold text-[#0F1E2E]">Reset Password</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Enter the email address registered with CareBridge and we will send a Firebase password
            reset link.
          </p>

          {sent ? (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-medium">Password reset email sent</p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                    Check your inbox for <span className="font-mono">{email}</span> and follow the
                    instructions to choose a new password.
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                className="mt-4 inline-block text-xs font-medium text-[#0D7A6F] hover:underline"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700">Email address</label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pr-3 pl-9 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#0D7A6F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
              >
                {submitting ? 'Sending reset link...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-xs text-slate-500">
                Using Google Sign-In? Manage your password through your Google Account.{' '}
                <Link to="/login" className="font-medium text-[#0D7A6F] hover:underline">
                  Back to Sign In
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
