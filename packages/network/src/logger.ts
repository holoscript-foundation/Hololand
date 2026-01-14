/**
 * @hololand/network Logger
 *
 * Customizable logging for network debugging
 */

export interface HololandNetworkLogger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
}

const defaultLogger: HololandNetworkLogger = {
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Network:DEBUG] ${message}`, data ?? '');
    }
  },
  info: (message, data) => {
    console.info(`[Network:INFO] ${message}`, data ?? '');
  },
  warn: (message, data) => {
    console.warn(`[Network:WARN] ${message}`, data ?? '');
  },
  error: (message, data) => {
    console.error(`[Network:ERROR] ${message}`, data ?? '');
  },
};

let currentLogger: HololandNetworkLogger = defaultLogger;

export function setHololandNetworkLogger(logger: HololandNetworkLogger): void {
  currentLogger = logger;
}

export const logger: HololandNetworkLogger = {
  debug: (message, data) => currentLogger.debug(message, data),
  info: (message, data) => currentLogger.info(message, data),
  warn: (message, data) => currentLogger.warn(message, data),
  error: (message, data) => currentLogger.error(message, data),
};
