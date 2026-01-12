/**
 * Abstract Logger Interface
 *
 * AI Bridge uses this interface for logging.
 * Users can provide their own implementation via setHololandAILogger()
 */

export interface HololandAILogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug?(message: string, meta?: Record<string, any>): void;
}

/**
 * No-op logger (default)
 */
class NoOpLogger implements HololandAILogger {
  info() {}
  warn() {}
  error() {}
  debug() {}
}

let currentLogger: HololandAILogger = new NoOpLogger();

/**
 * Set custom logger implementation
 *
 * @example
 * ```ts
 * setHololandAILogger({
 *   info: (msg, meta) => console.log(msg, meta),
 *   warn: (msg, meta) => console.warn(msg, meta),
 *   error: (msg, meta) => console.error(msg, meta),
 * });
 * ```
 */
export function setHololandAILogger(logger: HololandAILogger): void {
  currentLogger = logger;
}

/**
 * Get current logger instance
 */
export function getLogger(): HololandAILogger {
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
