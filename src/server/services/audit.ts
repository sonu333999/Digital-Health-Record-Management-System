import { db } from '../../db/index.ts';
import { auditLogs, notifications } from '../../db/schema.ts';

export interface AuditEventInput {
  actorUserId?: string | null;
  actorRole: string;
  actorEmail?: string | null;
  targetWorkerId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail ?? null,
      targetWorkerId: input.targetWorkerId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      details: input.details ?? null,
      ipAddress: input.ipAddress ?? null,
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
}

export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl ?? null,
      isRead: false,
    });
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
}
