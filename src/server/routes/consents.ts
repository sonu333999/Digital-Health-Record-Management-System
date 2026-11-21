import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import { consentRecords, providerProfiles } from '../../db/schema.ts';
import { RECORD_CATEGORIES } from '../../shared/constants.ts';
import {
  getClientIp,
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../middleware/auth.ts';
import { createNotification, logAuditEvent } from '../services/audit.ts';
import { getValidActiveConsent, syncExpiredConsents } from '../services/consent.ts';

export const consentsRouter = Router();

const grantConsentSchema = z.object({
  providerId: z.string().uuid(),
  permittedCategories: z.array(z.enum(RECORD_CATEGORIES)).min(1),
  expiresAt: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid expiry timestamp'),
  purpose: z.string().trim().max(400).optional(),
  canAddRecords: z.boolean().optional().default(true),
  canEditRecords: z.boolean().optional().default(false),
});

const approveConsentSchema = z.object({
  permittedCategories: z.array(z.enum(RECORD_CATEGORIES)).min(1).optional(),
  expiresAt: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid expiry timestamp')
    .optional(),
  canAddRecords: z.boolean().optional(),
  canEditRecords: z.boolean().optional(),
});

// List worker's own consents (active, pending, expired, revoked)
consentsRouter.get('/', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    await syncExpiredConsents();

    const rows = await db
      .select({
        consent: consentRecords,
        provider: {
          id: providerProfiles.id,
          userId: providerProfiles.userId,
          fullName: providerProfiles.fullName,
          designation: providerProfiles.designation,
          hospitalName: providerProfiles.hospitalName,
          registrationNumber: providerProfiles.registrationNumber,
          district: providerProfiles.district,
        },
      })
      .from(consentRecords)
      .innerJoin(providerProfiles, eq(consentRecords.providerId, providerProfiles.id))
      .where(eq(consentRecords.workerId, wp.id))
      .orderBy(desc(consentRecords.updatedAt));

    return res.json({
      consents: rows.map((r) => ({
        ...r.consent,
        provider: r.provider,
      })),
    });
  } catch (error) {
    console.error('Failed loading worker consents:', error);
    return res.status(500).json({ error: 'Unable to load consent records.' });
  }
});

// Worker proactively grants consent to a healthcare provider
consentsRouter.post('/grant', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  const parsed = grantConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid consent parameters.', details: parsed.error.flatten() });
  }

  const expiryDate = new Date(parsed.data.expiresAt);
  if (expiryDate <= new Date()) {
    return res.status(400).json({ error: 'Expiry date and time must be in the future.' });
  }

  try {
    const [provider] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.id, parsed.data.providerId))
      .limit(1);

    if (!provider) {
      return res.status(404).json({ error: 'Selected healthcare provider not found.' });
    }

    const [created] = await db
      .insert(consentRecords)
      .values({
        workerId: wp.id,
        providerId: provider.id,
        permittedCategories: parsed.data.permittedCategories,
        purpose: parsed.data.purpose || 'Direct worker-authorized medical consultation',
        canAddRecords: parsed.data.canAddRecords,
        canEditRecords: parsed.data.canEditRecords,
        status: 'ACTIVE',
        grantedAt: new Date(),
        expiresAt: expiryDate,
      })
      .returning();

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'CONSENT_GRANTED',
      resourceType: 'consent_records',
      resourceId: created.id,
      details: {
        providerId: provider.id,
        providerName: provider.fullName,
        categories: parsed.data.permittedCategories,
        expiresAt: expiryDate.toISOString(),
      },
      ipAddress: getClientIp(req),
    });

    await createNotification({
      userId: provider.userId,
      type: 'CONSENT_GRANTED',
      title: 'Worker Granted Record Consent',
      message: `${wp.fullName} (${wp.workerCode}) granted access to ${parsed.data.permittedCategories.length} record categories until ${expiryDate.toLocaleDateString()}.`,
      linkUrl: `/provider/workers/${wp.id}/records`,
    });

    return res.status(201).json({ consent: created });
  } catch (error) {
    console.error('Failed granting consent:', error);
    return res.status(500).json({ error: 'Unable to grant consent.' });
  }
});

// Worker approves a provider's PENDING access request
consentsRouter.post('/:id/approve', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  const parsed = approveConsentSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid approval parameters.' });
  }

  try {
    const [existing] = await db
      .select()
      .from(consentRecords)
      .where(and(eq(consentRecords.id, req.params.id), eq(consentRecords.workerId, wp.id)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Consent request not found.' });
    }
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending requests can be approved.' });
    }

    const nextExpiry = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : existing.expiresAt;
    if (nextExpiry <= new Date()) {
      return res.status(400).json({ error: 'Expiry timestamp must be in the future.' });
    }

    const nextCategories = parsed.data.permittedCategories ?? existing.permittedCategories;

    const [updated] = await db
      .update(consentRecords)
      .set({
        status: 'ACTIVE',
        permittedCategories: nextCategories,
        expiresAt: nextExpiry,
        canAddRecords: parsed.data.canAddRecords ?? existing.canAddRecords,
        canEditRecords: parsed.data.canEditRecords ?? existing.canEditRecords,
        grantedAt: new Date(),
        revokedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(consentRecords.id, existing.id))
      .returning();

    const [provider] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.id, existing.providerId))
      .limit(1);

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'CONSENT_APPROVED',
      resourceType: 'consent_records',
      resourceId: updated.id,
      details: {
        providerName: provider?.fullName,
        categories: nextCategories,
        expiresAt: nextExpiry.toISOString(),
      },
      ipAddress: getClientIp(req),
    });

    if (provider) {
      await createNotification({
        userId: provider.userId,
        type: 'CONSENT_GRANTED',
        title: 'Access Request Approved',
        message: `${wp.fullName} approved your access request for ${nextCategories.join(', ')}.`,
        linkUrl: `/provider/workers/${wp.id}/records`,
      });
    }

    return res.json({ consent: updated });
  } catch (error) {
    console.error('Failed approving consent:', error);
    return res.status(500).json({ error: 'Unable to approve access request.' });
  }
});

// Worker rejects a pending access request
consentsRouter.post('/:id/reject', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const [existing] = await db
      .select()
      .from(consentRecords)
      .where(and(eq(consentRecords.id, req.params.id), eq(consentRecords.workerId, wp.id)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Consent request not found.' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending requests can be rejected.' });
    }

    const [updated] = await db
      .update(consentRecords)
      .set({ status: 'REJECTED', updatedAt: new Date() })
      .where(eq(consentRecords.id, existing.id))
      .returning();

    const [provider] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.id, existing.providerId))
      .limit(1);

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'CONSENT_REJECTED',
      resourceType: 'consent_records',
      resourceId: updated.id,
      details: { providerName: provider?.fullName },
      ipAddress: getClientIp(req),
    });

    if (provider) {
      await createNotification({
        userId: provider.userId,
        type: 'CONSENT_REVOKED',
        title: 'Access Request Declined',
        message: `${wp.fullName} declined your request for health record access.`,
        linkUrl: '/provider/requests',
      });
    }

    return res.json({ consent: updated });
  } catch (error) {
    console.error('Failed rejecting consent:', error);
    return res.status(500).json({ error: 'Unable to reject access request.' });
  }
});

// Worker immediately revokes active consent
consentsRouter.post('/:id/revoke', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const [existing] = await db
      .select()
      .from(consentRecords)
      .where(and(eq(consentRecords.id, req.params.id), eq(consentRecords.workerId, wp.id)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Consent record not found.' });
    }

    const [updated] = await db
      .update(consentRecords)
      .set({
        status: 'REVOKED',
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(consentRecords.id, existing.id))
      .returning();

    const [provider] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.id, existing.providerId))
      .limit(1);

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'CONSENT_REVOKED',
      resourceType: 'consent_records',
      resourceId: updated.id,
      details: { providerId: existing.providerId, providerName: provider?.fullName },
      ipAddress: getClientIp(req),
    });

    if (provider) {
      await createNotification({
        userId: provider.userId,
        type: 'CONSENT_REVOKED',
        title: 'Consent Revoked Immediately',
        message: `${wp.fullName} (${wp.workerCode}) revoked your access to their health records.`,
        linkUrl: '/provider/requests',
      });
    }

    return res.json({ consent: updated });
  } catch (error) {
    console.error('Failed revoking consent:', error);
    return res.status(500).json({ error: 'Unable to revoke consent.' });
  }
});

// Validate live consent status for a provider-worker pair
consentsRouter.get('/validate/:workerId', requireAuth, requireRole('PROVIDER'), async (req: AuthRequest, res) => {
  const pp = req.providerProfile;
  if (!pp) return res.status(404).json({ error: 'Provider profile not found.' });

  try {
    const active = await getValidActiveConsent(pp.id, req.params.workerId);
    return res.json({
      hasValidConsent: Boolean(active),
      consent: active,
    });
  } catch (error) {
    console.error('Failed validating consent:', error);
    return res.status(500).json({ error: 'Unable to validate consent.' });
  }
});
