/**
 * @hololand/renderer Logger
 * Re-exports from @hololand/logger for backward compatibility.
 */

export {
  logger,
  loggers,
  createLogger,
  setGlobalLogger,
  getGlobalLogger,
  resetGlobalLogger,
  enableConsoleLogging,
  NoOpLogger,
  ConsoleLogger,
  type HololandLogger,
  type LoggerOptions,
  setHololandRendererLogger,
  type HololandRendererLogger,
} from '@hololand/logger';

import { loggers } from '@hololand/logger';
export const rendererLogger = loggers.renderer;
