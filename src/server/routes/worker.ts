import { Router } from 'express';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  auditLogs,
  consentRecords,
  emergencyTokens,
  healthRecords,
  medicalDocuments,
  notifications,
  users,
  workerProfiles,
} from '../../db/schema.ts';
import { RECORD_CATEGORIES } from '../../shared/constants.ts';
import {
  getClientIp,
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../middleware/auth.ts';
import { logAuditEvent } from '../services/audit.ts';
import { generateStructuredHealthSummary } from '../services/aiSummary.ts';
import { syncExpiredConsents } from '../services/consent.ts';

export const workerRouter = Router();

workerRouter.use(requireAuth, requireRole('WORKER'));

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  profilePhotoUrl: z.string().trim().max(500).nullable().optional(),
  dateOfBirth: z.string().trim().max(20).nullable().optional(),
  gender: z.string().trim().max(30).nullable().optional(),
  phoneNumber: z.string().trim().max(30).nullable().optional(),
  nationality: z.string().trim().max(60).nullable().optional(),
  originState: z.string().trim().max(60).nullable().optional(),
  preferredLanguage: z.enum(['en', 'ml', 'hi', 'bn']).optional(),
  currentAddress: z.string().trim().max(400).nullable().optional(),
  district: z.string().trim().max(60).nullable().optional(),
  emergencyContactName: z.string().trim().max(120).nullable().optional(),
  emergencyContactPhone: z.string().trim().max(30).nullable().optional(),
  emergencyContactRelation: z.string().trim().max(60).nullable().optional(),
  shareEmergencyContact: z.boolean().optional(),
  bloodGroup: z.string().trim().max(15).nullable().optional(),
  knownAllergies: z.string().trim().max(800).nullable().optional(),
  chronicConditions: z.string().trim().max(800).nullable().optional(),
});

const healthRecordSchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.enum(RECORD_CATEGORIES),
  diagnosis: z.string().trim().max(500).nullable().optional(),
  doctorName: z.string().trim().max(150).nullable().optional(),
  hospitalName: z.string().trim().max(200).nullable().optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date must be YYYY-MM-DD'),
  prescriptionDetails: z.string().trim().max(2000).nullable().optional(),
  medicationDetails: z.string().trim().max(1500).nullable().optional(),
  laboratoryResults: z.string().trim().max(3000).nullable().optional(),
  medicalNotes: z.string().trim().max(3000).nullable().optional(),
  ocrExtractedText: z.string().trim().max(12000).nullable().optional(),
});

// Worker Dashboard overview
workerRouter.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const wp = req.workerProfile;
    if (!wp) {
      return res.status(404).json({ error: 'Worker profile not found.' });
    }
    await syncExpiredConsents();

    const [recordCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(healthRecords)
      .where(eq(healthRecords.workerId, wp.id));

    const [docCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(medicalDocuments)
      .where(eq(medicalDocuments.workerId, wp.id));

    const [activeConsentRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(consentRecords)
      .where(and(eq(consentRecords.workerId, wp.id), eq(consentRecords.status, 'ACTIVE')));

    const [pendingConsentRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(consentRecords)
      .where(and(eq(consentRecords.workerId, wp.id), eq(consentRecords.status, 'PENDING')));

    const [unreadNotifRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, req.dbUser!.id), eq(notifications.isRead, false)));

    const recentRecords = await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.workerId, wp.id))
      .orderBy(desc(healthRecords.visitDate), desc(healthRecords.createdAt))
      .limit(5);

    const recentHistory = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.targetWorkerId, wp.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8);

    const [activeQr] = await db
      .select()
      .from(emergencyTokens)
      .where(and(eq(emergencyTokens.workerId, wp.id), eq(emergencyTokens.isActive, true)))
      .orderBy(desc(emergencyTokens.createdAt))
      .limit(1);

    return res.json({
      profile: wp,
      stats: {
        totalRecords: recordCountRow?.count ?? 0,
        totalDocuments: docCountRow?.count ?? 0,
        activeConsents: activeConsentRow?.count ?? 0,
        pendingRequests: pendingConsentRow?.count ?? 0,
        unreadNotifications: unreadNotifRow?.count ?? 0,
      },
      recentRecords,
      recentHistory,
      activeEmergencyToken: activeQr || null,
    });
  } catch (error) {
    console.error('Worker dashboard query failed:', error);
    return res.status(500).json({ error: 'Unable to load dashboard data.' });
  }
});

// Get & Update Worker Profile
workerRouter.get('/profile', async (req: AuthRequest, res) => {
  if (!req.workerProfile) {
    return res.status(404).json({ error: 'Worker profile not found.' });
  }
  return res.json({ profile: req.workerProfile });
});

workerRouter.put('/profile', async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) {
    return res.status(404).json({ error: 'Worker profile not found.' });
  }

  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid profile details.', details: parsed.error.flatten() });
  }

  try {
    const data = parsed.data;
    const [updated] = await db
      .update(workerProfiles)
      .set({
        fullName: data.fullName,
        profilePhotoUrl: data.profilePhotoUrl ?? wp.profilePhotoUrl,
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        phoneNumber: data.phoneNumber ?? null,
        nationality: data.nationality ?? 'Indian',
        originState: data.originState ?? null,
        preferredLanguage: data.preferredLanguage ?? wp.preferredLanguage,
        currentAddress: data.currentAddress ?? null,
        district: data.district ?? null,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        emergencyContactRelation: data.emergencyContactRelation ?? null,
        shareEmergencyContact:
          data.shareEmergencyContact !== undefined
            ? data.shareEmergencyContact
            : wp.shareEmergencyContact,
        bloodGroup: data.bloodGroup ?? null,
        knownAllergies: data.knownAllergies ?? null,
        chronicConditions: data.chronicConditions ?? null,
        updatedAt: new Date(),
      })
      .where(eq(workerProfiles.id, wp.id))
      .returning();

    // Sync name and preferred language on users table & active emergency token contact setting
    await db
      .update(users)
      .set({
        fullName: data.fullName,
        preferredLanguage: data.preferredLanguage ?? wp.preferredLanguage,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.dbUser!.id));

    if (data.shareEmergencyContact !== undefined) {
      await db
        .update(emergencyTokens)
        .set({ shareEmergencyContact: data.shareEmergencyContact })
        .where(and(eq(emergencyTokens.workerId, wp.id), eq(emergencyTokens.isActive, true)));
    }

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'WORKER_PROFILE_UPDATED',
      resourceType: 'worker_profiles',
      resourceId: wp.id,
      ipAddress: getClientIp(req),
    });

    return res.json({ profile: updated });
  } catch (error) {
    console.error('Worker profile update failed:', error);
    return res.status(500).json({ error: 'Unable to update worker profile.' });
  }
});

// List worker's own health records (search, filter, sort)
workerRouter.get('/records', async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';

    const conditions = [eq(healthRecords.workerId, wp.id)];

    if (category && category !== 'ALL') {
      conditions.push(eq(healthRecords.category, category));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(healthRecords.title, pattern),
          ilike(healthRecords.diagnosis, pattern),
          ilike(healthRecords.doctorName, pattern),
          ilike(healthRecords.hospitalName, pattern),
          ilike(healthRecords.medicationDetails, pattern)
        )!
      );
    }

    const records = await db
      .select()
      .from(healthRecords)
      .where(and(...conditions))
      .orderBy(
        sort === 'oldest' ? asc(healthRecords.visitDate) : desc(healthRecords.visitDate),
        desc(healthRecords.createdAt)
      );

    // Fetch document attachment counts without loading binary blobs
    const docs = await db
      .select({
        id: medicalDocuments.id,
        healthRecordId: medicalDocuments.healthRecordId,
        originalFileName: medicalDocuments.originalFileName,
        mimeType: medicalDocuments.mimeType,
        processingStatus: medicalDocuments.processingStatus,
      })
      .from(medicalDocuments)
      .where(eq(medicalDocuments.workerId, wp.id));

    const docsByRecord = new Map<string, typeof docs>();
    for (const d of docs) {
      if (d.healthRecordId) {
        const list = docsByRecord.get(d.healthRecordId) || [];
        list.push(d);
        docsByRecord.set(d.healthRecordId, list);
      }
    }

    return res.json({
      records: records.map((r) => ({
        ...r,
        attachments: docsByRecord.get(r.id) || [],
      })),
    });
  } catch (error) {
    console.error('Error fetching worker records:', error);
    return res.status(500).json({ error: 'Unable to load health records.' });
  }
});

// Create health record
workerRouter.post('/records', async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  const parsed = healthRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid health record fields.', details: parsed.error.flatten() });
  }

  try {
    const d = parsed.data;
    const [created] = await db
      .insert(healthRecords)
      .values({
        workerId: wp.id,
        createdByUserId: req.dbUser!.id,
        createdByRole: 'WORKER',
        title: d.title,
        category: d.category,
        diagnosis: d.diagnosis || null,
        doctorName: d.doctorName || null,
        hospitalName: d.hospitalName || null,
        visitDate: d.visitDate,
        prescriptionDetails: d.prescriptionDetails || null,
        medicationDetails: d.medicationDetails || null,
        laboratoryResults: d.laboratoryResults || null,
        medicalNotes: d.medicalNotes || null,
        ocrExtractedText: d.ocrExtractedText || null,
      })
      .returning();

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'RECORD_CREATED',
      resourceType: 'health_records',
      resourceId: created.id,
      details: { title: created.title, category: created.category },
      ipAddress: getClientIp(req),
    });

    return res.status(201).json({ record: created });
  } catch (error) {
    console.error('Error creating health record:', error);
    return res.status(500).json({ error: 'Unable to save health record.' });
  }
});

// Get single health record (strict worker ownership check)
workerRouter.get('/records/:id', async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const [record] = await db
      .select()
      .from(healthRecords)
      .where(and(eq(healthRecords.id, req.params.id), eq(healthRecords.workerId, wp.id)))
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: 'Health record not found.' });
    }

    const attachments = await db
      .select({
        id: medicalDocuments.id,
        originalFileName: medicalDocuments.originalFileName,
        mimeType: medicalDocuments.mimeType,
        fileSizeBytes: medicalDocuments.fileSizeBytes,
        processingStatus: medicalDocuments.processingStatus,
        ocrEngine: medicalDocuments.ocrEngine,
        createdAt: medicalDocuments.createdAt,
      })
      .from(medicalDocuments)
      .where(
        and(eq(medicalDocuments.healthRecordId, record.id), eq(medicalDocuments.workerId, wp.id))
      );

    return res.json({ record: { ...record, attachments } });
  } catch (error) {
    console.error('Error fetching single record:', error);
    return res.status(500).json({ error: 'Unable to fetch health record.' });
  }
});

// Update health record
workerRouter.put('/records/:id', async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  const parsed = healthRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid health record data.', details: parsed.error.flatten() });
  }

  try {
    const d = parsed.data;
    const [updated] = await db
      .update(healthRecords)
      .set({
        title: d.title,
        category: d.category,
        diagnosis: d.diagnosis || null,
        doctorName: d.doctorName || null,
        hospitalName: d.hospitalName || null,
        visitDate: d.visitDate,
        prescriptionDetails: d.prescriptionDetails || null,
        medicationDetails: d.medicationDetails || null,
        laboratoryResults: d.laboratoryResults || null,
        medicalNotes: d.medicalNotes || null,
        ocrExtractedText: d.ocrExtractedText ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(healthRecords.id, req.params.id), eq(healthRecords.workerId, wp.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Health record not found.' });
    }

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'RECORD_UPDATED',
      resourceType: 'health_records',
      resourceId: updated.id,
      details: { title: updated.title, category: updated.category },
      ipAddress: getClientIp(req),
    });

    return res.json({ record: updated });
  } catch (error) {
    console.error('Error updating health record:', error);
    return res.status(500).json({ error: 'Unable to update health record.' });
  }
});

// Delete health record
workerRouter.delete('/records/:id', async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const [deleted] = await db
      .delete(healthRecords)
      .where(and(eq(healthRecords.id, req.params.id), eq(healthRecords.workerId, wp.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Health record not found.' });
    }

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'RECORD_DELETED',
      resourceType: 'health_records',
      resourceId: deleted.id,
      details: { title: deleted.title, category: deleted.category },
      ipAddress: getClientIp(req),
    });

    return res.json({ deleted: true, id: deleted.id });
  } catch (error) {
    console.error('Error deleting health record:', error);
    return res.status(500).json({ error: 'Unable to delete health record.' });
  }
});

// Generate or regenerate structured Gemini AI summary for a health record
workerRouter.post('/records/:id/ai-summary', async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const [record] = await db
      .select()
      .from(healthRecords)
      .where(and(eq(healthRecords.id, req.params.id), eq(healthRecords.workerId, wp.id)))
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: 'Health record not found.' });
    }

    const compiledSource = [
      `Visit Date: ${record.visitDate}`,
      record.hospitalName ? `Hospital/Clinic: ${record.hospitalName}` : '',
      record.doctorName ? `Doctor: ${record.doctorName}` : '',
      record.diagnosis ? `Diagnosis: ${record.diagnosis}` : '',
      record.prescriptionDetails ? `Prescription Details: ${record.prescriptionDetails}` : '',
      record.medicationDetails ? `Medication Details: ${record.medicationDetails}` : '',
      record.laboratoryResults ? `Laboratory Results: ${record.laboratoryResults}` : '',
      record.medicalNotes ? `Medical Notes: ${record.medicalNotes}` : '',
      record.ocrExtractedText ? `OCR Extracted Document Text:\n${record.ocrExtractedText}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (compiledSource.trim().length < 15) {
      return res.status(400).json({
        error: 'This record does not contain enough clinical details to summarize.',
      });
    }

    const summary = await generateStructuredHealthSummary({
      sourceText: compiledSource,
      recordTitle: record.title,
      category: record.category,
      workerAllergies: wp.knownAllergies,
      workerChronicConditions: wp.chronicConditions,
    });

    const [updated] = await db
      .update(healthRecords)
      .set({ aiSummaryJson: summary, updatedAt: new Date() })
      .where(eq(healthRecords.id, record.id))
      .returning();

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'AI_SUMMARY_GENERATED',
      resourceType: 'health_records',
      resourceId: record.id,
      details: { model: summary.modelUsed },
      ipAddress: getClientIp(req),
    });

    return res.json({ record: updated, summary });
  } catch (error: unknown) {
    console.error('AI summary generation failed:', error);
    const msg =
      error instanceof Error ? error.message : 'Unable to generate AI health summary.';
    return res.status(502).json({ error: msg });
  }
});

// Worker Access History (full audit transparency)
workerRouter.get('/access-history', async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const history = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.targetWorkerId, wp.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return res.json({ history });
  } catch (error) {
    console.error('Error loading worker access history:', error);
    return res.status(500).json({ error: 'Unable to load access history.' });
  }
});
