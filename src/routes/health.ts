import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types';
import logger from '../utils/logger';
import { existsSync } from 'fs';
import config from '../config';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Get service health status
 *     description: |
 *       Returns the current health status of the Bitcoin Sanction Detection Service.
 *       Includes system information, uptime, and service availability.
 *     parameters:
 *       - $ref: '#/components/parameters/CorrelationId'
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       enum: [true]
 *                     data:
 *                       $ref: '#/components/schemas/HealthStatus'
 *             examples:
 *               healthy_service:
 *                 summary: Healthy service response
 *                 value:
 *                   success: true
 *                   data:
 *                     status: "healthy"
 *                     timestamp: "2025-06-30T19:12:07.852Z"
 *                     uptime: 17.797
 *                     version: "1.0.0"
 *                     environment: "development"
 *                     services:
 *                       dataDirectories:
 *                         sanctionsDir: true
 *                         riskAssessmentsDir: true
 *                         auditLogsDir: true
 *                         configDir: true
 *                   timestamp: "2025-06-30T19:12:07.852Z"
 *                   correlationId: "c17cea5c-2517-43ba-9cb7-2d0f6f2a78f9"
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/InternalServerError'
 */

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        dataDirectories: {
          sanctionsDir: existsSync(config.sanctionsDir),
          riskAssessmentsDir: existsSync(config.riskAssessmentsDir),
          auditLogsDir: existsSync(config.auditLogsDir),
          configDir: existsSync(config.configDir)
        }
      }
    };

    const response: ApiResponse<typeof healthData> = {
      success: true,
      data: healthData,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.json(response);
  } catch (error) {
    logger.error('Health check failed:', { error, correlationId: req.correlationId });
    
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed'
      },
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.status(503).json(response);
  }
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Check service readiness
 *     description: |
 *       Checks if the service is ready to handle requests.
 *       Verifies that all required directories and dependencies are available.
 *     parameters:
 *       - $ref: '#/components/parameters/CorrelationId'
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       enum: [true]
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [ready]
 *             examples:
 *               service_ready:
 *                 summary: Service ready response
 *                 value:
 *                   success: true
 *                   data:
 *                     status: "ready"
 *                   timestamp: "2025-06-30T19:12:07.852Z"
 *                   correlationId: "c17cea5c-2517-43ba-9cb7-2d0f6f2a78f9"
 *       503:
 *         description: Service is not ready
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       enum: [false]
 *                     error:
 *                       type: object
 *                       properties:
 *                         code:
 *                           enum: [NOT_READY]
 *                         message:
 *                           type: string
 *                         details:
 *                           type: object
 *                           properties:
 *                             missingDirectories:
 *                               type: array
 *                               items:
 *                                 type: string
 */
// Readiness check endpoint
router.get('/ready', (req: Request, res: Response) => {
  try {
    // Check if all required directories exist
    const requiredDirs = [
      config.sanctionsDir,
      config.riskAssessmentsDir,
      config.auditLogsDir,
      config.configDir
    ];

    const missingDirs = requiredDirs.filter(dir => !existsSync(dir));

    if (missingDirs.length > 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_READY',
          message: 'Service not ready',
          details: { missingDirectories: missingDirs }
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      };

      return res.status(503).json(response);
    }

    const response: ApiResponse<{ status: string }> = {
      success: true,
      data: { status: 'ready' },
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.json(response);
  } catch (error) {
    logger.error('Readiness check failed:', { error, correlationId: req.correlationId });
    
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'READINESS_CHECK_FAILED',
        message: 'Readiness check failed'
      },
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.status(503).json(response);
  }
});

export default router;
