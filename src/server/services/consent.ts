import { and, desc, eq, gt, isNull, lte } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { consentRecords } from '../../db/schema.ts';

export type ConsentRecord = typeof consentRecords.$inferSelect;

/**
 * Marks any ACTIVE consent records whose expiry timestamp has passed as EXPIRED.
 */
export async function syncExpiredConsents(): Promise<void> {
  try {
    await db
      .update(consentRecords)
      .set({
        status: 'EXPIRED',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(consentRecords.status, 'ACTIVE'),
          lte(consentRecords.expiresAt, new Date())
        )
      );
  } catch (error) {
    console.error('Error syncing expired consents:', error);
  }
}

/**
 * Returns the active, unrevoked, unexpired consent between a provider and a worker, if any.
 */
export async function getValidActiveConsent(
  providerId: string,
  workerId: string
): Promise<ConsentRecord | null> {
  await syncExpiredConsents();
  const now = new Date();

  const [consent] = await db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.providerId, providerId),
        eq(consentRecords.workerId, workerId),
        eq(consentRecords.status, 'ACTIVE'),
        isNull(consentRecords.revokedAt),
        gt(consentRecords.expiresAt, now)
      )
    )
    .orderBy(desc(consentRecords.grantedAt))
    .limit(1);

  return consent || null;
}

export function isCategoryPermitted(consent: ConsentRecord, category: string): boolean {
  const categories = Array.isArray(consent.permittedCategories)
    ? consent.permittedCategories
    : [];
  return categories.includes(category);
}
