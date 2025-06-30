import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application, Request, Response } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bitcoin Sanction Detection API',
      version: '1.0.0',
      description: `
        A comprehensive API for screening Bitcoin addresses against OFAC cryptocurrency sanctions.
        
        This service provides real-time screening of Bitcoin addresses against the official OFAC 
        Specially Designated Nationals (SDN) list, enabling compliance with U.S. sanctions regulations.
        
        ## Features
        - Real-time Bitcoin address screening
        - OFAC SDN list integration with cryptocurrency addresses
        - Risk scoring and assessment
        - Audit logging for compliance
        - Batch processing capabilities
        
        ## Data Sources
        - OFAC SDN List (cryptocurrency addresses extracted)
        - Coverage: 341 crypto addresses across 9 cryptocurrencies
        - Last Updated: 2025-06-30
      `,
      contact: {
        name: 'ENITS IT Security Lab',
        email: 'security@enits.fr',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.sanction-detector.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful',
            },
            data: {
              type: 'object',
              description: 'Response data (present when success is true)',
            },
            error: {
              $ref: '#/components/schemas/ApiError',
              description: 'Error information (present when success is false)',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO timestamp of the response',
            },
            correlationId: {
              type: 'string',
              description: 'Unique identifier for request tracing',
            },
          },
          required: ['success', 'timestamp', 'correlationId'],
        },
        ApiError: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              enum: ['VALIDATION_ERROR', 'NOT_FOUND', 'INTERNAL_SERVER_ERROR'],
              description: 'Error code',
            },
            message: {
              type: 'string',
              description: 'Human-readable error message',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
          required: ['code', 'message'],
        },
        ScreeningResult: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The Bitcoin address that was screened',
              example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            },
            riskScore: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Risk score from 0 (clean) to 100 (highest risk)',
            },
            riskLevel: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'Risk level assessment',
            },
            sanctionMatches: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/SanctionMatch',
              },
              description: 'List of sanction matches found',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when screening was performed',
            },
            confidence: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Confidence level of the assessment',
            },
            processingTimeMs: {
              type: 'integer',
              description: 'Processing time in milliseconds',
            },
          },
          required: ['address', 'riskScore', 'riskLevel', 'sanctionMatches', 'timestamp', 'confidence', 'processingTimeMs'],
        },
        SanctionMatch: {
          type: 'object',
          properties: {
            listSource: {
              type: 'string',
              enum: ['OFAC'],
              description: 'Source of the sanctions list',
            },
            entityName: {
              type: 'string',
              description: 'Name of the sanctioned entity',
              example: 'YAN, Xiaobing',
            },
            entityId: {
              type: 'string',
              description: 'Unique identifier of the sanctioned entity',
              example: '25308',
            },
            matchType: {
              type: 'string',
              enum: ['DIRECT', 'INDIRECT', 'CLUSTER'],
              description: 'Type of match found',
            },
            confidence: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Confidence level of the match',
            },
            matchedAddress: {
              type: 'string',
              description: 'The specific address that matched',
            },
          },
          required: ['listSource', 'entityName', 'entityId', 'matchType', 'confidence'],
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              description: 'Overall service health status',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp',
            },
            uptime: {
              type: 'number',
              description: 'Service uptime in seconds',
            },
            version: {
              type: 'string',
              description: 'Service version',
              example: '1.0.0',
            },
            environment: {
              type: 'string',
              description: 'Deployment environment',
              example: 'development',
            },
            services: {
              type: 'object',
              properties: {
                dataDirectories: {
                  type: 'object',
                  description: 'Status of required data directories',
                },
              },
            },
          },
          required: ['status', 'timestamp', 'uptime', 'version', 'environment'],
        },
      },
      parameters: {
        CorrelationId: {
          name: 'x-correlation-id',
          in: 'header',
          description: 'Optional correlation ID for request tracing',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      },
      responses: {
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    properties: {
                      success: { enum: [false] },
                      error: {
                        properties: {
                          code: { enum: ['VALIDATION_ERROR'] },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    properties: {
                      success: { enum: [false] },
                      error: {
                        properties: {
                          code: { enum: ['NOT_FOUND'] },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    properties: {
                      success: { enum: [false] },
                      error: {
                        properties: {
                          code: { enum: ['INTERNAL_SERVER_ERROR'] },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Screening',
        description: 'Bitcoin address screening endpoints',
      },
      {
        name: 'Health',
        description: 'Service health and monitoring endpoints',
      },
      {
        name: 'Risk',
        description: 'Risk assessment and management endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API files
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Bitcoin Sanction Detection API',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  }));

  // Serve raw OpenAPI JSON
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;
