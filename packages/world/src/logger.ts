/**
 * Abstract Logger Interface for @hololand/world
 */

export interface HololandWorldLogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug?(message: string, meta?: Record<string, any>): void;
}

/**
 * No-op logger (default)
 */
class NoOpLogger implements HololandWorldLogger {
  info() {}
  warn() {}
  error() {}
  debug() {}
}

let currentLogger: HololandWorldLogger = new NoOpLogger();

/**
 * Set custom logger implementation
 */
export function setHololandWorldLogger(logger: HololandWorldLogger): void {
  currentLogger = logger;
}

/**
 * Get current logger instance
 */
export function getLogger(): HololandWorldLogger {
  return currentLogger;
}

/**
 * Reset to no-op logger
 */
export function resetLogger(): void {
  currentLogger = new NoOpLogger();
}

/**
 * Export logger instance for internal use
 */
export const logger = {
  info: (message: string, meta?: Record<string, any>) => currentLogger.info(message, meta),
  warn: (message: string, meta?: Record<string, any>) => currentLogger.warn(message, meta),
  error: (message: string, meta?: Record<string, any>) => currentLogger.error(message, meta),
  debug: (message: string, meta?: Record<string, any>) => currentLogger.debug?.(message, meta),
};
