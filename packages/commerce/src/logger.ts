/**
 * Abstract Logger Interface for @hololand/commerce
 */

export interface HololandCommerceLogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug?(message: string, meta?: Record<string, any>): void;
}

class NoOpLogger implements HololandCommerceLogger {
  info() {}
  warn() {}
  error() {}
  debug() {}
}

let currentLogger: HololandCommerceLogger = new NoOpLogger();

export function setHololandCommerceLogger(logger: HololandCommerceLogger): void {
  currentLogger = logger;
}

export function resetLogger(): void {
  currentLogger = new NoOpLogger();
}

export const logger = {
  info: (message: string, meta?: Record<string, any>) => currentLogger.info(message, meta),
  warn: (message: string, meta?: Record<string, any>) => currentLogger.warn(message, meta),
  error: (message: string, meta?: Record<string, any>) => currentLogger.error(message, meta),
  debug: (message: string, meta?: Record<string, any>) => currentLogger.debug?.(message, meta),
};
