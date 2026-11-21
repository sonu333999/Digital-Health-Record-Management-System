import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  auth,
  createUserWithEmailAndPassword,
  googleAuthProvider,
  signInWithPopup,
  updateProfile,
} from '../lib/firebase.ts';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api, extractApiError } from '../services/api.ts';
import { BLOOD_GROUPS, KERALA_DISTRICTS, SUPPORTED_LANGUAGES } from '../shared/constants.ts';

export function WorkerRegisterPage() {
  const { firebaseUser, user, needsRegistration, refreshSession, pushToast } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [district, setDistrict] = useState<string>('Ernakulam');
  const [originState, setOriginState] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ml' | 'hi' | 'bn'>('en');
  const [bloodGroup, setBloodGroup] = useState<string>('Unknown');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate(
        user.role === 'PROVIDER'
          ? '/provider/dashboard'
          : user.role === 'ADMIN'
            ? '/admin/dashboard'
            : '/worker/dashboard',
        { replace: true }
      );
    }
  }, [user, navigate]);

  useEffect(() => {
    if (firebaseUser) {
      if (!fullName && firebaseUser.displayName) setFullName(firebaseUser.displayName);
      if (!email && firebaseUser.email) setEmail(firebaseUser.email);
    }
  }, [firebaseUser, fullName, email]);

  const completeProfileRegistration = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('Please authenticate first.');
    const token = await current.getIdToken();

    await api.post(
      '/auth/register',
      {
        role: 'WORKER',
        fullName: fullName.trim() || current.displayName || 'CareBridge Worker',
        phoneNumber: phoneNumber.trim(),
        district,
        originState: originState.trim() || undefined,
        preferredLanguage,
        bloodGroup,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await refreshSession();
    pushToast('success', 'Worker account and emergency QR created successfully.');
    navigate('/worker/dashboard', { replace: true });
  };

  const handleGoogleConnect = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await refreshSession();
    } catch (err) {
      setError((err as Error)?.message || 'Google Sign-In failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!firebaseUser) {
        if (authMode === 'google') {
          await signInWithPopup(auth, googleAuthProvider);
        } else {
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
          }
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }
      }
      await completeProfileRegistration();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password provider is not yet enabled in Firebase Console. Switch to "Google Sign-In" above to register immediately.'
        );
      } else {
        setError(extractApiError(err, 'Unable to complete registration.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0F1E2E]">
                Worker Registration
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Create your portable CareBridge Health ID and multilingual medical vault.
              </p>
            </div>
            <Link
              to="/register/provider"
              className="text-xs font-medium text-[#0D7A6F] hover:underline whitespace-nowrap"
            >
              Registering as a Doctor / Clinic?
            </Link>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
              {error}
            </div>
          )}

          {!firebaseUser ? (
            <div className="mt-6">
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('google')}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    authMode === 'google'
                      ? 'bg-white text-[#0F1E2E] shadow-xs'
                      : 'text-slate-600 hover:text-[#0F1E2E]'
                  }`}
                >
                  Google Sign-In (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('email')}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    authMode === 'email'
                      ? 'bg-white text-[#0F1E2E] shadow-xs'
                      : 'text-slate-600 hover:text-[#0F1E2E]'
                  }`}
                >
                  Email & Password
                </button>
              </div>

              {authMode === 'google' && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs text-slate-600">
                    Connect your Google account first, or fill in your profile below and click
                    Create Worker Account to connect in one step.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleConnect}
                    disabled={submitting}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Connect Google Account
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-teal-200 bg-[#EEF7F6] px-4 py-3 text-xs text-[#0F1E2E]">
              Authenticated as <span className="font-mono font-medium">{firebaseUser.email}</span>.
              {needsRegistration
                ? ' Complete your worker profile below to activate your CareBridge Health ID.'
                : ''}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {!firebaseUser && authMode === 'email' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Email address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="worker@example.com"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Mandal"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98470 XXXXX"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Kerala District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Preferred Language</label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'ml' | 'hi' | 'bn')}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.nativeLabel})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Home State</label>
                <input
                  type="text"
                  value={originState}
                  onChange={(e) => setOriginState(e.target.value)}
                  placeholder="e.g. West Bengal, Odisha"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Emergency Contact Name</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Family member or supervisor"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Emergency Phone</label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link to="/login" className="text-xs font-medium text-slate-600 hover:underline">
                Already registered? Sign in
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Worker Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
