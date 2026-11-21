import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export interface StructuredAiSummary {
  mainObservations: string[];
  explicitDiagnosis: string[];
  medicinesMentioned: string[];
  laboratoryValues: Array<{ test: string; value: string; unit?: string; referenceRange?: string }>;
  allergies: string[];
  chronicConditions: string[];
  dates: string[];
  missingOrUncertainInfo: string[];
  disclaimer: string;
  generatedAt: string;
  modelUsed: string;
}

// 1. Users table (linked via Firebase Auth UID)
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firebaseUid: text('firebase_uid').notNull().unique(),
    email: text('email').notNull().unique(),
    fullName: text('full_name').notNull(),
    role: text('role').notNull().default('WORKER'), // 'WORKER' | 'PROVIDER' | 'ADMIN'
    preferredLanguage: text('preferred_language').notNull().default('en'), // 'en' | 'ml' | 'hi' | 'bn'
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_role').on(table.role),
    index('idx_users_is_active').on(table.isActive),
  ]
);

// 2. Worker Profiles
export const workerProfiles = pgTable(
  'worker_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    workerCode: text('worker_code').notNull().unique(),
    fullName: text('full_name').notNull(),
    profilePhotoUrl: text('profile_photo_url'),
    dateOfBirth: text('date_of_birth'),
    gender: text('gender'),
    phoneNumber: text('phone_number'),
    email: text('email').notNull(),
    nationality: text('nationality').default('Indian'),
    originState: text('origin_state'),
    preferredLanguage: text('preferred_language').notNull().default('en'),
    currentAddress: text('current_address'),
    district: text('district'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    emergencyContactRelation: text('emergency_contact_relation'),
    shareEmergencyContact: boolean('share_emergency_contact').notNull().default(true),
    bloodGroup: text('blood_group'),
    knownAllergies: text('known_allergies'),
    chronicConditions: text('chronic_conditions'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_worker_profiles_code').on(table.workerCode),
    index('idx_worker_profiles_district').on(table.district),
  ]
);

// 3. Provider Profiles
export const providerProfiles = pgTable(
  'provider_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    profilePhotoUrl: text('profile_photo_url'),
    email: text('email').notNull(),
    phoneNumber: text('phone_number'),
    designation: text('designation').notNull(),
    hospitalName: text('hospital_name').notNull(),
    registrationNumber: text('registration_number').notNull().unique(),
    address: text('address'),
    district: text('district'),
    isVerified: boolean('is_verified').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_provider_profiles_reg').on(table.registrationNumber),
    index('idx_provider_profiles_district').on(table.district),
  ]
);

// 4. Health Records
export const healthRecords = pgTable(
  'health_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workerProfiles.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdByRole: text('created_by_role').notNull().default('WORKER'),
    title: text('title').notNull(),
    category: text('category').notNull(),
    diagnosis: text('diagnosis'),
    doctorName: text('doctor_name'),
    hospitalName: text('hospital_name'),
    visitDate: text('visit_date').notNull(),
    prescriptionDetails: text('prescription_details'),
    medicationDetails: text('medication_details'),
    laboratoryResults: text('laboratory_results'),
    medicalNotes: text('medical_notes'),
    ocrExtractedText: text('ocr_extracted_text'),
    aiSummaryJson: jsonb('ai_summary_json').$type<StructuredAiSummary | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_health_records_worker_id').on(table.workerId),
    index('idx_health_records_category').on(table.category),
    index('idx_health_records_visit_date').on(table.visitDate),
  ]
);

// 5. Medical Documents (private metadata & storage reference; never public URLs)
export const medicalDocuments = pgTable(
  'medical_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workerProfiles.id, { onDelete: 'cascade' }),
    healthRecordId: uuid('health_record_id').references(() => healthRecords.id, {
      onDelete: 'set null',
    }),
    uploadedByUserId: uuid('uploaded_by_user_id')
      .notNull()
      .references(() => users.id),
    originalFileName: text('original_file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    storageProvider: text('storage_provider').notNull().default('postgres_private'),
    storageKey: text('storage_key').notNull().unique(),
    fileDataBase64: text('file_data_base64'),
    processingStatus: text('processing_status').notNull().default('UPLOADED'), // 'UPLOADED' | 'OCR_PROCESSING' | 'OCR_COMPLETED' | 'OCR_VERIFIED' | 'FAILED'
    ocrEngine: text('ocr_engine').default('gemini-multimodal'),
    ocrRawText: text('ocr_raw_text'),
    ocrVerifiedText: text('ocr_verified_text'),
    aiSummaryJson: jsonb('ai_summary_json').$type<StructuredAiSummary | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_medical_documents_worker_id').on(table.workerId),
    index('idx_medical_documents_record_id').on(table.healthRecordId),
  ]
);

// 6. Consent Records
export const consentRecords = pgTable(
  'consent_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workerProfiles.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id, { onDelete: 'cascade' }),
    permittedCategories: jsonb('permitted_categories').$type<string[]>().notNull(),
    purpose: text('purpose'),
    canAddRecords: boolean('can_add_records').notNull().default(true),
    canEditRecords: boolean('can_edit_records').notNull().default(false),
    status: text('status').notNull().default('PENDING'), // 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'REJECTED'
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_consent_records_worker_id').on(table.workerId),
    index('idx_consent_records_provider_id').on(table.providerId),
    index('idx_consent_records_status').on(table.status),
  ]
);

// 7. Emergency Tokens (cryptographically random, non-sequential)
export const emergencyTokens = pgTable(
  'emergency_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workerProfiles.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    emergencyIdentifier: text('emergency_identifier').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    shareEmergencyContact: boolean('share_emergency_contact').notNull().default(true),
    accessCount: integer('access_count').notNull().default(0),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_emergency_tokens_worker_id').on(table.workerId),
    index('idx_emergency_tokens_token').on(table.token),
  ]
);

// 8. Audit Logs
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: text('actor_role').notNull(),
    actorEmail: text('actor_email'),
    targetWorkerId: uuid('target_worker_id').references(() => workerProfiles.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    details: jsonb('details').$type<Record<string, unknown> | null>(),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_actor').on(table.actorUserId),
    index('idx_audit_logs_target_worker').on(table.targetWorkerId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_created_at').on(table.createdAt),
  ]
);

// 9. Notifications
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    linkUrl: text('link_url'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user_id').on(table.userId),
    index('idx_notifications_is_read').on(table.isRead),
  ]
);

// Drizzle ORM Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  workerProfile: one(workerProfiles, {
    fields: [users.id],
    references: [workerProfiles.userId],
  }),
  providerProfile: one(providerProfiles, {
    fields: [users.id],
    references: [providerProfiles.userId],
  }),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}));

export const workerProfilesRelations = relations(workerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [workerProfiles.userId],
    references: [users.id],
  }),
  healthRecords: many(healthRecords),
  medicalDocuments: many(medicalDocuments),
  consents: many(consentRecords),
  emergencyTokens: many(emergencyTokens),
}));

export const providerProfilesRelations = relations(providerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [providerProfiles.userId],
    references: [users.id],
  }),
  consents: many(consentRecords),
}));

export const healthRecordsRelations = relations(healthRecords, ({ one, many }) => ({
  worker: one(workerProfiles, {
    fields: [healthRecords.workerId],
    references: [workerProfiles.id],
  }),
  createdBy: one(users, {
    fields: [healthRecords.createdByUserId],
    references: [users.id],
  }),
  documents: many(medicalDocuments),
}));

export const medicalDocumentsRelations = relations(medicalDocuments, ({ one }) => ({
  worker: one(workerProfiles, {
    fields: [medicalDocuments.workerId],
    references: [workerProfiles.id],
  }),
  healthRecord: one(healthRecords, {
    fields: [medicalDocuments.healthRecordId],
    references: [healthRecords.id],
  }),
  uploadedBy: one(users, {
    fields: [medicalDocuments.uploadedByUserId],
    references: [users.id],
  }),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  worker: one(workerProfiles, {
    fields: [consentRecords.workerId],
    references: [workerProfiles.id],
  }),
  provider: one(providerProfiles, {
    fields: [consentRecords.providerId],
    references: [providerProfiles.id],
  }),
}));

export const emergencyTokensRelations = relations(emergencyTokens, ({ one }) => ({
  worker: one(workerProfiles, {
    fields: [emergencyTokens.workerId],
    references: [workerProfiles.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
  targetWorker: one(workerProfiles, {
    fields: [auditLogs.targetWorkerId],
    references: [workerProfiles.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
