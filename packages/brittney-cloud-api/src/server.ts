/**
 * Brittney Cloud API - Main Server
 *
 * Production-ready Express server with:
 * - API key authentication
 * - Rate limiting (token bucket algorithm)
 * - Request routing to Ollama pods
 * - Usage logging to Redis streams
 * - WebSocket support for streaming
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import pino from 'pino';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';

// Import services
import { RedisService } from './services/redis';
import { DatabaseService } from './services/database';
import { UsageTracker } from './services/usage-tracker';
import { BillingService } from './services/billing';

// Import middleware
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';

// Import routes
import { inferenceRouter } from './routes/inference';
import { usageRouter } from './routes/usage';
import { accountRouter } from './routes/account';
import { healthRouter } from './routes/health';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Server configuration
const PORT = parseInt(process.env.PORT || '8080', 10);
const API_VERSION = process.env.API_VERSION || 'v1';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Main application class
 */
class BrittneyCloudAPI {
  private app: Express;
  private httpServer: ReturnType<typeof createServer>;
  private wss?: WebSocketServer;

  // Services
  private redis!: RedisService;
  private database!: DatabaseService;
  private usageTracker!: UsageTracker;
  private billingService!: BillingService;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    logger.info('Initializing services...');

    // Initialize Redis
    this.redis = new RedisService({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'brittney:',
    });
    await this.redis.connect();

    // Initialize Database
    this.database = new DatabaseService({
      connectionString: process.env.DATABASE_URL || '',
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    });
    await this.database.connect();

    // Initialize Usage Tracker
    this.usageTracker = new UsageTracker(this.redis, this.database);
    await this.usageTracker.start();

    // Initialize Billing Service
    this.billingService = new BillingService(
      this.database,
      process.env.STRIPE_SECRET_KEY || ''
    );

    logger.info('All services initialized successfully');
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet());

    // CORS
    const corsOrigins = (process.env.CORS_ORIGINS || '').split(',');
    this.app.use(cors({
      origin: corsOrigins,
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use(pinoHttp({ logger }));

    // Inject services into request context
    this.app.use((req: any, res, next) => {
      req.services = {
        redis: this.redis,
        database: this.database,
        usageTracker: this.usageTracker,
        billingService: this.billingService,
      };
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const apiPrefix = `/api/${API_VERSION}`;

    // Health check (no auth required)
    this.app.use(`${apiPrefix}/health`, healthRouter);

    // Protected routes (require API key + rate limiting)
    this.app.use(
      `${apiPrefix}/inference`,
      authMiddleware,
      rateLimitMiddleware,
      inferenceRouter
    );

    this.app.use(
      `${apiPrefix}/usage`,
      authMiddleware,
      usageRouter
    );

    this.app.use(
      `${apiPrefix}/account`,
      authMiddleware,
      accountRouter
    );

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
      });
    });

    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Setup WebSocket server for streaming
   */
  private setupWebSocket(): void {
    if (process.env.ENABLE_WEBSOCKET !== 'true') {
      logger.info('WebSocket support disabled');
      return;
    }

    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: `/api/${API_VERSION}/ws`,
    });

    this.wss.on('connection', (ws, req) => {
      logger.info({ url: req.url }, 'WebSocket connection established');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          // Handle WebSocket inference requests
          // TODO: Implement WebSocket inference handler
          ws.send(JSON.stringify({
            status: 'received',
            message: 'WebSocket inference coming soon'
          }));
        } catch (error) {
          logger.error({ error }, 'WebSocket message error');
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Initialize services first
      await this.initializeServices();

      // Setup Express
      this.setupMiddleware();
      this.setupRoutes();
      this.setupWebSocket();

      // Start HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.listen(PORT, () => {
          logger.info({
            port: PORT,
            env: NODE_ENV,
            apiVersion: API_VERSION,
          }, 'Brittney Cloud API started successfully');
          resolve();
        });
      });
    } catch (error) {
      logger.error({ error }, 'Failed to start server');
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async stop(): Promise<void> {
    logger.info('Shutting down gracefully...');

    // Stop accepting new connections
    this.httpServer.close();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Stop services
    await this.usageTracker.stop();
    await this.database.disconnect();
    await this.redis.disconnect();

    logger.info('Shutdown complete');
  }
}

// Create and start server
const server = new BrittneyCloudAPI();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await server.stop();
  process.exit(0);
});

// Start server
server.start().catch((error) => {
  logger.error({ error }, 'Fatal error during startup');
  process.exit(1);
});

export { BrittneyCloudAPI };
