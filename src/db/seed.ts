import * as dotenv from 'dotenv';
dotenv.config();

import { db } from './index.ts';
import {
  users,
  workerProfiles,
  providerProfiles,
  healthRecords,
  consentRecords,
  emergencyTokens,
  auditLogs,
  notifications,
} from './schema.ts';

/**
 * Idempotent fictional demo seed script for CareBridge.
 * Run manually via: npx tsx src/db/seed.ts
 */
export async function seedDemoData() {
  await db
    .insert(users)
    .values([
      {
        id: '11111111-1111-4111-8111-111111111101',
        firebaseUid: 'demo_uid_worker_ramesh',
        email: 'ramesh.mandal@demo.carebridge.in',
        fullName: 'Ramesh Mandal',
        role: 'WORKER',
        preferredLanguage: 'bn',
        isActive: true,
      },
      {
        id: '11111111-1111-4111-8111-111111111102',
        firebaseUid: 'demo_uid_worker_abdul',
        email: 'abdul.karim@demo.carebridge.in',
        fullName: 'Abdul Karim',
        role: 'WORKER',
        preferredLanguage: 'hi',
        isActive: true,
      },
      {
        id: '22222222-2222-4222-8222-222222222201',
        firebaseUid: 'demo_uid_provider_meera',
        email: 'dr.meera.nair@demo.carebridge.in',
        fullName: 'Dr. Meera Nair',
        role: 'PROVIDER',
        preferredLanguage: 'en',
        isActive: true,
      },
      {
        id: '33333333-3333-4333-8333-333333333301',
        firebaseUid: 'demo_uid_admin_ananya',
        email: 'admin@demo.carebridge.in',
        fullName: 'Ananya Thomas',
        role: 'ADMIN',
        preferredLanguage: 'en',
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(workerProfiles)
    .values([
      {
        id: 'aaaa1111-1111-4111-8111-111111111101',
        userId: '11111111-1111-4111-8111-111111111101',
        workerCode: 'CB-KL-2026-1001',
        fullName: 'Ramesh Mandal',
        dateOfBirth: '1994-05-14',
        gender: 'Male',
        phoneNumber: '+91 98470 11201',
        email: 'ramesh.mandal@demo.carebridge.in',
        nationality: 'Indian',
        originState: 'West Bengal',
        preferredLanguage: 'bn',
        currentAddress: 'Ward 12, Timber Mill Quarters, Perumbavoor, Ernakulam, Kerala 683542',
        district: 'Ernakulam',
        emergencyContactName: 'Sunita Mandal',
        emergencyContactPhone: '+91 97321 44810',
        emergencyContactRelation: 'Spouse',
        shareEmergencyContact: true,
        bloodGroup: 'O+',
        knownAllergies: 'Penicillin, Sulfonamides',
        chronicConditions: 'Mild Essential Hypertension',
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(providerProfiles)
    .values([
      {
        id: 'bbbb2222-2222-4222-8222-222222222201',
        userId: '22222222-2222-4222-8222-222222222201',
        fullName: 'Dr. Meera Nair',
        email: 'dr.meera.nair@demo.carebridge.in',
        phoneNumber: '+91 484 236 1251',
        designation: 'Senior Medical Officer',
        hospitalName: 'Ernakulam General Hospital',
        registrationNumber: 'TCMC-48291',
        address: 'Hospital Road, Marine Drive, Ernakulam, Kerala 682011',
        district: 'Ernakulam',
        isVerified: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(emergencyTokens)
    .values([
      {
        id: 'eeee5555-5555-4555-8555-555555555501',
        workerId: 'aaaa1111-1111-4111-8111-111111111101',
        token: 'demo-ramesh-kerala-emg-9a7f3c2e1b8d4056a2c7e9f10b4d6832',
        emergencyIdentifier: 'EMG-KL-9A7F3',
        isActive: true,
        shareEmergencyContact: true,
        accessCount: 2,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(healthRecords)
    .values([
      {
        id: 'cccc3333-3333-4333-8333-333333333301',
        workerId: 'aaaa1111-1111-4111-8111-111111111101',
        createdByUserId: '22222222-2222-4222-8222-222222222201',
        createdByRole: 'PROVIDER',
        title: 'Annual Occupational Health & Blood Pressure Review',
        category: 'General Checkup',
        diagnosis: 'Stage 1 Essential Hypertension (Controlled)',
        doctorName: 'Dr. Meera Nair',
        hospitalName: 'Ernakulam General Hospital',
        visitDate: '2026-09-18',
        prescriptionDetails: 'Tab. Amlodipine 5mg OD morning after breakfast for 30 days.',
        medicationDetails: 'Amlodipine 5mg once daily',
        laboratoryResults: 'BP: 134/84 mmHg; Pulse: 76 bpm; SpO2: 99%; Fasting Glucose: 94 mg/dL',
        medicalNotes: 'Good medication adherence.',
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(consentRecords)
    .values([
      {
        id: 'dddd4444-4444-4444-8444-444444444401',
        workerId: 'aaaa1111-1111-4111-8111-111111111101',
        providerId: 'bbbb2222-2222-4222-8222-222222222201',
        permittedCategories: ['General Checkup', 'Prescription', 'Laboratory Report', 'Vaccination', 'Chronic Disease'],
        purpose: 'Ongoing hypertension management and occupational health follow-up',
        canAddRecords: true,
        canEditRecords: true,
        status: 'ACTIVE',
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(auditLogs)
    .values([
      {
        id: 'ffff6666-6666-4666-8666-666666666601',
        actorUserId: '11111111-1111-4111-8111-111111111101',
        actorRole: 'WORKER',
        actorEmail: 'ramesh.mandal@demo.carebridge.in',
        targetWorkerId: 'aaaa1111-1111-4111-8111-111111111101',
        action: 'CONSENT_GRANTED',
        resourceType: 'consent_records',
        resourceId: 'dddd4444-4444-4444-8444-444444444401',
        details: { provider: 'Dr. Meera Nair' },
        ipAddress: '127.0.0.1',
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(notifications)
    .values([
      {
        id: '99997777-7777-4777-8777-777777777701',
        userId: '11111111-1111-4111-8111-111111111101',
        type: 'RECORD_ADDED',
        title: 'New Health Record Added',
        message: 'Dr. Meera Nair added an occupational health review under your active consent.',
        linkUrl: '/worker/records/cccc3333-3333-4333-8333-333333333301',
        isRead: false,
      },
    ])
    .onConflictDoNothing();

  console.log('CareBridge fictional demo seed completed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
