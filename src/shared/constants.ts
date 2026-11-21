export const RECORD_CATEGORIES = [
  'General Checkup',
  'Prescription',
  'Laboratory Report',
  'Vaccination',
  'Hospitalization',
  'Discharge Summary',
  'Chronic Disease',
  'Other',
] as const;

export type RecordCategory = (typeof RECORD_CATEGORIES)[number];

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
] as const;

export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'Unknown',
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', region: 'Global / Clinical' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', region: 'Kerala' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', region: 'Northern & Central India' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', region: 'West Bengal & Assam' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export type UserRole = 'WORKER' | 'PROVIDER' | 'ADMIN';

export const AI_SUMMARY_DISCLAIMER =
  'AI-generated summaries are for informational support only and must be reviewed by a qualified healthcare professional.';

export const ALLOWED_DOCUMENT_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const DEMO_EMERGENCY_TOKEN =
  'demo-ramesh-kerala-emg-9a7f3c2e1b8d4056a2c7e9f10b4d6832';
