import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(`Error processing request to ${req.method} ${req.url}:`, err);
  
  const statusCode = err.status || 500;
  const message = err.message || 'An unexpected server error occurred';
  
  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
