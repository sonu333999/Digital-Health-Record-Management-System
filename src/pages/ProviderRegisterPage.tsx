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
import { KERALA_DISTRICTS } from '../shared/constants.ts';

export function ProviderRegisterPage() {
  const { firebaseUser, user, refreshSession, pushToast } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [designation, setDesignation] = useState('Medical Officer');
  const [hospitalName, setHospitalName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [district, setDistrict] = useState<string>('Ernakulam');
  const [address, setAddress] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!firebaseUser) {
        if (authMode === 'google') {
          await signInWithPopup(auth, googleAuthProvider);
        } else {
          if (password.length < 6) throw new Error('Password must be at least 6 characters.');
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }
      }

      const current = auth.currentUser;
      if (!current) throw new Error('Authentication failed.');
      const token = await current.getIdToken();

      await api.post(
        '/auth/register',
        {
          role: 'PROVIDER',
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          designation: designation.trim(),
          hospitalName: hospitalName.trim(),
          registrationNumber: registrationNumber.trim(),
          district,
          address: address.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await refreshSession();
      pushToast('success', 'Healthcare provider account registered.');
      navigate('/provider/dashboard', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password provider is not yet enabled in Firebase Console. Switch to "Google Sign-In" to register immediately.'
        );
      } else {
        setError(extractApiError(err, 'Unable to register healthcare provider.'));
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
                Healthcare Provider Registration
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Register as a clinician or hospital medical officer to request worker consent.
              </p>
            </div>
            <Link
              to="/register/worker"
              className="text-xs font-medium text-[#0D7A6F] hover:underline whitespace-nowrap"
            >
              Registering as a Worker?
            </Link>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
              {error}
            </div>
          )}

          {!firebaseUser && (
            <div className="mt-6 inline-flex rounded-lg bg-slate-100 p-1">
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
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!firebaseUser && authMode === 'email' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.in"
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
                  placeholder="Dr. Meera Nair"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Designation *</label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Senior Medical Officer"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Hospital / Clinic Name *
                </label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Ernakulam General Hospital"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Medical Registration ID *
                </label>
                <input
                  type="text"
                  required
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. TCMC-54820"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 484 236 XXXX"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">District</label>
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
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Clinic / Hospital Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, Town, Kerala PIN"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <Link to="/login" className="text-xs font-medium text-slate-600 hover:underline">
                Already have an account? Sign in
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete Provider Registration
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
