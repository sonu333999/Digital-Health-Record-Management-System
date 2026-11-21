import { Router } from 'express';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  auditLogs,
  consentRecords,
  healthRecords,
  medicalDocuments,
  providerProfiles,
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
import { createNotification, logAuditEvent } from '../services/audit.ts';
import {
  getValidActiveConsent,
  isCategoryPermitted,
  syncExpiredConsents,
} from '../services/consent.ts';

export const providerRouter = Router();

providerRouter.use(requireAuth, requireRole('PROVIDER'));

const providerProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().max(30).nullable().optional(),
  designation: z.string().trim().min(2).max(120),
  hospitalName: z.string().trim().min(2).max(180),
  registrationNumber: z.string().trim().min(3).max(80),
  address: z.string().trim().max(300).nullable().optional(),
  district: z.string().trim().max(60).nullable().optional(),
});

const requestAccessSchema = z.object({
  workerId: z.string().uuid(),
  permittedCategories: z.array(z.enum(RECORD_CATEGORIES)).min(1),
  purpose: z.string().trim().min(4).max(400),
  durationDays: z.number().int().min(1).max(365).optional().default(30),
  canAddRecords: z.boolean().optional().default(true),
  canEditRecords: z.boolean().optional().default(false),
});

const providerRecordSchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.enum(RECORD_CATEGORIES),
  diagnosis: z.string().trim().max(500).nullable().optional(),
  doctorName: z.string().trim().max(150).nullable().optional(),
  hospitalName: z.string().trim().max(200).nullable().optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prescriptionDetails: z.string().trim().max(2000).nullable().optional(),
  medicationDetails: z.string().trim().max(1500).nullable().optional(),
  laboratoryResults: z.string().trim().max(3000).nullable().optional(),
  medicalNotes: z.string().trim().max(3000).nullable().optional(),
});

// Provider Dashboard overview
providerRouter.get('/dashboard', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  try {
    await syncExpiredConsents();

    const [activeConsentsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(consentRecords)
      .where(and(eq(consentRecords.providerId, pp.id), eq(consentRecords.status, 'ACTIVE')));

    const [pendingRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(consentRecords)
      .where(and(eq(consentRecords.providerId, pp.id), eq(consentRecords.status, 'PENDING')));

    const [recordsAuthoredRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(healthRecords)
      .where(eq(healthRecords.createdByUserId, req.dbUser!.id));

    const authorizedWorkers = await db
      .select({
        consent: consentRecords,
        worker: {
          id: workerProfiles.id,
          workerCode: workerProfiles.workerCode,
          fullName: workerProfiles.fullName,
          district: workerProfiles.district,
          preferredLanguage: workerProfiles.preferredLanguage,
          bloodGroup: workerProfiles.bloodGroup,
        },
      })
      .from(consentRecords)
      .innerJoin(workerProfiles, eq(consentRecords.workerId, workerProfiles.id))
      .where(and(eq(consentRecords.providerId, pp.id), eq(consentRecords.status, 'ACTIVE')))
      .orderBy(desc(consentRecords.grantedAt))
      .limit(10);

    const recentHistory = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorUserId, req.dbUser!.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    return res.json({
      profile: pp,
      stats: {
        authorizedWorkers: activeConsentsRow?.count ?? 0,
        pendingRequests: pendingRow?.count ?? 0,
        recordsAdded: recordsAuthoredRow?.count ?? 0,
      },
      authorizedWorkers: authorizedWorkers.map((row) => ({
        ...row.worker,
        consent: row.consent,
      })),
      recentHistory,
    });
  } catch (error) {
    console.error('Provider dashboard failed:', error);
    return res.status(500).json({ error: 'Unable to load provider dashboard.' });
  }
});

// Provider Profile Get / Update
providerRouter.get('/profile', (req: AuthRequest, res) => {
  if (!req.providerProfile) {
    return res.status(404).json({ error: 'Provider profile not found.' });
  }
  return res.json({ profile: req.providerProfile });
});

providerRouter.put('/profile', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  const parsed = providerProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid provider profile data.', details: parsed.error.flatten() });
  }

  try {
    const d = parsed.data;
    const [updated] = await db
      .update(providerProfiles)
      .set({
        fullName: d.fullName,
        phoneNumber: d.phoneNumber ?? null,
        designation: d.designation,
        hospitalName: d.hospitalName,
        registrationNumber: d.registrationNumber,
        address: d.address ?? null,
        district: d.district ?? null,
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.id, pp.id))
      .returning();

    await db
      .update(users)
      .set({ fullName: d.fullName, updatedAt: new Date() })
      .where(eq(users.id, req.dbUser!.id));

    return res.json({ profile: updated });
  } catch (error) {
    console.error('Provider profile update failed:', error);
    return res.status(500).json({ error: 'Unable to update provider profile.' });
  }
});

// Search workers by Worker ID / permitted identifier (returns NON-CLINICAL metadata only!)
providerRouter.get('/workers/search', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  try {
    await syncExpiredConsents();
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const results = q
      ? await db
          .select({
            id: workerProfiles.id,
            workerCode: workerProfiles.workerCode,
            fullName: workerProfiles.fullName,
            district: workerProfiles.district,
            preferredLanguage: workerProfiles.preferredLanguage,
            originState: workerProfiles.originState,
          })
          .from(workerProfiles)
          .where(
            or(
              ilike(workerProfiles.workerCode, `%${q}%`),
              ilike(workerProfiles.fullName, `%${q}%`),
              ilike(workerProfiles.phoneNumber, `%${q}%`),
              ilike(workerProfiles.email, `%${q}%`)
            )
          )
          .limit(25)
      : await db
          .select({
            id: workerProfiles.id,
            workerCode: workerProfiles.workerCode,
            fullName: workerProfiles.fullName,
            district: workerProfiles.district,
            preferredLanguage: workerProfiles.preferredLanguage,
            originState: workerProfiles.originState,
          })
          .from(workerProfiles)
          .limit(25);

    const existingConsents = await db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.providerId, pp.id))
      .orderBy(desc(consentRecords.updatedAt));

    const latestByWorker = new Map<string, (typeof existingConsents)[number]>();
    for (const c of existingConsents) {
      if (!latestByWorker.has(c.workerId)) {
        latestByWorker.set(c.workerId, c);
      }
    }

    return res.json({
      workers: results.map((w) => ({
        ...w,
        consent: latestByWorker.get(w.id) || null,
      })),
    });
  } catch (error) {
    console.error('Worker search failed:', error);
    return res.status(500).json({ error: 'Unable to search workers.' });
  }
});

// List provider's consent requests & statuses
providerRouter.get('/requests', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  try {
    await syncExpiredConsents();

    const rows = await db
      .select({
        consent: consentRecords,
        worker: {
          id: workerProfiles.id,
          workerCode: workerProfiles.workerCode,
          fullName: workerProfiles.fullName,
          district: workerProfiles.district,
          preferredLanguage: workerProfiles.preferredLanguage,
        },
      })
      .from(consentRecords)
      .innerJoin(workerProfiles, eq(consentRecords.workerId, workerProfiles.id))
      .where(eq(consentRecords.providerId, pp.id))
      .orderBy(desc(consentRecords.updatedAt));

    return res.json({
      requests: rows.map((r) => ({
        ...r.consent,
        worker: r.worker,
      })),
    });
  } catch (error) {
    console.error('Failed loading provider access requests:', error);
    return res.status(500).json({ error: 'Unable to load access requests.' });
  }
});

// Send consent request to a worker
providerRouter.post('/requests', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  const parsed = requestAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid access request.', details: parsed.error.flatten() });
  }

  try {
    const [worker] = await db
      .select()
      .from(workerProfiles)
      .where(eq(workerProfiles.id, parsed.data.workerId))
      .limit(1);

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    const expiresAt = new Date(Date.now() + parsed.data.durationDays * 24 * 60 * 60 * 1000);

    const [created] = await db
      .insert(consentRecords)
      .values({
        workerId: worker.id,
        providerId: pp.id,
        permittedCategories: parsed.data.permittedCategories,
        purpose: parsed.data.purpose,
        canAddRecords: parsed.data.canAddRecords,
        canEditRecords: parsed.data.canEditRecords,
        status: 'PENDING',
        expiresAt,
      })
      .returning();

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'PROVIDER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: worker.id,
      action: 'CONSENT_REQUESTED',
      resourceType: 'consent_records',
      resourceId: created.id,
      details: {
        hospital: pp.hospitalName,
        categories: parsed.data.permittedCategories,
        purpose: parsed.data.purpose,
      },
      ipAddress: getClientIp(req),
    });

    await createNotification({
      userId: worker.userId,
      type: 'CONSENT_REQUEST',
      title: 'New Healthcare Provider Access Request',
      message: `${pp.fullName} (${pp.hospitalName}) requested access to: ${parsed.data.permittedCategories.join(', ')}.`,
      linkUrl: '/worker/consents',
    });

    return res.status(201).json({ request: created });
  } catch (error) {
    console.error('Failed creating access request:', error);
    return res.status(500).json({ error: 'Unable to send access request.' });
  }
});

// List workers with currently active consent
providerRouter.get('/authorized-workers', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  try {
    await syncExpiredConsents();
    const rows = await db
      .select({
        consent: consentRecords,
        worker: {
          id: workerProfiles.id,
          workerCode: workerProfiles.workerCode,
          fullName: workerProfiles.fullName,
          district: workerProfiles.district,
          preferredLanguage: workerProfiles.preferredLanguage,
          bloodGroup: workerProfiles.bloodGroup,
          knownAllergies: workerProfiles.knownAllergies,
          chronicConditions: workerProfiles.chronicConditions,
        },
      })
      .from(consentRecords)
      .innerJoin(workerProfiles, eq(consentRecords.workerId, workerProfiles.id))
      .where(and(eq(consentRecords.providerId, pp.id), eq(consentRecords.status, 'ACTIVE')))
      .orderBy(desc(consentRecords.grantedAt));

    return res.json({
      authorizedWorkers: rows.map((r) => ({
        ...r.worker,
        consent: r.consent,
      })),
    });
  } catch (error) {
    console.error('Failed listing authorized workers:', error);
    return res.status(500).json({ error: 'Unable to load authorized workers.' });
  }
});

// View approved worker records (STRICT BACKEND CONSENT ENFORCEMENT)
providerRouter.get('/workers/:workerId/records', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  try {
    const workerId = req.params.workerId;
    const consent = await getValidActiveConsent(pp.id, workerId);

    if (!consent) {
      await logAuditEvent({
        actorUserId: req.dbUser!.id,
        actorRole: 'PROVIDER',
        actorEmail: req.dbUser!.email,
        targetWorkerId: workerId,
        action: 'UNAUTHORIZED_ACCESS_BLOCKED',
        resourceType: 'health_records',
        details: { reason: 'No active unexpired consent' },
        ipAddress: getClientIp(req),
      });
      return res.status(403).json({
        error: 'Access denied: Active, unexpired worker consent is required to view medical records.',
      });
    }

    const [worker] = await db
      .select({
        id: workerProfiles.id,
        workerCode: workerProfiles.workerCode,
        fullName: workerProfiles.fullName,
        dateOfBirth: workerProfiles.dateOfBirth,
        gender: workerProfiles.gender,
        district: workerProfiles.district,
        preferredLanguage: workerProfiles.preferredLanguage,
        bloodGroup: workerProfiles.bloodGroup,
        knownAllergies: workerProfiles.knownAllergies,
        chronicConditions: workerProfiles.chronicConditions,
      })
      .from(workerProfiles)
      .where(eq(workerProfiles.id, workerId))
      .limit(1);

    if (!worker) return res.status(404).json({ error: 'Worker not found.' });

    const permitted = Array.isArray(consent.permittedCategories)
      ? consent.permittedCategories
      : [];

    const records =
      permitted.length > 0
        ? await db
            .select()
            .from(healthRecords)
            .where(
              and(
                eq(healthRecords.workerId, workerId),
                inArray(healthRecords.category, permitted)
              )
            )
            .orderBy(desc(healthRecords.visitDate))
        : [];

    const recordIds = records.map((r) => r.id);
    const attachments =
      recordIds.length > 0
        ? await db
            .select({
              id: medicalDocuments.id,
              healthRecordId: medicalDocuments.healthRecordId,
              originalFileName: medicalDocuments.originalFileName,
              mimeType: medicalDocuments.mimeType,
              fileSizeBytes: medicalDocuments.fileSizeBytes,
              processingStatus: medicalDocuments.processingStatus,
              ocrVerifiedText: medicalDocuments.ocrVerifiedText,
              ocrRawText: medicalDocuments.ocrRawText,
              aiSummaryJson: medicalDocuments.aiSummaryJson,
              createdAt: medicalDocuments.createdAt,
            })
            .from(medicalDocuments)
            .where(
              and(
                eq(medicalDocuments.workerId, workerId),
                inArray(medicalDocuments.healthRecordId, recordIds)
              )
            )
        : [];

    const attachMap = new Map<string, typeof attachments>();
    for (const a of attachments) {
      if (a.healthRecordId) {
        const list = attachMap.get(a.healthRecordId) || [];
        list.push(a);
        attachMap.set(a.healthRecordId, list);
      }
    }

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'PROVIDER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: workerId,
      action: 'RECORD_VIEWED_BY_PROVIDER',
      resourceType: 'health_records',
      details: {
        consentId: consent.id,
        permittedCategories: permitted,
        recordsReturned: records.length,
      },
      ipAddress: getClientIp(req),
    });

    return res.json({
      worker,
      consent,
      records: records.map((r) => ({
        ...r,
        attachments: attachMap.get(r.id) || [],
      })),
    });
  } catch (error) {
    console.error('Failed loading authorized worker records:', error);
    return res.status(500).json({ error: 'Unable to load authorized records.' });
  }
});

// Add a new medical record for an authorized worker (BACKEND CONSENT ENFORCED)
providerRouter.post('/workers/:workerId/records', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  const parsed = providerRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid record fields.', details: parsed.error.flatten() });
  }

  try {
    const workerId = req.params.workerId;
    const consent = await getValidActiveConsent(pp.id, workerId);
    if (!consent || !consent.canAddRecords) {
      return res.status(403).json({
        error: 'Access denied: Valid consent with record-creation permission is required.',
      });
    }

    if (!isCategoryPermitted(consent, parsed.data.category)) {
      return res.status(403).json({
        error: `Access denied: Consent does not permit category "${parsed.data.category}".`,
      });
    }

    const [worker] = await db
      .select()
      .from(workerProfiles)
      .where(eq(workerProfiles.id, workerId))
      .limit(1);
    if (!worker) return res.status(404).json({ error: 'Worker not found.' });

    const d = parsed.data;
    const [created] = await db
      .insert(healthRecords)
      .values({
        workerId,
        createdByUserId: req.dbUser!.id,
        createdByRole: 'PROVIDER',
        title: d.title,
        category: d.category,
        diagnosis: d.diagnosis || null,
        doctorName: d.doctorName || pp.fullName,
        hospitalName: d.hospitalName || pp.hospitalName,
        visitDate: d.visitDate,
        prescriptionDetails: d.prescriptionDetails || null,
        medicationDetails: d.medicationDetails || null,
        laboratoryResults: d.laboratoryResults || null,
        medicalNotes: d.medicalNotes || null,
      })
      .returning();

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'PROVIDER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: workerId,
      action: 'RECORD_CREATED_BY_PROVIDER',
      resourceType: 'health_records',
      resourceId: created.id,
      details: { title: created.title, category: created.category, hospital: pp.hospitalName },
      ipAddress: getClientIp(req),
    });

    await createNotification({
      userId: worker.userId,
      type: 'RECORD_ADDED',
      title: 'Provider Added Medical Record',
      message: `${pp.fullName} (${pp.hospitalName}) added "${created.title}" (${created.category}) to your health records.`,
      linkUrl: `/worker/records/${created.id}`,
    });

    return res.status(201).json({ record: created });
  } catch (error) {
    console.error('Provider create record failed:', error);
    return res.status(500).json({ error: 'Unable to add medical record.' });
  }
});

// Update a permitted medical record (BACKEND CONSENT ENFORCED)
providerRouter.put('/workers/:workerId/records/:recordId', async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  const parsed = providerRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid record fields.', details: parsed.error.flatten() });
  }

  try {
    const { workerId, recordId } = req.params;
    const consent = await getValidActiveConsent(pp.id, workerId);
    if (!consent || !consent.canEditRecords) {
      return res.status(403).json({
        error: 'Access denied: Active consent with edit permission is required.',
      });
    }

    const [existing] = await db
      .select()
      .from(healthRecords)
      .where(and(eq(healthRecords.id, recordId), eq(healthRecords.workerId, workerId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Health record not found.' });

    if (!isCategoryPermitted(consent, existing.category) || !isCategoryPermitted(consent, parsed.data.category)) {
      return res.status(403).json({
        error: 'Access denied: Record category is outside approved consent scope.',
      });
    }

    const d = parsed.data;
    const [updated] = await db
      .update(healthRecords)
      .set({
        title: d.title,
        category: d.category,
        diagnosis: d.diagnosis || null,
        doctorName: d.doctorName || existing.doctorName,
        hospitalName: d.hospitalName || existing.hospitalName,
        visitDate: d.visitDate,
        prescriptionDetails: d.prescriptionDetails || null,
        medicationDetails: d.medicationDetails || null,
        laboratoryResults: d.laboratoryResults || null,
        medicalNotes: d.medicalNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(healthRecords.id, existing.id))
      .returning();

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'PROVIDER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: workerId,
      action: 'RECORD_UPDATED_BY_PROVIDER',
      resourceType: 'health_records',
      resourceId: updated.id,
      details: { title: updated.title, category: updated.category },
      ipAddress: getClientIp(req),
    });

    return res.json({ record: updated });
  } catch (error) {
    console.error('Provider update record failed:', error);
    return res.status(500).json({ error: 'Unable to update medical record.' });
  }
});

// Provider Access History
providerRouter.get('/access-history', async (req: AuthRequest, res) => {
  try {
    const history = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorUserId, req.dbUser!.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return res.json({ history });
  } catch (error) {
    console.error('Provider access history failed:', error);
    return res.status(500).json({ error: 'Unable to load access history.' });
  }
});
