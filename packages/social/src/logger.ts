export interface HololandSocialLogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug?(message: string, meta?: Record<string, any>): void;
}

class NoOpLogger implements HololandSocialLogger {
  info() {}
  warn() {}
  error() {}
  debug() {}
}

let currentLogger: HololandSocialLogger = new NoOpLogger();

export function setHololandSocialLogger(logger: HololandSocialLogger): void {
  currentLogger = logger;
}

export const logger = {
  info: (msg: string, meta?: Record<string, any>) => currentLogger.info(msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => currentLogger.warn(msg, meta),
  error: (msg: string, meta?: Record<string, any>) => currentLogger.error(msg, meta),
  debug: (msg: string, meta?: Record<string, any>) => currentLogger.debug?.(msg, meta),
};
