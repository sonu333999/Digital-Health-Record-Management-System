import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock } from 'lucide-react';
import {
  auth,
  googleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from '../lib/firebase.ts';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { useAuth } from '../context/AuthContext.tsx';

function formatFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not yet enabled in Firebase Console. Please enable Email/Password in Firebase Authentication settings or continue with Google Sign-In.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email address or password. Please verify your credentials or reset your password.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google Sign-In popup was closed before completion.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many login attempts. Please wait a few minutes and try again.';
  }
  return (err as Error)?.message || 'Unable to sign in right now.';
}

export function LoginPage() {
  const { user, needsRegistration, refreshSession, t, pushToast } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const dest =
        user.role === 'PROVIDER'
          ? '/provider/dashboard'
          : user.role === 'ADMIN'
            ? '/admin/dashboard'
            : '/worker/dashboard';
      navigate(dest, { replace: true });
    } else if (needsRegistration) {
      navigate('/register/worker', { replace: true });
    }
  }, [user, needsRegistration, navigate]);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await refreshSession();
      pushToast('success', 'Signed in with Google.');
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await refreshSession();
      pushToast('success', 'Signed in successfully.');
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="font-display text-2xl font-bold text-[#0F1E2E]">{t.loginTitle}</h1>
          <p className="mt-1.5 text-sm text-slate-600">{t.loginSubtitle}</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1E2E] transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="font-display text-base font-bold text-[#0D7A6F]">G</span>
            )}
            {t.continueWithGoogle}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>or sign in with email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-700">
                {t.emailLabel}
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pr-3 pl-9 text-sm text-[#0F1E2E] focus:border-[#0D7A6F] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-700">
                  {t.passwordLabel}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#0D7A6F] hover:underline"
                >
                  {t.forgotPasswordLink}
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pr-3 pl-9 text-sm text-[#0F1E2E] focus:border-[#0D7A6F] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#0D7A6F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A645B] disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : t.signInBtn}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-600">
            New to CareBridge?{' '}
            <Link to="/register/worker" className="font-medium text-[#0D7A6F] hover:underline">
              {t.registerWorkerLink}
            </Link>{' '}
            ·{' '}
            <Link to="/register/provider" className="font-medium text-[#0D7A6F] hover:underline">
              {t.registerProviderLink}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
