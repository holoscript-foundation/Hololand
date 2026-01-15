/**
 * @hololand/network Logger
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
  setHololandNetworkLogger,
  type HololandNetworkLogger,
} from '@hololand/logger';

import { loggers } from '@hololand/logger';
export const networkLogger = loggers.network;
