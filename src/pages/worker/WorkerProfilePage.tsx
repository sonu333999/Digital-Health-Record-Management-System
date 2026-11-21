import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import {
  BLOOD_GROUPS,
  KERALA_DISTRICTS,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '../../shared/constants.ts';

export function WorkerProfilePage() {
  const { refreshSession, setLanguage, pushToast, t } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workerCode, setWorkerCode] = useState('');
  const [email, setEmail] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    profilePhotoUrl: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    nationality: 'Indian',
    originState: '',
    preferredLanguage: 'en' as LanguageCode,
    currentAddress: '',
    district: 'Ernakulam',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    shareEmergencyContact: true,
    bloodGroup: 'Unknown',
    knownAllergies: '',
    chronicConditions: '',
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/worker/profile')
      .then((res) => {
        if (cancelled) return;
        const p = res.data.profile;
        setWorkerCode(p.workerCode || '');
        setEmail(p.email || '');
        setForm({
          fullName: p.fullName || '',
          profilePhotoUrl: p.profilePhotoUrl || '',
          dateOfBirth: p.dateOfBirth || '',
          gender: p.gender || '',
          phoneNumber: p.phoneNumber || '',
          nationality: p.nationality || 'Indian',
          originState: p.originState || '',
          preferredLanguage: (p.preferredLanguage || 'en') as LanguageCode,
          currentAddress: p.currentAddress || '',
          district: p.district || 'Ernakulam',
          emergencyContactName: p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
          emergencyContactRelation: p.emergencyContactRelation || '',
          shareEmergencyContact: Boolean(p.shareEmergencyContact),
          bloodGroup: p.bloodGroup || 'Unknown',
          knownAllergies: p.knownAllergies || '',
          chronicConditions: p.chronicConditions || '',
        });
      })
      .catch((err) => {
        pushToast('error', extractApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/worker/profile', {
        ...form,
        profilePhotoUrl: form.profilePhotoUrl.trim() || null,
        dateOfBirth: form.dateOfBirth.trim() || null,
        gender: form.gender.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        originState: form.originState.trim() || null,
        currentAddress: form.currentAddress.trim() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        emergencyContactRelation: form.emergencyContactRelation.trim() || null,
        knownAllergies: form.knownAllergies.trim() || null,
        chronicConditions: form.chronicConditions.trim() || null,
      });
      await setLanguage(form.preferredLanguage);
      await refreshSession();
      pushToast('success', 'Worker profile and personal health information saved.');
    } catch (err) {
      pushToast('error', extractApiError(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell breadcrumb="Worker / Profile" title={t.navProfile}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
                  Personal & Contact Details
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Worker Health ID:{' '}
                  <span className="font-mono font-medium text-[#0F1E2E]">{workerCode}</span> ·{' '}
                  {email}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Nationality</label>
                <input
                  type="text"
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Home State</label>
                <input
                  type="text"
                  value={form.originState}
                  onChange={(e) => setForm({ ...form, originState: e.target.value })}
                  placeholder="e.g. West Bengal, Bihar, Assam"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Kerala District</label>
                <select
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
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
                <label className="block text-xs font-medium text-slate-700">
                  Preferred Language
                </label>
                <select
                  value={form.preferredLanguage}
                  onChange={(e) =>
                    setForm({ ...form, preferredLanguage: e.target.value as LanguageCode })
                  }
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
                <label className="block text-xs font-medium text-slate-700">Profile Photo URL</label>
                <input
                  type="text"
                  value={form.profilePhotoUrl}
                  onChange={(e) => setForm({ ...form, profilePhotoUrl: e.target.value })}
                  placeholder="Optional image URL"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700">
                Current Residential Address in Kerala
              </label>
              <textarea
                rows={2}
                value={form.currentAddress}
                onChange={(e) => setForm({ ...form, currentAddress: e.target.value })}
                placeholder="Quarters / Camp / Street, Town, District, PIN"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Critical Health Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-semibold text-[#0F1E2E]">
              Critical Medical & Emergency Profile
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Blood group, allergies, and chronic conditions are shown on your restricted Emergency
              QR Card.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Blood Group</label>
                <select
                  value={form.bloodGroup}
                  onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Known Allergies</label>
                <input
                  type="text"
                  value={form.knownAllergies}
                  onChange={(e) => setForm({ ...form, knownAllergies: e.target.value })}
                  placeholder="e.g. Penicillin, Aspirin, Peanuts"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Chronic Conditions
                </label>
                <input
                  type="text"
                  value={form.chronicConditions}
                  onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={form.emergencyContactName}
                  onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={form.emergencyContactPhone}
                  onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Relationship</label>
                <input
                  type="text"
                  value={form.emergencyContactRelation}
                  onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
                  placeholder="Spouse / Brother / Site Manager"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.shareEmergencyContact}
                onChange={(e) => setForm({ ...form, shareEmergencyContact: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#0D7A6F]"
              />
              Allow emergency responders to view my emergency contact when scanning my Emergency QR
              card
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t.saveChanges}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
