import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { notifications } from '../../db/schema.ts';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.dbUser!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return res.json({ notifications: list });
  } catch (error) {
    console.error('Failed loading notifications:', error);
    return res.status(500).json({ error: 'Unable to load notifications.' });
  }
});

notificationsRouter.patch('/:id/read', async (req: AuthRequest, res) => {
  try {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.id, req.params.id), eq(notifications.userId, req.dbUser!.id))
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    return res.json({ notification: updated });
  } catch (error) {
    console.error('Failed marking notification read:', error);
    return res.status(500).json({ error: 'Unable to update notification.' });
  }
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res) => {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.dbUser!.id));

    return res.json({ updated: true });
  } catch (error) {
    console.error('Failed marking all notifications read:', error);
    return res.status(500).json({ error: 'Unable to update notifications.' });
  }
});
