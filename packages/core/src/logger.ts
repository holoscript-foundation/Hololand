/**
 * Abstract Logger Interface
 *
 * HoloScript core uses this interface for logging.
 * Users can provide their own implementation via setHoloScriptLogger().
 */

export interface HoloScriptLogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug?(message: string, meta?: Record<string, any>): void;
}

/**
 * No-op logger (default)
 */
class NoOpLogger implements HoloScriptLogger {
  info() {}
  warn() {}
  error() {}
  debug() {}
}

let currentLogger: HoloScriptLogger = new NoOpLogger();

/**
 * Set custom logger implementation
 *
 * @example
 * ```ts
 * setHoloScriptLogger({
 *   info: (msg, meta) => console.log(msg, meta),
 *   warn: (msg, meta) => console.warn(msg, meta),
 *   error: (msg, meta) => console.error(msg, meta),
 * });
 * ```
 */
export function setHoloScriptLogger(logger: HoloScriptLogger): void {
  currentLogger = logger;
}

/**
 * Get current logger instance
 */
export function getLogger(): HoloScriptLogger {
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
