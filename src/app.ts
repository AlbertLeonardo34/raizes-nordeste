import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { router } from './api/routes';
import { errorHandler } from './api/middlewares/errorHandler.middleware';
import { swaggerSpec } from './api/swagger/swagger.config';
import { logger } from './infrastructure/logging/logger';

const app = express();

// ── Middlewares globais ─────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de cada requisição
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ── Swagger / OpenAPI ───────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Raízes do Nordeste API',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api/docs.json', (_req: Request, res: Response) => res.json(swaggerSpec));

// ── Rotas da aplicação ──────────────────────────────────────────
app.use('/api/v1', router);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  });
});

// 404 — rota não encontrada
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'NAO_ENCONTRADO',
    message: 'Rota não encontrada',
    details: [],
  });
});

// ── Error Handler (DEVE ser o último middleware) ────────────────
app.use(errorHandler);

export { app };
