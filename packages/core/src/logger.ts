/**
 * @hololand/core Logger
 * Re-exports from @hololand/logger for backward compatibility.
 */

export {
  logger,
  loggers,
  createLogger,
  setGlobalLogger,
  getGlobalLogger,
  resetGlobalLogger,
  resetGlobalLogger as resetLogger,
  enableConsoleLogging,
  NoOpLogger,
  ConsoleLogger,
  type HololandLogger,
  type LoggerOptions,
  setHoloScriptLogger,
  getLogger,
  type HoloScriptLogger,
} from '@hololand/logger';

import { loggers } from '@hololand/logger';
export const coreLogger = loggers.core;
