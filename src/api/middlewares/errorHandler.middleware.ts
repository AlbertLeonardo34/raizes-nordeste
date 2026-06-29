import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors/AppError';
import { logger } from '../../infrastructure/logging/logger';
import { v4 as uuidv4 } from 'uuid';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    logger.warn(`[${err.errorCode}] ${err.message}`, { path: req.path, requestId });
    res.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message,
      details: err.details,
      timestamp,
      path: req.path,
      requestId,
    });
    return;
  }

  logger.error('Erro interno não tratado', {
    message: err.message,
    stack: err.stack,
    requestId,
  });

  res.status(500).json({
    error: 'ERRO_INTERNO',
    message: 'Ocorreu um erro interno no servidor',
    details: [],
    timestamp,
    path: req.path,
    requestId,
  });
}
