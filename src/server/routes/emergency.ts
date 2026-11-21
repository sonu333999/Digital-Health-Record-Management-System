import crypto from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import { emergencyTokens, workerProfiles } from '../../db/schema.ts';
import {
  getClientIp,
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../middleware/auth.ts';
import { createNotification, logAuditEvent } from '../services/audit.ts';

export const emergencyRouter = Router();

const emergencyLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for emergency lookups. Please try again shortly.' },
});

function buildEmergencyUrl(req: AuthRequest, token: string): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured.startsWith('http')) {
    return `${configured.replace(/\/$/, '')}/emergency/${token}`;
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.headers.host || 'localhost:3000';
  return `${proto}://${host}/emergency/${token}`;
}

// Worker fetches their active Emergency QR code and history
emergencyRouter.get('/my-qr', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const tokens = await db
      .select()
      .from(emergencyTokens)
      .where(eq(emergencyTokens.workerId, wp.id))
      .orderBy(desc(emergencyTokens.createdAt))
      .limit(10);

    const active = tokens.find((t) => t.isActive && !t.revokedAt) || null;
    let qrDataUrl: string | null = null;
    let emergencyUrl: string | null = null;

    if (active) {
      emergencyUrl = buildEmergencyUrl(req, active.token);
      qrDataUrl = await QRCode.toDataURL(emergencyUrl, {
        width: 360,
        margin: 2,
        color: { dark: '#0F1E2E', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      });
    }

    return res.json({
      activeToken: active,
      emergencyUrl,
      qrDataUrl,
      history: tokens.map((t) => ({
        id: t.id,
        emergencyIdentifier: t.emergencyIdentifier,
        isActive: t.isActive,
        accessCount: t.accessCount,
        lastAccessedAt: t.lastAccessedAt,
        revokedAt: t.revokedAt,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed loading emergency QR:', error);
    return res.status(500).json({ error: 'Unable to load emergency QR configuration.' });
  }
});

// Worker generates or regenerates a cryptographically secure Emergency QR token (revoking previous ones)
emergencyRouter.post('/generate', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const now = new Date();
    await db
      .update(emergencyTokens)
      .set({ isActive: false, revokedAt: now })
      .where(and(eq(emergencyTokens.workerId, wp.id), eq(emergencyTokens.isActive, true)));

    const secureToken = crypto.randomBytes(32).toString('base64url');
    const emergencyIdentifier = `EMG-KL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const [created] = await db
      .insert(emergencyTokens)
      .values({
        workerId: wp.id,
        token: secureToken,
        emergencyIdentifier,
        isActive: true,
        shareEmergencyContact: wp.shareEmergencyContact,
      })
      .returning();

    const emergencyUrl = buildEmergencyUrl(req, created.token);
    const qrDataUrl = await QRCode.toDataURL(emergencyUrl, {
      width: 360,
      margin: 2,
      color: { dark: '#0F1E2E', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'EMERGENCY_QR_GENERATED',
      resourceType: 'emergency_tokens',
      resourceId: created.id,
      details: { emergencyIdentifier },
      ipAddress: getClientIp(req),
    });

    return res.status(201).json({
      activeToken: created,
      emergencyUrl,
      qrDataUrl,
    });
  } catch (error) {
    console.error('Failed generating emergency QR:', error);
    return res.status(500).json({ error: 'Unable to generate emergency QR token.' });
  }
});

// Worker immediately revokes their active Emergency QR token
emergencyRouter.post('/revoke', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const revoked = await db
      .update(emergencyTokens)
      .set({ isActive: false, revokedAt: new Date() })
      .where(and(eq(emergencyTokens.workerId, wp.id), eq(emergencyTokens.isActive, true)))
      .returning();

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'EMERGENCY_QR_REVOKED',
      resourceType: 'emergency_tokens',
      details: { revokedCount: revoked.length },
      ipAddress: getClientIp(req),
    });

    return res.json({ revoked: true, count: revoked.length });
  } catch (error) {
    console.error('Failed revoking emergency QR:', error);
    return res.status(500).json({ error: 'Unable to revoke emergency QR.' });
  }
});

// Toggle emergency contact visibility on QR emergency page
emergencyRouter.patch('/settings', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  const schema = z.object({ shareEmergencyContact: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid setting value.' });
  }

  try {
    const share = parsed.data.shareEmergencyContact;
    await db
      .update(workerProfiles)
      .set({ shareEmergencyContact: share, updatedAt: new Date() })
      .where(eq(workerProfiles.id, wp.id));

    await db
      .update(emergencyTokens)
      .set({ shareEmergencyContact: share })
      .where(and(eq(emergencyTokens.workerId, wp.id), eq(emergencyTokens.isActive, true)));

    return res.json({ shareEmergencyContact: share });
  } catch (error) {
    console.error('Failed updating emergency contact sharing setting:', error);
    return res.status(500).json({ error: 'Unable to update setting.' });
  }
});

// PUBLIC, RATE-LIMITED Emergency Access Lookup — exposes ONLY strictly restricted emergency fields!
emergencyRouter.get('/public/:token', emergencyLookupLimiter, async (req, res) => {
  const rawToken = (req.params.token || '').trim();
  if (!rawToken || rawToken.length < 16 || rawToken.length > 128) {
    return res.status(404).json({ error: 'Emergency QR code is invalid or revoked.' });
  }

  try {
    const [row] = await db
      .select({
        tokenRecord: emergencyTokens,
        worker: workerProfiles,
      })
      .from(emergencyTokens)
      .innerJoin(workerProfiles, eq(emergencyTokens.workerId, workerProfiles.id))
      .where(and(eq(emergencyTokens.token, rawToken), eq(emergencyTokens.isActive, true)))
      .limit(1);

    if (!row || row.tokenRecord.revokedAt) {
      return res.status(404).json({
        error: 'This emergency QR token is invalid or has been revoked by the worker.',
      });
    }

    // Increment access count and timestamp
    await db
      .update(emergencyTokens)
      .set({
        accessCount: sql`${emergencyTokens.accessCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(emergencyTokens.id, row.tokenRecord.id));

    const includeContact =
      row.tokenRecord.shareEmergencyContact && row.worker.shareEmergencyContact;

    await logAuditEvent({
      actorUserId: null,
      actorRole: 'PUBLIC_EMERGENCY',
      actorEmail: null,
      targetWorkerId: row.worker.id,
      action: 'EMERGENCY_PROFILE_ACCESSED',
      resourceType: 'emergency_tokens',
      resourceId: row.tokenRecord.id,
      details: {
        emergencyIdentifier: row.tokenRecord.emergencyIdentifier,
        sharedEmergencyContact: includeContact,
      },
      ipAddress: getClientIp(req),
    });

    await createNotification({
      userId: row.worker.userId,
      type: 'EMERGENCY_ACCESS',
      title: 'Emergency QR Accessed',
      message: `Your restricted emergency card (${row.tokenRecord.emergencyIdentifier}) was scanned and viewed.`,
      linkUrl: '/worker/emergency-qr',
    });

    // STRICTLY RESTRICTED PAYLOAD — never expose email, full address, credentials, or complete health records
    return res.json({
      emergencyProfile: {
        workerName: row.worker.fullName,
        emergencyIdentifier: row.tokenRecord.emergencyIdentifier,
        bloodGroup: row.worker.bloodGroup || 'Not specified',
        knownAllergies: row.worker.knownAllergies || 'None recorded',
        chronicConditions: row.worker.chronicConditions || 'None recorded',
        preferredLanguage: row.worker.preferredLanguage,
        emergencyContact: includeContact
          ? {
              name: row.worker.emergencyContactName || null,
              phone: row.worker.emergencyContactPhone || null,
              relation: row.worker.emergencyContactRelation || null,
            }
          : null,
        accessedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Emergency QR lookup failed:', error);
    return res.status(500).json({ error: 'Unable to retrieve emergency card at this moment.' });
  }
});
