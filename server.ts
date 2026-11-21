import * as dotenv from 'dotenv';
dotenv.config();

import express, { type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './src/server/routes/auth.ts';
import { workerRouter } from './src/server/routes/worker.ts';
import { documentsRouter } from './src/server/routes/documents.ts';
import { consentsRouter } from './src/server/routes/consents.ts';
import { providerRouter } from './src/server/routes/provider.ts';
import { emergencyRouter } from './src/server/routes/emergency.ts';
import { adminRouter } from './src/server/routes/admin.ts';
import { notificationsRouter } from './src/server/routes/notifications.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);

  // Security headers (compatible with AI Studio preview iframe)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));

  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again shortly.' },
  });

  app.use('/api', apiLimiter);

  // Health probe (no eager database query at startup)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'CareBridge API', timestamp: new Date().toISOString() });
  });

  // Mount domain REST API routers
  app.use('/api/auth', authRouter);
  app.use('/api/worker', workerRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/consents', consentsRouter);
  app.use('/api/provider', providerRouter);
  app.use('/api/emergency', emergencyRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/notifications', notificationsRouter);

  // 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Centralized safe error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'An internal server error occurred.' });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CareBridge server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting CareBridge server:', err);
  process.exit(1);
});
