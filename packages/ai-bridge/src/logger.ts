/**
 * @hololand/ai-bridge Logger
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
  setHololandAILogger,
  type HololandAILogger,
} from '@hololand/logger';

import { loggers } from '@hololand/logger';
export const aiBridgeLogger = loggers.aiBridge;
