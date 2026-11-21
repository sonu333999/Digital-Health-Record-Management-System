import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, signOut as firebaseSignOut } from '../lib/firebase.ts';
import { api, extractApiError } from '../services/api.ts';
import { TRANSLATIONS, type TranslationKeys } from '../i18n/translations.ts';
import type { LanguageCode, UserRole } from '../shared/constants.ts';

export interface AppUser {
  id: string;
  firebaseUid: string;
  email: string;
  fullName: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface WorkerProfileData {
  id: string;
  userId: string;
  workerCode: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
  email: string;
  nationality: string | null;
  originState: string | null;
  preferredLanguage: LanguageCode;
  currentAddress: string | null;
  district: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  shareEmergencyContact: boolean;
  bloodGroup: string | null;
  knownAllergies: string | null;
  chronicConditions: string | null;
}

export interface ProviderProfileData {
  id: string;
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  email: string;
  phoneNumber: string | null;
  designation: string;
  hospitalName: string;
  registrationNumber: string;
  address: string | null;
  district: string | null;
  isVerified: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  workerProfile: WorkerProfileData | null;
  providerProfile: ProviderProfileData | null;
  needsRegistration: boolean;
  canEvaluateRoles: boolean;
  loading: boolean;
  accountDeactivated: boolean;
  language: LanguageCode;
  t: TranslationKeys;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  switchEvaluationRole: (role: UserRole) => Promise<void>;
  toasts: ToastMessage[];
  pushToast: (type: ToastMessage['type'], message: string) => void;
  dismissToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfileData | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfileData | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [canEvaluateRoles, setCanEvaluateRoles] = useState(false);
  const [accountDeactivated, setAccountDeactivated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const hydrateSession = useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setWorkerProfile(null);
      setProviderProfile(null);
      setNeedsRegistration(false);
      setCanEvaluateRoles(false);
      setAccountDeactivated(false);
      setLoading(false);
      return;
    }

    try {
      const token = await fbUser.getIdToken();
      const { data } = await api.get('/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.needsRegistration) {
        setUser(null);
        setWorkerProfile(null);
        setProviderProfile(null);
        setNeedsRegistration(true);
        setCanEvaluateRoles(Boolean(data.canEvaluateRoles));
        setAccountDeactivated(false);
      } else {
        setUser(data.user);
        setWorkerProfile(data.workerProfile || null);
        setProviderProfile(data.providerProfile || null);
        setNeedsRegistration(false);
        setCanEvaluateRoles(Boolean(data.canEvaluateRoles));
        setAccountDeactivated(false);
        const prefLang = data.user?.preferredLanguage as LanguageCode | undefined;
        if (prefLang && TRANSLATIONS[prefLang]) {
          setLanguageState(prefLang);
        }
      }
    } catch (error: unknown) {
      const msg = extractApiError(error);
      if (msg.toLowerCase().includes('deactivated')) {
        setAccountDeactivated(true);
      }
      setUser(null);
      setWorkerProfile(null);
      setProviderProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setLoading(true);
      hydrateSession(fbUser);
    });
    return () => unsub();
  }, [hydrateSession]);

  const refreshSession = useCallback(async () => {
    await hydrateSession(auth.currentUser);
  }, [hydrateSession]);

  const setLanguage = useCallback(
    async (lang: LanguageCode) => {
      setLanguageState(lang);
      if (user) {
        try {
          await api.patch('/auth/language', { language: lang });
          setUser((prev) => (prev ? { ...prev, preferredLanguage: lang } : prev));
        } catch (error) {
          pushToast('error', extractApiError(error));
          return;
        }
      }
      pushToast('success', TRANSLATIONS[lang].languageSavedToast);
    },
    [user, pushToast]
  );

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setWorkerProfile(null);
    setProviderProfile(null);
    setNeedsRegistration(false);
    setCanEvaluateRoles(false);
    pushToast('info', 'Signed out safely.');
  }, [pushToast]);

  const switchEvaluationRole = useCallback(
    async (role: UserRole) => {
      try {
        const { data } = await api.post('/auth/switch-evaluation-role', { role });
        setUser(data.user);
        setWorkerProfile(data.workerProfile || null);
        setProviderProfile(data.providerProfile || null);
        pushToast('success', `Active role switched to ${role}.`);
      } catch (error) {
        pushToast('error', extractApiError(error));
        throw error;
      }
    },
    [pushToast]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      user,
      workerProfile,
      providerProfile,
      needsRegistration,
      canEvaluateRoles,
      loading,
      accountDeactivated,
      language,
      t: TRANSLATIONS[language],
      setLanguage,
      refreshSession,
      logout,
      switchEvaluationRole,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      firebaseUser,
      user,
      workerProfile,
      providerProfile,
      needsRegistration,
      canEvaluateRoles,
      loading,
      accountDeactivated,
      language,
      setLanguage,
      refreshSession,
      logout,
      switchEvaluationRole,
      toasts,
      pushToast,
      dismissToast,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
