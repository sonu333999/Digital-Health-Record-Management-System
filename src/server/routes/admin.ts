import { Router } from 'express';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  auditLogs,
  consentRecords,
  emergencyTokens,
  healthRecords,
  medicalDocuments,
  providerProfiles,
  users,
  workerProfiles,
} from '../../db/schema.ts';
import {
  getClientIp,
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../middleware/auth.ts';
import { logAuditEvent } from '../services/audit.ts';
import { syncExpiredConsents } from '../services/consent.ts';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

// System-wide aggregate metrics only — Admin NEVER receives automatic access to private medical records
adminRouter.get('/stats', async (_req: AuthRequest, res) => {
  try {
    await syncExpiredConsents();

    const [workersCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'WORKER'));

    const [providersCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'PROVIDER'));

    const [activeUsersCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isActive, true));

    const [recordsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(healthRecords);

    const [documentsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(medicalDocuments);

    const [activeConsentsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(consentRecords)
      .where(eq(consentRecords.status, 'ACTIVE'));

    const [emergencyScansRow] = await db
      .select({ total: sql<number>`coalesce(sum(${emergencyTokens.accessCount}), 0)::int` })
      .from(emergencyTokens);

    const categoryBreakdown = await db
      .select({
        category: healthRecords.category,
        count: sql<number>`count(*)::int`,
      })
      .from(healthRecords)
      .groupBy(healthRecords.category)
      .orderBy(desc(sql`count(*)`));

    const districtBreakdown = await db
      .select({
        district: sql<string>`coalesce(${workerProfiles.district}, 'Unspecified')`,
        count: sql<number>`count(*)::int`,
      })
      .from(workerProfiles)
      .groupBy(workerProfiles.district)
      .orderBy(desc(sql`count(*)`));

    const recentActivities = await db
      .select({
        id: auditLogs.id,
        actorRole: auditLogs.actorRole,
        actorEmail: auditLogs.actorEmail,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(12);

    return res.json({
      stats: {
        totalWorkers: workersCount?.count ?? 0,
        totalProviders: providersCount?.count ?? 0,
        activeUsers: activeUsersCount?.count ?? 0,
        totalHealthRecords: recordsCount?.count ?? 0,
        totalDocuments: documentsCount?.count ?? 0,
        activeConsents: activeConsentsCount?.count ?? 0,
        emergencyScans: emergencyScansRow?.total ?? 0,
      },
      categoryBreakdown,
      districtBreakdown,
      recentActivities,
    });
  } catch (error) {
    console.error('Admin stats failed:', error);
    return res.status(500).json({ error: 'Unable to load system statistics.' });
  }
});

// User Management list (account metadata only; never exposes private medical contents)
adminRouter.get('/users', async (req: AuthRequest, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role.trim().toUpperCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : '';

    const conditions = [];
    if (role && ['WORKER', 'PROVIDER', 'ADMIN'].includes(role)) {
      conditions.push(eq(users.role, role));
    }
    if (status === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(users.isActive, false));
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(ilike(users.fullName, pattern), ilike(users.email, pattern))!);
    }

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        preferredLanguage: users.preferredLanguage,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        workerCode: workerProfiles.workerCode,
        workerDistrict: workerProfiles.district,
        hospitalName: providerProfiles.hospitalName,
        registrationNumber: providerProfiles.registrationNumber,
      })
      .from(users)
      .leftJoin(workerProfiles, eq(users.id, workerProfiles.userId))
      .leftJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt));

    return res.json({ users: userRows });
  } catch (error) {
    console.error('Admin user listing failed:', error);
    return res.status(500).json({ error: 'Unable to list users.' });
  }
});

// Activate / Deactivate a user account
adminRouter.patch('/users/:id/status', async (req: AuthRequest, res) => {
  const schema = z.object({ isActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid status payload.' });
  }

  if (req.params.id === req.dbUser!.id && !parsed.data.isActive) {
    return res.status(400).json({ error: 'Administrators cannot deactivate their own active account.' });
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(eq(users.id, req.params.id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
      });

    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'ADMIN',
      actorEmail: req.dbUser!.email,
      action: parsed.data.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      resourceType: 'users',
      resourceId: updated.id,
      details: { targetEmail: updated.email, targetRole: updated.role },
      ipAddress: getClientIp(req),
    });

    return res.json({ user: updated });
  } catch (error) {
    console.error('Admin user status update failed:', error);
    return res.status(500).json({ error: 'Unable to update user status.' });
  }
});

// Audit Log monitoring
adminRouter.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role.trim().toUpperCase() : '';
    const action = typeof req.query.action === 'string' ? req.query.action.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const conditions = [];
    if (role && role !== 'ALL') {
      conditions.push(eq(auditLogs.actorRole, role));
    }
    if (action && action !== 'ALL') {
      conditions.push(eq(auditLogs.action, action));
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(auditLogs.action, pattern),
          ilike(auditLogs.actorEmail, pattern),
          ilike(auditLogs.resourceType, pattern)
        )!
      );
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(150);

    return res.json({ logs });
  } catch (error) {
    console.error('Admin audit logs query failed:', error);
    return res.status(500).json({ error: 'Unable to load audit logs.' });
  }
});
