import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import config from './config';
import logger from './utils/logger';
import { ensureDirectoryExists } from './utils/fileUtils';
import { ApiResponse, SanctionDetectorError } from './types';
import { setupSwagger } from './docs/swagger';

// Import route handlers
import screeningRoutes from './routes/screening';
import riskRoutes from './routes/risk';
import healthRoutes from './routes/health';

class SanctionDetectorApp {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.initializeDirectories();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      // Ensure all required directories exist
      await ensureDirectoryExists(config.dataDir);
      await ensureDirectoryExists(config.sanctionsDir);
      await ensureDirectoryExists(config.riskAssessmentsDir);
      await ensureDirectoryExists(config.auditLogsDir);
      await ensureDirectoryExists(config.configDir);
      
      logger.info('All required directories initialized');
    } catch (error) {
      logger.error('Failed to initialize directories:', error);
      throw error;
    }
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request correlation ID
    this.app.use((req, res, next) => {
      req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
      res.setHeader('x-correlation-id', req.correlationId);
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path}`, {
          correlationId: req.correlationId,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      });
      
      next();
    });
  }

  private initializeRoutes(): void {
    // Setup Swagger documentation
    setupSwagger(this.app);
    
    // API routes
    this.app.use('/api/screening', screeningRoutes);
    this.app.use('/api/risk', riskRoutes);
    this.app.use('/api/health', healthRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      const response: ApiResponse<any> = {
        success: true,
        data: {
          service: 'Bitcoin Sanction Detection Service',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          status: 'running'
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      };
      res.json(response);
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.originalUrl} not found`
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      };
      res.status(404).json(response);
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const correlationId = req.correlationId || uuidv4();
      
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        correlationId,
        path: req.path,
        method: req.method
      });

      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let errorMessage = 'An unexpected error occurred';
      let errorDetails: Record<string, unknown> | undefined;

      if (error instanceof SanctionDetectorError) {
        statusCode = error.statusCode;
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
      }

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          ...(errorDetails && { details: errorDetails })
        },
        timestamp: new Date().toISOString(),
        correlationId
      };

      res.status(statusCode).json(response);
    });
  }

  public async start(): Promise<void> {
    try {
      await this.initializeDirectories();
      
      this.app.listen(config.port, () => {
        logger.info(`Bitcoin Sanction Detection Service started`, {
          port: config.port,
          environment: process.env.NODE_ENV || 'development',
          logLevel: config.logLevel
        });
      });
    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

// Create and start the application
const app = new SanctionDetectorApp();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  app.start();
}

export default app;
