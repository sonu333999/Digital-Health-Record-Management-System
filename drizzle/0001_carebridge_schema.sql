-- CareBridge – Digital Health Record Management System for Migrant Workers in Kerala
-- Initial PostgreSQL Schema Migration (managed by Drizzle ORM / src/db/schema.ts)

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "firebase_uid" text NOT NULL UNIQUE,
  "email" text NOT NULL UNIQUE,
  "full_name" text NOT NULL,
  "role" text DEFAULT 'WORKER' NOT NULL,
  "preferred_language" text DEFAULT 'en' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "worker_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "worker_code" text NOT NULL UNIQUE,
  "full_name" text NOT NULL,
  "profile_photo_url" text,
  "date_of_birth" text,
  "gender" text,
  "phone_number" text,
  "email" text NOT NULL,
  "nationality" text DEFAULT 'Indian',
  "origin_state" text,
  "preferred_language" text DEFAULT 'en' NOT NULL,
  "current_address" text,
  "district" text,
  "emergency_contact_name" text,
  "emergency_contact_phone" text,
  "emergency_contact_relation" text,
  "share_emergency_contact" boolean DEFAULT true NOT NULL,
  "blood_group" text,
  "known_allergies" text,
  "chronic_conditions" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "full_name" text NOT NULL,
  "profile_photo_url" text,
  "email" text NOT NULL,
  "phone_number" text,
  "designation" text NOT NULL,
  "hospital_name" text NOT NULL,
  "registration_number" text NOT NULL UNIQUE,
  "address" text,
  "district" text,
  "is_verified" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "health_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "worker_id" uuid NOT NULL REFERENCES "worker_profiles"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_by_role" text DEFAULT 'WORKER' NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "diagnosis" text,
  "doctor_name" text,
  "hospital_name" text,
  "visit_date" text NOT NULL,
  "prescription_details" text,
  "medication_details" text,
  "laboratory_results" text,
  "medical_notes" text,
  "ocr_extracted_text" text,
  "ai_summary_json" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "medical_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "worker_id" uuid NOT NULL REFERENCES "worker_profiles"("id") ON DELETE CASCADE,
  "health_record_id" uuid REFERENCES "health_records"("id") ON DELETE SET NULL,
  "uploaded_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "original_file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "storage_provider" text DEFAULT 'postgres_private' NOT NULL,
  "storage_key" text NOT NULL UNIQUE,
  "file_data_base64" text,
  "processing_status" text DEFAULT 'UPLOADED' NOT NULL,
  "ocr_engine" text DEFAULT 'gemini-multimodal',
  "ocr_raw_text" text,
  "ocr_verified_text" text,
  "ai_summary_json" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "consent_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "worker_id" uuid NOT NULL REFERENCES "worker_profiles"("id") ON DELETE CASCADE,
  "provider_id" uuid NOT NULL REFERENCES "provider_profiles"("id") ON DELETE CASCADE,
  "permitted_categories" jsonb NOT NULL,
  "purpose" text,
  "can_add_records" boolean DEFAULT true NOT NULL,
  "can_edit_records" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "granted_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "emergency_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "worker_id" uuid NOT NULL REFERENCES "worker_profiles"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "emergency_identifier" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "share_emergency_contact" boolean DEFAULT true NOT NULL,
  "access_count" integer DEFAULT 0 NOT NULL,
  "last_accessed_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "actor_role" text NOT NULL,
  "actor_email" text,
  "target_worker_id" uuid REFERENCES "worker_profiles"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" text,
  "details" jsonb,
  "ip_address" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "link_url" text,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_worker_profiles_code" ON "worker_profiles" ("worker_code");
CREATE INDEX IF NOT EXISTS "idx_worker_profiles_district" ON "worker_profiles" ("district");
CREATE INDEX IF NOT EXISTS "idx_provider_profiles_reg" ON "provider_profiles" ("registration_number");
CREATE INDEX IF NOT EXISTS "idx_provider_profiles_district" ON "provider_profiles" ("district");
CREATE INDEX IF NOT EXISTS "idx_health_records_worker_id" ON "health_records" ("worker_id");
CREATE INDEX IF NOT EXISTS "idx_health_records_category" ON "health_records" ("category");
CREATE INDEX IF NOT EXISTS "idx_health_records_visit_date" ON "health_records" ("visit_date");
CREATE INDEX IF NOT EXISTS "idx_medical_documents_worker_id" ON "medical_documents" ("worker_id");
CREATE INDEX IF NOT EXISTS "idx_medical_documents_record_id" ON "medical_documents" ("health_record_id");
CREATE INDEX IF NOT EXISTS "idx_consent_records_worker_id" ON "consent_records" ("worker_id");
CREATE INDEX IF NOT EXISTS "idx_consent_records_provider_id" ON "consent_records" ("provider_id");
CREATE INDEX IF NOT EXISTS "idx_consent_records_status" ON "consent_records" ("status");
CREATE INDEX IF NOT EXISTS "idx_emergency_tokens_worker_id" ON "emergency_tokens" ("worker_id");
CREATE INDEX IF NOT EXISTS "idx_emergency_tokens_token" ON "emergency_tokens" ("token");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor" ON "audit_logs" ("actor_user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_target_worker" ON "audit_logs" ("target_worker_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read");
