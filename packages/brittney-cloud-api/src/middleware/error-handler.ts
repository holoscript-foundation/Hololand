/**
 * Error Handler Middleware
 *
 * Global error handler for Express
 */

import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'error-handler' });

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
    },
  }, 'Unhandled error');

  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(error);
  }

  // Determine status code
  const statusCode = error.statusCode || error.status || 500;

  // Send error response
  res.status(statusCode).json({
    error: error.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
}
