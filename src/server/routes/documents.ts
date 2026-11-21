import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import { healthRecords, medicalDocuments } from '../../db/schema.ts';
import {
  ALLOWED_DOCUMENT_MIMES,
  MAX_DOCUMENT_SIZE_BYTES,
  RECORD_CATEGORIES,
} from '../../shared/constants.ts';
import {
  getClientIp,
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../middleware/auth.ts';
import { createNotification, logAuditEvent } from '../services/audit.ts';
import {
  deletePrivateDocument,
  readPrivateDocument,
  savePrivateDocument,
} from '../services/storage.ts';
import { getOcrProvider } from '../services/ocr.ts';
import { generateStructuredHealthSummary } from '../services/aiSummary.ts';
import { getValidActiveConsent, isCategoryPermitted } from '../services/consent.ts';

export const documentsRouter = Router();

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OCR or AI summary requests. Please wait a few minutes.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed: readonly string[] = ALLOWED_DOCUMENT_MIMES;
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Only JPG, JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

// Helper to verify document access for either owning Worker OR consented Provider (Admins denied!)
async function assertCanReadDocument(req: AuthRequest, doc: typeof medicalDocuments.$inferSelect) {
  if (req.dbUser!.role === 'WORKER') {
    return req.workerProfile?.id === doc.workerId;
  }

  if (req.dbUser!.role === 'PROVIDER' && req.providerProfile) {
    const consent = await getValidActiveConsent(req.providerProfile.id, doc.workerId);
    if (!consent) return false;
    if (doc.healthRecordId) {
      const [rec] = await db
        .select({ category: healthRecords.category })
        .from(healthRecords)
        .where(eq(healthRecords.id, doc.healthRecordId))
        .limit(1);
      if (rec && !isCategoryPermitted(consent, rec.category)) {
        return false;
      }
    }
    return true;
  }

  // Administrators do not receive automatic access to private medical documents
  return false;
}

// List worker's uploaded documents (metadata only — never returns fileDataBase64)
documentsRouter.get('/', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const docs = await db
      .select({
        id: medicalDocuments.id,
        workerId: medicalDocuments.workerId,
        healthRecordId: medicalDocuments.healthRecordId,
        originalFileName: medicalDocuments.originalFileName,
        mimeType: medicalDocuments.mimeType,
        fileSizeBytes: medicalDocuments.fileSizeBytes,
        storageProvider: medicalDocuments.storageProvider,
        processingStatus: medicalDocuments.processingStatus,
        ocrEngine: medicalDocuments.ocrEngine,
        ocrRawText: medicalDocuments.ocrRawText,
        ocrVerifiedText: medicalDocuments.ocrVerifiedText,
        aiSummaryJson: medicalDocuments.aiSummaryJson,
        createdAt: medicalDocuments.createdAt,
        updatedAt: medicalDocuments.updatedAt,
      })
      .from(medicalDocuments)
      .where(eq(medicalDocuments.workerId, wp.id))
      .orderBy(desc(medicalDocuments.createdAt));

    return res.json({ documents: docs });
  } catch (error) {
    console.error('Failed listing medical documents:', error);
    return res.status(500).json({ error: 'Unable to list medical documents.' });
  }
});

// Upload private medical document (Worker)
documentsRouter.post(
  '/upload',
  requireAuth,
  requireRole('WORKER'),
  (req, res, next) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File exceeds the maximum limit of 10 MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof Error) {
        return res.status(400).json({ error: err.message });
      }
      return next();
    });
  },
  async (req: AuthRequest, res) => {
    const wp = req.workerProfile;
    if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Please select a JPG, PNG, or PDF medical document.' });
    }

    try {
      const healthRecordId =
        typeof req.body.healthRecordId === 'string' && req.body.healthRecordId.trim()
          ? req.body.healthRecordId.trim()
          : null;

      if (healthRecordId) {
        const [ownedRec] = await db
          .select({ id: healthRecords.id })
          .from(healthRecords)
          .where(and(eq(healthRecords.id, healthRecordId), eq(healthRecords.workerId, wp.id)))
          .limit(1);
        if (!ownedRec) {
          return res.status(403).json({ error: 'Cannot attach document to an unauthorized record.' });
        }
      }

      const stored = await savePrivateDocument(
        file.buffer,
        wp.id,
        file.originalname,
        file.mimetype
      );

      const [doc] = await db
        .insert(medicalDocuments)
        .values({
          workerId: wp.id,
          healthRecordId,
          uploadedByUserId: req.dbUser!.id,
          originalFileName: file.originalname,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          fileDataBase64: stored.fileDataBase64,
          processingStatus: 'UPLOADED',
        })
        .returning({
          id: medicalDocuments.id,
          workerId: medicalDocuments.workerId,
          healthRecordId: medicalDocuments.healthRecordId,
          originalFileName: medicalDocuments.originalFileName,
          mimeType: medicalDocuments.mimeType,
          fileSizeBytes: medicalDocuments.fileSizeBytes,
          storageProvider: medicalDocuments.storageProvider,
          processingStatus: medicalDocuments.processingStatus,
          createdAt: medicalDocuments.createdAt,
        });

      await logAuditEvent({
        actorUserId: req.dbUser!.id,
        actorRole: 'WORKER',
        actorEmail: req.dbUser!.email,
        targetWorkerId: wp.id,
        action: 'DOCUMENT_UPLOADED',
        resourceType: 'medical_documents',
        resourceId: doc.id,
        details: {
          fileName: doc.originalFileName,
          mimeType: doc.mimeType,
          sizeBytes: doc.fileSizeBytes,
          storageProvider: doc.storageProvider,
        },
        ipAddress: getClientIp(req),
      });

      return res.status(201).json({ document: doc });
    } catch (error) {
      console.error('Medical document upload failed:', error);
      return res.status(500).json({ error: 'Failed to store medical document securely.' });
    }
  }
);

// Get single document metadata + OCR + AI summary (Worker owner or consented Provider)
documentsRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, req.params.id))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const allowed = await assertCanReadDocument(req, doc);
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden: You do not have valid authorization or consent to view this document.',
      });
    }

    const { fileDataBase64: _strip, storageKey: _hideKey, ...safeMetadata } = doc;
    return res.json({ document: safeMetadata });
  } catch (error) {
    console.error('Error fetching document metadata:', error);
    return res.status(500).json({ error: 'Unable to load document details.' });
  }
});

// Stream private document bytes through authenticated endpoint (NEVER public URLs)
documentsRouter.get('/:id/content', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, req.params.id))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const allowed = await assertCanReadDocument(req, doc);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Unauthorized document access.' });
    }

    const buffer = await readPrivateDocument(doc);

    if (req.dbUser!.role === 'PROVIDER') {
      await logAuditEvent({
        actorUserId: req.dbUser!.id,
        actorRole: 'PROVIDER',
        actorEmail: req.dbUser!.email,
        targetWorkerId: doc.workerId,
        action: 'DOCUMENT_VIEWED_BY_PROVIDER',
        resourceType: 'medical_documents',
        resourceId: doc.id,
        details: { fileName: doc.originalFileName },
        ipAddress: getClientIp(req),
      });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${doc.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(buffer);
  } catch (error) {
    console.error('Failed streaming private document:', error);
    return res.status(500).json({ error: 'Unable to retrieve private medical document.' });
  }
});

// Run OCR extraction via pluggable OcrProvider (Gemini multimodal by default)
documentsRouter.post(
  '/:id/ocr',
  requireAuth,
  requireRole('WORKER'),
  aiRateLimiter,
  async (req: AuthRequest, res) => {
    const wp = req.workerProfile;
    if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

    try {
      const [doc] = await db
        .select()
        .from(medicalDocuments)
        .where(and(eq(medicalDocuments.id, req.params.id), eq(medicalDocuments.workerId, wp.id)))
        .limit(1);

      if (!doc) {
        return res.status(404).json({ error: 'Medical document not found.' });
      }

      await db
        .update(medicalDocuments)
        .set({ processingStatus: 'OCR_PROCESSING', updatedAt: new Date() })
        .where(eq(medicalDocuments.id, doc.id));

      const fileBuffer = await readPrivateDocument(doc);
      const ocrProvider = getOcrProvider();
      const result = await ocrProvider.extractText(
        fileBuffer,
        doc.mimeType,
        doc.originalFileName
      );

      const [updated] = await db
        .update(medicalDocuments)
        .set({
          processingStatus: 'OCR_COMPLETED',
          ocrEngine: result.engine,
          ocrRawText: result.extractedText,
          ocrVerifiedText: result.extractedText,
          updatedAt: new Date(),
        })
        .where(eq(medicalDocuments.id, doc.id))
        .returning({
          id: medicalDocuments.id,
          originalFileName: medicalDocuments.originalFileName,
          mimeType: medicalDocuments.mimeType,
          processingStatus: medicalDocuments.processingStatus,
          ocrEngine: medicalDocuments.ocrEngine,
          ocrRawText: medicalDocuments.ocrRawText,
          ocrVerifiedText: medicalDocuments.ocrVerifiedText,
          aiSummaryJson: medicalDocuments.aiSummaryJson,
          healthRecordId: medicalDocuments.healthRecordId,
          updatedAt: medicalDocuments.updatedAt,
        });

      await logAuditEvent({
        actorUserId: req.dbUser!.id,
        actorRole: 'WORKER',
        actorEmail: req.dbUser!.email,
        targetWorkerId: wp.id,
        action: 'OCR_PROCESSED',
        resourceType: 'medical_documents',
        resourceId: doc.id,
        details: { engine: result.engine, charCount: result.extractedText.length },
        ipAddress: getClientIp(req),
      });

      await createNotification({
        userId: req.dbUser!.id,
        type: 'OCR_READY',
        title: 'OCR Extraction Complete',
        message: `Text extracted from "${doc.originalFileName}". Please review and verify before saving as a health record.`,
        linkUrl: `/worker/documents/${doc.id}/ocr`,
      });

      return res.json({ document: updated });
    } catch (error: unknown) {
      console.error('OCR extraction failed:', error);
      await db
        .update(medicalDocuments)
        .set({ processingStatus: 'FAILED', updatedAt: new Date() })
        .where(eq(medicalDocuments.id, req.params.id))
        .catch(() => {});

      const msg = error instanceof Error ? error.message : 'OCR processing failed.';
      return res.status(502).json({ error: msg });
    }
  }
);

// Worker manually edits / verifies extracted OCR text
documentsRouter.put('/:id/ocr', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  const schema = z.object({
    ocrVerifiedText: z.string().trim().min(1).max(20000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Verified OCR text cannot be empty.' });
  }

  try {
    const [updated] = await db
      .update(medicalDocuments)
      .set({
        ocrVerifiedText: parsed.data.ocrVerifiedText,
        processingStatus: 'OCR_VERIFIED',
        updatedAt: new Date(),
      })
      .where(and(eq(medicalDocuments.id, req.params.id), eq(medicalDocuments.workerId, wp.id)))
      .returning({
        id: medicalDocuments.id,
        originalFileName: medicalDocuments.originalFileName,
        processingStatus: medicalDocuments.processingStatus,
        ocrRawText: medicalDocuments.ocrRawText,
        ocrVerifiedText: medicalDocuments.ocrVerifiedText,
        aiSummaryJson: medicalDocuments.aiSummaryJson,
        healthRecordId: medicalDocuments.healthRecordId,
        updatedAt: medicalDocuments.updatedAt,
      });

    if (!updated) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    return res.json({ document: updated });
  } catch (error) {
    console.error('Failed saving verified OCR text:', error);
    return res.status(500).json({ error: 'Unable to save verified OCR text.' });
  }
});

// Generate structured Gemini AI health summary from document's OCR text
documentsRouter.post(
  '/:id/ai-summary',
  requireAuth,
  requireRole('WORKER'),
  aiRateLimiter,
  async (req: AuthRequest, res) => {
    const wp = req.workerProfile;
    if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

    try {
      const [doc] = await db
        .select()
        .from(medicalDocuments)
        .where(and(eq(medicalDocuments.id, req.params.id), eq(medicalDocuments.workerId, wp.id)))
        .limit(1);

      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const sourceText = (doc.ocrVerifiedText || doc.ocrRawText || '').trim();
      if (!sourceText) {
        return res.status(400).json({
          error: 'Please run OCR extraction before generating an AI health summary.',
        });
      }

      const summary = await generateStructuredHealthSummary({
        sourceText,
        recordTitle: doc.originalFileName,
        workerAllergies: wp.knownAllergies,
        workerChronicConditions: wp.chronicConditions,
      });

      const [updated] = await db
        .update(medicalDocuments)
        .set({ aiSummaryJson: summary, updatedAt: new Date() })
        .where(eq(medicalDocuments.id, doc.id))
        .returning({
          id: medicalDocuments.id,
          originalFileName: medicalDocuments.originalFileName,
          processingStatus: medicalDocuments.processingStatus,
          ocrRawText: medicalDocuments.ocrRawText,
          ocrVerifiedText: medicalDocuments.ocrVerifiedText,
          aiSummaryJson: medicalDocuments.aiSummaryJson,
          healthRecordId: medicalDocuments.healthRecordId,
          updatedAt: medicalDocuments.updatedAt,
        });

      // Also sync to linked health record if present
      if (doc.healthRecordId) {
        await db
          .update(healthRecords)
          .set({ aiSummaryJson: summary, updatedAt: new Date() })
          .where(
            and(eq(healthRecords.id, doc.healthRecordId), eq(healthRecords.workerId, wp.id))
          );
      }

      await logAuditEvent({
        actorUserId: req.dbUser!.id,
        actorRole: 'WORKER',
        actorEmail: req.dbUser!.email,
        targetWorkerId: wp.id,
        action: 'AI_SUMMARY_GENERATED',
        resourceType: 'medical_documents',
        resourceId: doc.id,
        details: { model: summary.modelUsed },
        ipAddress: getClientIp(req),
      });

      return res.json({ document: updated, summary });
    } catch (error: unknown) {
      console.error('Document AI summary failed:', error);
      const msg = error instanceof Error ? error.message : 'Unable to generate AI summary.';
      return res.status(502).json({ error: msg });
    }
  }
);

// Convert verified OCR document into a structured health record in PostgreSQL
documentsRouter.post(
  '/:id/save-record',
  requireAuth,
  requireRole('WORKER'),
  async (req: AuthRequest, res) => {
    const wp = req.workerProfile;
    if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

    const schema = z.object({
      title: z.string().trim().min(2).max(200),
      category: z.enum(RECORD_CATEGORIES),
      visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      diagnosis: z.string().trim().max(500).nullable().optional(),
      doctorName: z.string().trim().max(150).nullable().optional(),
      hospitalName: z.string().trim().max(200).nullable().optional(),
      prescriptionDetails: z.string().trim().max(2000).nullable().optional(),
      medicationDetails: z.string().trim().max(1500).nullable().optional(),
      laboratoryResults: z.string().trim().max(3000).nullable().optional(),
      medicalNotes: z.string().trim().max(3000).nullable().optional(),
      ocrVerifiedText: z.string().trim().max(20000).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid record fields.', details: parsed.error.flatten() });
    }

    try {
      const [doc] = await db
        .select()
        .from(medicalDocuments)
        .where(and(eq(medicalDocuments.id, req.params.id), eq(medicalDocuments.workerId, wp.id)))
        .limit(1);

      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const d = parsed.data;
      const verifiedText = d.ocrVerifiedText || doc.ocrVerifiedText || doc.ocrRawText || null;

      const [record] = await db
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
          ocrExtractedText: verifiedText,
          aiSummaryJson: doc.aiSummaryJson || null,
        })
        .returning();

      await db
        .update(medicalDocuments)
        .set({
          healthRecordId: record.id,
          ocrVerifiedText: verifiedText,
          processingStatus: 'OCR_VERIFIED',
          updatedAt: new Date(),
        })
        .where(eq(medicalDocuments.id, doc.id));

      await logAuditEvent({
        actorUserId: req.dbUser!.id,
        actorRole: 'WORKER',
        actorEmail: req.dbUser!.email,
        targetWorkerId: wp.id,
        action: 'OCR_SAVED_AS_RECORD',
        resourceType: 'health_records',
        resourceId: record.id,
        details: { documentId: doc.id, category: record.category },
        ipAddress: getClientIp(req),
      });

      return res.status(201).json({ record });
    } catch (error) {
      console.error('Failed saving OCR document as health record:', error);
      return res.status(500).json({ error: 'Unable to save verified record.' });
    }
  }
);

// Delete own uploaded document
documentsRouter.delete('/:id', requireAuth, requireRole('WORKER'), async (req: AuthRequest, res) => {
  const wp = req.workerProfile;
  if (!wp) return res.status(404).json({ error: 'Worker profile not found.' });

  try {
    const [deleted] = await db
      .delete(medicalDocuments)
      .where(and(eq(medicalDocuments.id, req.params.id), eq(medicalDocuments.workerId, wp.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    await deletePrivateDocument(deleted);

    await logAuditEvent({
      actorUserId: req.dbUser!.id,
      actorRole: 'WORKER',
      actorEmail: req.dbUser!.email,
      targetWorkerId: wp.id,
      action: 'DOCUMENT_DELETED',
      resourceType: 'medical_documents',
      resourceId: deleted.id,
      details: { fileName: deleted.originalFileName },
      ipAddress: getClientIp(req),
    });

    return res.json({ deleted: true, id: deleted.id });
  } catch (error) {
    console.error('Failed deleting document:', error);
    return res.status(500).json({ error: 'Unable to delete document.' });
  }
});
