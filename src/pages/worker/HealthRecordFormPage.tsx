import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';
import { RECORD_CATEGORIES, type RecordCategory } from '../../shared/constants.ts';

export function HealthRecordFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pushToast } = useAuth();

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: 'General Checkup' as RecordCategory,
    visitDate: new Date().toISOString().slice(0, 10),
    diagnosis: '',
    doctorName: '',
    hospitalName: '',
    prescriptionDetails: '',
    medicationDetails: '',
    laboratoryResults: '',
    medicalNotes: '',
  });

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let cancelled = false;
    api
      .get(`/worker/records/${id}`)
      .then((res) => {
        if (cancelled) return;
        const r = res.data.record;
        setForm({
          title: r.title || '',
          category: (r.category || 'General Checkup') as RecordCategory,
          visitDate: r.visitDate || new Date().toISOString().slice(0, 10),
          diagnosis: r.diagnosis || '',
          doctorName: r.doctorName || '',
          hospitalName: r.hospitalName || '',
          prescriptionDetails: r.prescriptionDetails || '',
          medicationDetails: r.medicationDetails || '',
          laboratoryResults: r.laboratoryResults || '',
          medicalNotes: r.medicalNotes || '',
        });
      })
      .catch((err) => {
        if (!cancelled) pushToast('error', extractApiError(err, 'Unable to load record.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, id, pushToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        diagnosis: form.diagnosis.trim() || null,
        doctorName: form.doctorName.trim() || null,
        hospitalName: form.hospitalName.trim() || null,
        prescriptionDetails: form.prescriptionDetails.trim() || null,
        medicationDetails: form.medicationDetails.trim() || null,
        laboratoryResults: form.laboratoryResults.trim() || null,
        medicalNotes: form.medicalNotes.trim() || null,
      };

      if (mode === 'edit' && id) {
        await api.put(`/worker/records/${id}`, payload);
        pushToast('success', 'Health record updated in PostgreSQL.');
        navigate(`/worker/records/${id}`);
      } else {
        const { data } = await api.post('/worker/records', payload);
        pushToast('success', 'New health record created.');
        navigate(`/worker/records/${data.record.id}`);
      }
    } catch (err) {
      pushToast('error', extractApiError(err, 'Unable to save health record.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      breadcrumb={`Worker / Health Records / ${mode === 'edit' ? 'Edit' : 'Add Record'}`}
      title={mode === 'edit' ? 'Edit Health Record' : 'Add Health Record'}
    >
      <div className="mb-4">
        <Link
          to="/worker/records"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#0D7A6F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Health Records
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0D7A6F]" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Record Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Fever Consultation & Blood Panel"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as RecordCategory })}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {RECORD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Visit Date *</label>
              <input
                type="date"
                required
                value={form.visitDate}
                onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Doctor Name</label>
              <input
                type="text"
                value={form.doctorName}
                onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                placeholder="Dr. Meera Nair"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Hospital / Clinic</label>
              <input
                type="text"
                value={form.hospitalName}
                onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                placeholder="Ernakulam General Hospital"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Diagnosis or Medical Observation
              </label>
              <input
                type="text"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="Explicit diagnosis or observation written by clinician"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Prescription Details
              </label>
              <textarea
                rows={3}
                value={form.prescriptionDetails}
                onChange={(e) => setForm({ ...form, prescriptionDetails: e.target.value })}
                placeholder="Dosage schedule, duration, special precautions"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Medication Summary
              </label>
              <input
                type="text"
                value={form.medicationDetails}
                onChange={(e) => setForm({ ...form, medicationDetails: e.target.value })}
                placeholder="e.g. Amlodipine 5mg OD, Paracetamol 500mg SOS"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Laboratory Results</label>
              <textarea
                rows={3}
                value={form.laboratoryResults}
                onChange={(e) => setForm({ ...form, laboratoryResults: e.target.value })}
                placeholder="e.g. Hemoglobin 14.1 g/dL, BP 128/80 mmHg, Fasting Glucose 96 mg/dL"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Medical Notes</label>
              <textarea
                rows={3}
                value={form.medicalNotes}
                onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
                placeholder="Follow-up instructions or personal clinical reminders"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Link
              to="/worker/records"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0D7A6F] px-5 py-2 text-sm font-medium text-white hover:bg-[#0A645B] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {mode === 'edit' ? 'Save Updates' : 'Create Record'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
