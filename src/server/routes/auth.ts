import crypto from 'crypto';
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  users,
  workerProfiles,
  providerProfiles,
  emergencyTokens,
} from '../../db/schema.ts';
import {
  getClientIp,
  isPrivilegedEvaluatorEmail,
  requireAuth,
  verifyFirebaseOnly,
  type AuthRequest,
} from '../middleware/auth.ts';
import { createNotification, logAuditEvent } from '../services/audit.ts';

export const authRouter = Router();

function generateWorkerCode(): string {
  const num = crypto.randomInt(1000, 9999);
  const alpha = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CB-KL-2026-${num}${alpha.slice(0, 2)}`;
}

function generateEmergencyIdentifier(): string {
  return `EMG-KL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

const registerSchema = z.object({
  role: z.enum(['WORKER', 'PROVIDER', 'ADMIN']),
  fullName: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().max(30).optional().default(''),
  preferredLanguage: z.enum(['en', 'ml', 'hi', 'bn']).optional().default('en'),
  district: z.string().trim().max(60).optional().default('Ernakulam'),
  // Worker optional fields
  dateOfBirth: z.string().trim().max(20).optional(),
  gender: z.string().trim().max(30).optional(),
  nationality: z.string().trim().max(60).optional().default('Indian'),
  originState: z.string().trim().max(60).optional(),
  currentAddress: z.string().trim().max(300).optional(),
  bloodGroup: z.string().trim().max(15).optional(),
  knownAllergies: z.string().trim().max(500).optional(),
  chronicConditions: z.string().trim().max(500).optional(),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
  emergencyContactRelation: z.string().trim().max(60).optional(),
  // Provider optional fields
  designation: z.string().trim().max(120).optional(),
  hospitalName: z.string().trim().max(180).optional(),
  registrationNumber: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
});

// Verify Firebase token and return hydrated PostgreSQL session
authRouter.get('/session', verifyFirebaseOnly, async (req: AuthRequest, res) => {
  try {
    const firebaseUser = req.firebaseUser!;
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUser.uid))
      .limit(1);

    if (!dbUser) {
      return res.json({
        authenticated: true,
        needsRegistration: true,
        firebase: {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.name || '',
          picture: firebaseUser.picture || '',
        },
        canEvaluateRoles: isPrivilegedEvaluatorEmail(firebaseUser.email),
      });
    }

    if (!dbUser.isActive) {
      return res.status(403).json({
        error: 'Your account has been deactivated by an administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Update lastLoginAt asynchronously without blocking response
    db.update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, dbUser.id))
      .catch((err) => console.error('Failed updating lastLoginAt:', err));

    const [workerProfile] = await db
      .select()
      .from(workerProfiles)
      .where(eq(workerProfiles.userId, dbUser.id))
      .limit(1);

    const [providerProfile] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.userId, dbUser.id))
      .limit(1);

    return res.json({
      authenticated: true,
      needsRegistration: false,
      user: dbUser,
      workerProfile: workerProfile || null,
      providerProfile: providerProfile || null,
      canEvaluateRoles: dbUser.role === 'ADMIN' || isPrivilegedEvaluatorEmail(dbUser.email),
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ error: 'Unable to load session. Please try again.' });
  }
});

// Complete user registration in PostgreSQL after Firebase Auth sign-in/sign-up
authRouter.post('/register', verifyFirebaseOnly, async (req: AuthRequest, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid registration details.',
        details: parsed.error.flatten(),
      });
    }

    const input = parsed.data;
    const firebaseUser = req.firebaseUser!;
    const email = (firebaseUser.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Authenticated account must have a valid email address.' });
    }

    // Enforce admin creation policy
    if (input.role === 'ADMIN' && !isPrivilegedEvaluatorEmail(email)) {
      return res.status(403).json({
        error: 'Administrator accounts can only be provisioned for authorized system administrators.',
      });
    }

    if (input.role === 'PROVIDER') {
      if (!input.designation || !input.hospitalName || !input.registrationNumber) {
        return res.status(400).json({
          error: 'Providers must supply designation, hospital/clinic name, and registration identifier.',
        });
      }
    }

    // Upsert user safely to prevent concurrent race condition errors
    const [existingByUid] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUser.uid))
      .limit(1);

    let dbUser = existingByUid;
    if (!dbUser) {
      const [inserted] = await db
        .insert(users)
        .values({
          firebaseUid: firebaseUser.uid,
          email,
          fullName: input.fullName,
          role: input.role,
          preferredLanguage: input.preferredLanguage,
          isActive: true,
          lastLoginAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.firebaseUid,
          set: {
            fullName: input.fullName,
            preferredLanguage: input.preferredLanguage,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning();
      dbUser = inserted;
    }

    let workerProfile = null;
    let providerProfile = null;

    if (dbUser.role === 'WORKER') {
      const [existingWp] = await db
        .select()
        .from(workerProfiles)
        .where(eq(workerProfiles.userId, dbUser.id))
        .limit(1);

      if (existingWp) {
        workerProfile = existingWp;
      } else {
        const [createdWp] = await db
          .insert(workerProfiles)
          .values({
            userId: dbUser.id,
            workerCode: generateWorkerCode(),
            fullName: input.fullName,
            profilePhotoUrl: firebaseUser.picture || null,
            dateOfBirth: input.dateOfBirth || null,
            gender: input.gender || null,
            phoneNumber: input.phoneNumber || null,
            email,
            nationality: input.nationality || 'Indian',
            originState: input.originState || null,
            preferredLanguage: input.preferredLanguage,
            currentAddress: input.currentAddress || null,
            district: input.district || 'Ernakulam',
            emergencyContactName: input.emergencyContactName || null,
            emergencyContactPhone: input.emergencyContactPhone || null,
            emergencyContactRelation: input.emergencyContactRelation || null,
            shareEmergencyContact: true,
            bloodGroup: input.bloodGroup || null,
            knownAllergies: input.knownAllergies || null,
            chronicConditions: input.chronicConditions || null,
          })
          .returning();
        workerProfile = createdWp;

        // Provision initial cryptographically random emergency QR token
        await db.insert(emergencyTokens).values({
          workerId: createdWp.id,
          token: crypto.randomBytes(32).toString('base64url'),
          emergencyIdentifier: generateEmergencyIdentifier(),
          isActive: true,
          shareEmergencyContact: true,
        });
      }
    } else if (dbUser.role === 'PROVIDER') {
      const [existingPp] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, dbUser.id))
        .limit(1);

      if (existingPp) {
        providerProfile = existingPp;
      } else {
        const [createdPp] = await db
          .insert(providerProfiles)
          .values({
            userId: dbUser.id,
            fullName: input.fullName,
            profilePhotoUrl: firebaseUser.picture || null,
            email,
            phoneNumber: input.phoneNumber || null,
            designation: input.designation || 'Medical Officer',
            hospitalName: input.hospitalName || 'Kerala District Clinic',
            registrationNumber:
              input.registrationNumber || `TCMC-${crypto.randomInt(10000, 99999)}`,
            address: input.address || null,
            district: input.district || 'Ernakulam',
            isVerified: true,
          })
          .returning();
        providerProfile = createdPp;
      }
    }

    await logAuditEvent({
      actorUserId: dbUser.id,
      actorRole: dbUser.role,
      actorEmail: dbUser.email,
      targetWorkerId: workerProfile?.id || null,
      action: 'USER_REGISTERED',
      resourceType: 'users',
      resourceId: dbUser.id,
      details: { role: dbUser.role, preferredLanguage: dbUser.preferredLanguage },
      ipAddress: getClientIp(req),
    });

    await createNotification({
      userId: dbUser.id,
      type: 'SYSTEM',
      title: 'Welcome to CareBridge',
      message:
        dbUser.role === 'WORKER'
          ? `Your portable Health ID (${workerProfile?.workerCode}) and emergency QR code are ready.`
          : dbUser.role === 'PROVIDER'
            ? 'Your healthcare provider profile is active. Request worker consent to view records.'
            : 'Administrator dashboard access initialized.',
      linkUrl:
        dbUser.role === 'WORKER'
          ? '/worker/dashboard'
          : dbUser.role === 'PROVIDER'
            ? '/provider/dashboard'
            : '/admin/dashboard',
    });

    return res.status(201).json({
      user: dbUser,
      workerProfile,
      providerProfile,
      canEvaluateRoles: dbUser.role === 'ADMIN' || isPrivilegedEvaluatorEmail(dbUser.email),
    });
  } catch (error: unknown) {
    console.error('Registration failed:', error);
    const pgCode = (error as { code?: string; cause?: { code?: string } })?.code ||
      (error as { cause?: { code?: string } })?.cause?.code;
    if (pgCode === '23505') {
      return res.status(409).json({
        error: 'An account or registration number with these details already exists.',
      });
    }
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Persist language selection in user profile
authRouter.patch('/language', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({ language: z.enum(['en', 'ml', 'hi', 'bn']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Unsupported language code.' });
  }

  try {
    const { language } = parsed.data;
    const dbUser = req.dbUser!;

    await db
      .update(users)
      .set({ preferredLanguage: language, updatedAt: new Date() })
      .where(eq(users.id, dbUser.id));

    if (req.workerProfile) {
      await db
        .update(workerProfiles)
        .set({ preferredLanguage: language, updatedAt: new Date() })
        .where(eq(workerProfiles.id, req.workerProfile.id));
    }

    return res.json({ preferredLanguage: language });
  } catch (error) {
    console.error('Failed updating language preference:', error);
    return res.status(500).json({ error: 'Failed to update language preference.' });
  }
});

// Restricted academic evaluation role switcher ONLY for verified project administrator emails
authRouter.post('/switch-evaluation-role', requireAuth, async (req: AuthRequest, res) => {
  const dbUser = req.dbUser!;
  if (dbUser.role !== 'ADMIN' && !isPrivilegedEvaluatorEmail(dbUser.email)) {
    return res.status(403).json({
      error: 'Role switching is restricted to authorized system administrators.',
    });
  }

  const schema = z.object({ role: z.enum(['WORKER', 'PROVIDER', 'ADMIN']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid target role.' });
  }

  try {
    const targetRole = parsed.data.role;
    const [updatedUser] = await db
      .update(users)
      .set({ role: targetRole, updatedAt: new Date() })
      .where(eq(users.id, dbUser.id))
      .returning();

    let workerProfile = null;
    let providerProfile = null;

    if (targetRole === 'WORKER') {
      const [existingWp] = await db
        .select()
        .from(workerProfiles)
        .where(eq(workerProfiles.userId, dbUser.id))
        .limit(1);
      if (existingWp) {
        workerProfile = existingWp;
      } else {
        const [createdWp] = await db
          .insert(workerProfiles)
          .values({
            userId: dbUser.id,
            workerCode: generateWorkerCode(),
            fullName: dbUser.fullName,
            email: dbUser.email,
            nationality: 'Indian',
            district: 'Ernakulam',
            preferredLanguage: dbUser.preferredLanguage,
            bloodGroup: 'O+',
            knownAllergies: 'None reported',
            shareEmergencyContact: true,
          })
          .returning();
        workerProfile = createdWp;

        await db.insert(emergencyTokens).values({
          workerId: createdWp.id,
          token: crypto.randomBytes(32).toString('base64url'),
          emergencyIdentifier: generateEmergencyIdentifier(),
          isActive: true,
          shareEmergencyContact: true,
        });
      }
    } else if (targetRole === 'PROVIDER') {
      const [existingPp] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, dbUser.id))
        .limit(1);
      if (existingPp) {
        providerProfile = existingPp;
      } else {
        const [createdPp] = await db
          .insert(providerProfiles)
          .values({
            userId: dbUser.id,
            fullName: dbUser.fullName,
            email: dbUser.email,
            designation: 'Medical Officer',
            hospitalName: 'Ernakulam Community Health Centre',
            registrationNumber: `TCMC-${crypto.randomInt(60000, 99999)}`,
            district: 'Ernakulam',
            isVerified: true,
          })
          .returning();
        providerProfile = createdPp;
      }
    }

    await logAuditEvent({
      actorUserId: dbUser.id,
      actorRole: targetRole,
      actorEmail: dbUser.email,
      action: 'EVALUATION_ROLE_SWITCHED',
      resourceType: 'users',
      resourceId: dbUser.id,
      details: { previousRole: dbUser.role, newRole: targetRole },
      ipAddress: getClientIp(req),
    });

    return res.json({
      user: updatedUser,
      workerProfile,
      providerProfile,
      canEvaluateRoles: true,
    });
  } catch (error) {
    console.error('Evaluation role switch failed:', error);
    return res.status(500).json({ error: 'Unable to switch role right now.' });
  }
});

// Authenticated directory of healthcare providers (for workers granting consent)
authRouter.get('/providers-directory', requireAuth, async (_req, res) => {
  try {
    const list = await db
      .select({
        id: providerProfiles.id,
        fullName: providerProfiles.fullName,
        designation: providerProfiles.designation,
        hospitalName: providerProfiles.hospitalName,
        registrationNumber: providerProfiles.registrationNumber,
        district: providerProfiles.district,
        isVerified: providerProfiles.isVerified,
      })
      .from(providerProfiles);

    return res.json({ providers: list });
  } catch (error) {
    console.error('Failed listing provider directory:', error);
    return res.status(500).json({ error: 'Failed to load healthcare providers.' });
  }
});
