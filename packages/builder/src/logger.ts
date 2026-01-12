export interface HololandBuilderLogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}
class NoOpLogger implements HololandBuilderLogger {
  info() {}
  warn() {}
  error() {}
}
let currentLogger: HololandBuilderLogger = new NoOpLogger();
export function setHololandBuilderLogger(logger: HololandBuilderLogger): void {
  currentLogger = logger;
}
export const logger = {
  info: (msg: string, meta?: Record<string, any>) => currentLogger.info(msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => currentLogger.warn(msg, meta),
  error: (msg: string, meta?: Record<string, any>) => currentLogger.error(msg, meta),
};
