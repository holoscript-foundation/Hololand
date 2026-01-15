/**
 * @hololand/logger
 *
 * Unified logging for all Hololand packages.
 *
 * Features:
 * - Pluggable logger interface
 * - Domain-specific logger factories
 * - NoOp (silent) and Console (verbose) defaults
 * - TypeScript support
 *
 * @example
 * ```ts
 * import { createLogger, setGlobalLogger, ConsoleLogger } from '@hololand/logger';
 *
 * // Create domain-specific logger
 * const logger = createLogger('Network');
 * logger.info('Connected'); // [Network:INFO] Connected
 *
 * // Use custom logger implementation
 * setGlobalLogger({
 *   info: (msg, meta) => myCustomLogger.info(msg, meta),
 *   // ...
 * });
 * ```
 */

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Universal logger interface used by all Hololand packages
 */
export interface HololandLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Logger factory options
 */
export interface LoggerOptions {
  /** Prefix for log messages (e.g., "Network", "Social") */
  prefix?: string;
  /** Enable debug logs (default: only in development) */
  enableDebug?: boolean;
  /** Custom logger implementation */
  logger?: HololandLogger;
}

// ============================================================================
// Built-in Logger Implementations
// ============================================================================

/**
 * No-operation logger (silent)
 * Default for production to avoid console noise
 */
export class NoOpLogger implements HololandLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

/**
 * Console logger with prefixes and formatting
 */
export class ConsoleLogger implements HololandLogger {
  private prefix: string;
  private enableDebug: boolean;

  constructor(prefix = 'Hololand', enableDebug = false) {
    this.prefix = prefix;
    this.enableDebug =
      enableDebug ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.enableDebug) {
      console.debug(`[${this.prefix}:DEBUG] ${message}`, meta ?? '');
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[${this.prefix}:INFO] ${message}`, meta ?? '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[${this.prefix}:WARN] ${message}`, meta ?? '');
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[${this.prefix}:ERROR] ${message}`, meta ?? '');
  }
}

// ============================================================================
// Global Logger Management
// ============================================================================

let globalLogger: HololandLogger = new NoOpLogger();

/**
 * Set global logger used by all packages
 *
 * @example
 * ```ts
 * // Use console logging
 * setGlobalLogger(new ConsoleLogger());
 *
 * // Use custom logger (e.g., Pino, Winston)
 * setGlobalLogger({
 *   info: (msg, meta) => pino.info(meta, msg),
 *   warn: (msg, meta) => pino.warn(meta, msg),
 *   error: (msg, meta) => pino.error(meta, msg),
 *   debug: (msg, meta) => pino.debug(meta, msg),
 * });
 * ```
 */
export function setGlobalLogger(logger: HololandLogger): void {
  globalLogger = logger;
}

/**
 * Get current global logger
 */
export function getGlobalLogger(): HololandLogger {
  return globalLogger;
}

/**
 * Reset global logger to NoOp (silent)
 */
export function resetGlobalLogger(): void {
  globalLogger = new NoOpLogger();
}

/**
 * Enable console logging globally
 */
export function enableConsoleLogging(enableDebug = false): void {
  globalLogger = new ConsoleLogger('Hololand', enableDebug);
}

// ============================================================================
// Logger Factory
// ============================================================================

/**
 * Create a domain-specific logger
 *
 * @param domain - Domain name (e.g., "Network", "Social", "World")
 * @param options - Logger options
 * @returns Logger instance with domain prefix
 *
 * @example
 * ```ts
 * const logger = createLogger('Network');
 * logger.info('Connected to server'); // [Network:INFO] Connected to server
 *
 * const socialLogger = createLogger('Social', { enableDebug: true });
 * socialLogger.debug('User online'); // [Social:DEBUG] User online
 * ```
 */
export function createLogger(
  domain: string,
  options: Omit<LoggerOptions, 'prefix'> = {}
): HololandLogger {
  const { enableDebug = false, logger } = options;

  // If custom logger provided, wrap it with domain prefix
  if (logger) {
    return {
      debug: (msg, meta) => logger.debug(`[${domain}] ${msg}`, meta),
      info: (msg, meta) => logger.info(`[${domain}] ${msg}`, meta),
      warn: (msg, meta) => logger.warn(`[${domain}] ${msg}`, meta),
      error: (msg, meta) => logger.error(`[${domain}] ${msg}`, meta),
    };
  }

  // Create wrapper around global logger with domain prefix
  return {
    debug: (msg, meta) => {
      if (
        enableDebug ||
        (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
      ) {
        globalLogger.debug(`[${domain}] ${msg}`, meta);
      }
    },
    info: (msg, meta) => globalLogger.info(`[${domain}] ${msg}`, meta),
    warn: (msg, meta) => globalLogger.warn(`[${domain}] ${msg}`, meta),
    error: (msg, meta) => globalLogger.error(`[${domain}] ${msg}`, meta),
  };
}

// ============================================================================
// Pre-configured Domain Loggers
// ============================================================================

/**
 * Pre-configured loggers for each Hololand package.
 * These use the global logger internally.
 */
export const loggers = {
  core: createLogger('Core'),
  world: createLogger('World'),
  network: createLogger('Network'),
  social: createLogger('Social'),
  commerce: createLogger('Commerce'),
  renderer: createLogger('Renderer'),
  aiBridge: createLogger('AI-Bridge'),
  builder: createLogger('Builder'),
  auth: createLogger('Auth'),
  ui: createLogger('UI'),
  mcp: createLogger('MCP'),
};

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Default logger instance (uses global logger)
 */
export const logger: HololandLogger = {
  debug: (msg, meta) => globalLogger.debug(msg, meta),
  info: (msg, meta) => globalLogger.info(msg, meta),
  warn: (msg, meta) => globalLogger.warn(msg, meta),
  error: (msg, meta) => globalLogger.error(msg, meta),
};

// ============================================================================
// Legacy Compatibility
// ============================================================================

// These exports provide backward compatibility with existing package APIs

/** @deprecated Use setGlobalLogger instead */
export const setHoloScriptLogger = setGlobalLogger;

/** @deprecated Use setGlobalLogger instead */
export const setHololandNetworkLogger = setGlobalLogger;

/** @deprecated Use setGlobalLogger instead */
export const setHololandSocialLogger = setGlobalLogger;

/** @deprecated Use setGlobalLogger instead */
export const setHololandAILogger = setGlobalLogger;

/** @deprecated Use setGlobalLogger instead */
export const setHololandWorldLogger = setGlobalLogger;

/** @deprecated Use setGlobalLogger instead */
export const setHololandRendererLogger = setGlobalLogger;

/** @deprecated Use setGlobalLogger instead */
export const setHololandCommerceLogger = setGlobalLogger;

/** @deprecated Use setGlobalLogger instead */
export const setHololandBuilderLogger = setGlobalLogger;

/** @deprecated Use getGlobalLogger instead */
export const getLogger = getGlobalLogger;

/** @deprecated Use resetGlobalLogger instead */
export const resetLogger = resetGlobalLogger;

// Re-export types for convenience
export type { HololandLogger as HoloScriptLogger };
export type { HololandLogger as HololandNetworkLogger };
export type { HololandLogger as HololandSocialLogger };
export type { HololandLogger as HololandAILogger };
export type { HololandLogger as HololandWorldLogger };
export type { HololandLogger as HololandRendererLogger };
export type { HololandLogger as HololandCommerceLogger };
export type { HololandLogger as HololandBuilderLogger };

// Version
export const HOLOLAND_LOGGER_VERSION = '1.0.0-alpha.1';
