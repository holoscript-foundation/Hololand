# @hololand/logger

Unified logging for Hololand packages.

## Features

- **Structured Logging**: JSON-formatted logs with metadata
- **Log Levels**: trace, debug, info, warn, error, fatal
- **Context Propagation**: Track requests across packages
- **Multiple Transports**: Console, file, remote
- **Performance**: Minimal overhead, lazy evaluation

## Installation

```bash
pnpm add @hololand/logger
```

## Usage

```typescript
import { Logger, createLogger } from '@hololand/logger';

// Create package-specific logger
const logger = createLogger('world');

// Basic logging
logger.info('World initialized', { name: 'my-world' });
logger.debug('Physics step', { deltaTime: 16.67 });
logger.warn('High object count', { count: 5000 });
logger.error('Failed to load asset', { path: '/models/tree.glb' });

// With context
const requestLogger = logger.child({ requestId: 'abc-123' });
requestLogger.info('Processing request');
```

## Configuration

```typescript
import { configureLogger } from '@hololand/logger';

configureLogger({
  level: 'debug',
  pretty: process.env.NODE_ENV === 'development',
  transports: [
    { type: 'console' },
    { type: 'file', path: './logs/hololand.log' },
  ],
});
```

## Log Levels

| Level | Usage |
|-------|-------|
| `trace` | Detailed debugging (disabled by default) |
| `debug` | Development debugging |
| `info` | Normal operations |
| `warn` | Potential issues |
| `error` | Errors that need attention |
| `fatal` | Critical failures |

## API Reference

### Logger

Main logger instance.

- `trace(msg, meta?)` - Trace level log
- `debug(msg, meta?)` - Debug level log
- `info(msg, meta?)` - Info level log
- `warn(msg, meta?)` - Warning level log
- `error(msg, meta?)` - Error level log
- `fatal(msg, meta?)` - Fatal level log
- `child(context)` - Create child logger with context

### createLogger(namespace)

Create a namespaced logger.

```typescript
const logger = createLogger('renderer');
// Logs will include { namespace: 'renderer' }
```

## License

MIT © Hololand Team
