import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../../lib/firebase-admin.ts';
import { db } from '../../db/index.ts';
import { users, workerProfiles, providerProfiles } from '../../db/schema.ts';
import type { UserRole } from '../../shared/constants.ts';

export type DbUser = typeof users.$inferSelect;
export type WorkerProfile = typeof workerProfiles.$inferSelect;
export type ProviderProfile = typeof providerProfiles.$inferSelect;

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: DbUser;
  workerProfile?: WorkerProfile | null;
  providerProfile?: ProviderProfile | null;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function isPrivilegedEvaluatorEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const configured = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  // Allow explicitly configured ADMIN_EMAILS or the academic project owner email
  return configured.includes(normalized) || normalized === 'sonukhajotiya01@gmail.com';
}

export const verifyFirebaseOnly = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty authentication token.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;
    return next();
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
  }
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
  }

  try {
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, req.firebaseUser.uid))
      .limit(1);

    if (!dbUser) {
      return res.status(403).json({
        error: 'Account registration incomplete. Please finish setting up your CareBridge profile.',
        code: 'NEEDS_REGISTRATION',
      });
    }

    if (!dbUser.isActive) {
      return res.status(403).json({
        error: 'This CareBridge account has been deactivated by an administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    req.dbUser = dbUser;

    if (dbUser.role === 'WORKER') {
      const [wp] = await db
        .select()
        .from(workerProfiles)
        .where(eq(workerProfiles.userId, dbUser.id))
        .limit(1);
      req.workerProfile = wp || null;
    } else if (dbUser.role === 'PROVIDER') {
      const [pp] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, dbUser.id))
        .limit(1);
      req.providerProfile = pp || null;
    }

    return next();
  } catch (error) {
    console.error('Failed loading authenticated user from PostgreSQL:', error);
    return res.status(500).json({ error: 'Unable to verify user session. Please try again.' });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.dbUser.role as UserRole)) {
      return res.status(403).json({
        error: `Forbidden: This resource requires ${allowedRoles.join(' or ')} authorization.`,
      });
    }
    return next();
  };
};
