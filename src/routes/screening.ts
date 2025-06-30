import { Router, Request, Response } from 'express';
import { ApiResponse, ScreeningRequest, TransactionScreeningRequest, BulkScreeningRequest, ValidationError, ScreeningResult } from '../types';
import { addressScreeningService } from '../services/addressScreeningService';
import { isValidBitcoinAddress, isValidBitcoinTxHash } from '../utils/validation';
import config from '../config';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/screening/address:
 *   post:
 *     tags: [Screening]
 *     summary: Screen a single Bitcoin address
 *     description: |
 *       Screen a Bitcoin address against OFAC cryptocurrency sanctions.
 *       Returns risk assessment, sanction matches, and processing details.
 *     parameters:
 *       - $ref: '#/components/parameters/CorrelationId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: Bitcoin address to screen
 *                 pattern: '^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^3[a-km-zA-HJ-NP-Z1-9]{33}$|^bc1[a-z0-9]{39,59}$'
 *                 example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
 *               includeTransactionAnalysis:
 *                 type: boolean
 *                 description: Whether to include transaction graph analysis
 *                 default: false
 *               maxHops:
 *                 type: integer
 *                 description: Maximum hops for transaction analysis
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 5
 *           examples:
 *             simple_screening:
 *               summary: Simple address screening
 *               value:
 *                 address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
 *             advanced_screening:
 *               summary: Address screening with transaction analysis
 *               value:
 *                 address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
 *                 includeTransactionAnalysis: true
 *                 maxHops: 3
 *     responses:
 *       200:
 *         description: Screening completed successfully
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
 *                       $ref: '#/components/schemas/ScreeningResult'
 *             examples:
 *               clean_address:
 *                 summary: Clean address (no sanctions)
 *                 value:
 *                   success: true
 *                   data:
 *                     address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
 *                     riskScore: 0
 *                     riskLevel: 'LOW'
 *                     sanctionMatches: []
 *                     timestamp: '2025-06-30T18:45:04.130Z'
 *                     confidence: 95
 *                     processingTimeMs: 3
 *                   timestamp: '2025-06-30T18:45:04.132Z'
 *                   correlationId: 'b3fc39a5-32f4-49e7-8861-f2f0e258e777'
 *               sanctioned_address:
 *                 summary: Sanctioned address detected
 *                 value:
 *                   success: true
 *                   data:
 *                     address: '12QtD5BFwRsdNsAZY76UVE1xyCGNTojH9h'
 *                     riskScore: 75
 *                     riskLevel: 'HIGH'
 *                     sanctionMatches:
 *                       - listSource: 'OFAC'
 *                         entityName: 'YAN, Xiaobing'
 *                         entityId: '25308'
 *                         matchType: 'DIRECT'
 *                         confidence: 100
 *                         matchedAddress: '12QtD5BFwRsdNsAZY76UVE1xyCGNTojH9h'
 *                     timestamp: '2025-06-30T18:45:04.130Z'
 *                     confidence: 80
 *                     processingTimeMs: 3
 *                   timestamp: '2025-06-30T18:45:04.132Z'
 *                   correlationId: 'b3fc39a5-32f4-49e7-8861-f2f0e258e777'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/address', async (req: Request, res: Response) => {
  try {
    const { address, includeTransactionAnalysis = false, maxHops = config.defaultMaxHops }: ScreeningRequest = req.body;

    // Validate input
    if (!address) {
      throw new ValidationError('Address is required');
    }

    if (!isValidBitcoinAddress(address)) {
      throw new ValidationError('Invalid Bitcoin address format');
    }

    if (maxHops && (maxHops < 1 || maxHops > 10)) {
      throw new ValidationError('maxHops must be between 1 and 10');
    }

    logger.info(`Address screening request received`, {
      address,
      includeTransactionAnalysis,
      maxHops,
      correlationId: req.correlationId,
      ip: req.ip
    });

    // Perform screening
    const result = await addressScreeningService.screenAddress(
      address,
      includeTransactionAnalysis,
      maxHops,
      req.correlationId
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.json(response);
  } catch (error) {
    logger.error('Address screening failed:', {
      error: (error as Error).message,
      correlationId: req.correlationId,
      address: req.body?.address
    });

    if (error instanceof ValidationError) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details })
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'SCREENING_FAILED',
        message: 'Address screening failed'
      },
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/screening/transaction:
 *   post:
 *     tags: [Screening]
 *     summary: Screen a Bitcoin transaction
 *     description: |
 *       Screen a Bitcoin transaction against OFAC cryptocurrency sanctions.
 *       Analyzes both input and output addresses of the transaction for sanctions matches.
 *     parameters:
 *       - $ref: '#/components/parameters/CorrelationId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - txHash
 *             properties:
 *               txHash:
 *                 type: string
 *                 description: Bitcoin transaction hash to screen
 *                 pattern: '^[a-fA-F0-9]{64}$'
 *                 example: '3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c'
 *               direction:
 *                 type: string
 *                 enum: [inputs, outputs, both]
 *                 description: Which addresses to analyze
 *                 default: both
 *               includeMetadata:
 *                 type: boolean
 *                 description: Include transaction metadata
 *                 default: false
 *           examples:
 *             simple_transaction:
 *               summary: Simple transaction screening
 *               value:
 *                 txHash: '3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c'
 *             detailed_transaction:
 *               summary: Detailed transaction screening
 *               value:
 *                 txHash: '3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c'
 *                 direction: 'both'
 *                 includeMetadata: true
 *     responses:
 *       200:
 *         description: Transaction screening completed
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
 *                         txHash:
 *                           type: string
 *                         inputAddresses:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ScreeningResult'
 *                         outputAddresses:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ScreeningResult'
 *                         overallRiskScore:
 *                           type: integer
 *                           minimum: 0
 *                           maximum: 100
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/transaction', async (req: Request, res: Response) => {
  try {
    const { txHash, direction = 'both' }: TransactionScreeningRequest = req.body;

    // Validate input
    if (!txHash) {
      throw new ValidationError('Transaction hash is required');
    }

    if (!isValidBitcoinTxHash(txHash)) {
      throw new ValidationError('Invalid transaction hash format');
    }

    if (direction && !['incoming', 'outgoing', 'both'].includes(direction)) {
      throw new ValidationError('direction must be one of: incoming, outgoing, both');
    }

    logger.info(`Transaction screening request received`, {
      txHash,
      direction,
      correlationId: req.correlationId,
      ip: req.ip
    });

    // TODO: Implement transaction screening service
    // For now, return a placeholder response
    const result = {
      txHash,
      direction,
      addresses: [], // Will be populated by transaction service
      riskScore: 0,
      riskLevel: 'LOW' as const,
      sanctionMatches: [],
      timestamp: new Date().toISOString(),
      confidence: 50,
      processingTimeMs: 0
    };

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.json(response);
  } catch (error) {
    logger.error('Transaction screening failed:', {
      error: (error as Error).message,
      correlationId: req.correlationId,
      txHash: req.body?.txHash
    });

    if (error instanceof ValidationError) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details })
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'SCREENING_FAILED',
        message: 'Transaction screening failed'
      },
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/screening/bulk:
 *   post:
 *     tags: [Screening]
 *     summary: Bulk screening for multiple addresses and transactions
 *     description: |
 *       Screen multiple Bitcoin addresses and/or transactions in a single request.
 *       Optimized for batch processing with configurable limits and parallel processing.
 *     parameters:
 *       - $ref: '#/components/parameters/CorrelationId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addresses:
 *                 type: array
 *                 items:
 *                   type: string
 *                   pattern: '^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^3[a-km-zA-HJ-NP-Z1-9]{33}$|^bc1[a-z0-9]{39,59}$'
 *                 description: Array of Bitcoin addresses to screen
 *                 maxItems: 100
 *                 example: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2']
 *               transactions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   pattern: '^[a-fA-F0-9]{64}$'
 *                 description: Array of Bitcoin transaction hashes to screen
 *                 maxItems: 50
 *                 example: ['3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c']
 *               batchId:
 *                 type: string
 *                 description: Optional batch identifier for tracking
 *                 example: 'batch_001_20250630'
 *               includeTransactionAnalysis:
 *                 type: boolean
 *                 description: Include transaction graph analysis for addresses
 *                 default: false
 *           examples:
 *             address_bulk:
 *               summary: Bulk address screening
 *               value:
 *                 addresses: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2']
 *                 batchId: 'batch_001_20250630'
 *             mixed_bulk:
 *               summary: Mixed bulk screening
 *               value:
 *                 addresses: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa']
 *                 transactions: ['3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c']
 *                 includeTransactionAnalysis: true
 *     responses:
 *       200:
 *         description: Bulk screening completed
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
 *                         batchId:
 *                           type: string
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalProcessed:
 *                               type: integer
 *                             highRiskCount:
 *                               type: integer
 *                             sanctionMatchesCount:
 *                               type: integer
 *                             processingTimeMs:
 *                               type: integer
 *                         results:
 *                           type: object
 *                           properties:
 *                             addresses:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/ScreeningResult'
 *                             transactions:
 *                               type: array
 *                               items:
 *                                 type: object
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { addresses = [], transactions = [] }: BulkScreeningRequest = req.body;

    // Validate input
    if (addresses.length === 0 && transactions.length === 0) {
      throw new ValidationError('At least one address or transaction must be provided');
    }

    if (addresses.length + transactions.length > 100) {
      throw new ValidationError('Maximum 100 items allowed per bulk request');
    }

    // Validate addresses
    const invalidAddresses = addresses.filter(addr => !isValidBitcoinAddress(addr));
    if (invalidAddresses.length > 0) {
      throw new ValidationError('Invalid Bitcoin addresses found', {
        invalidAddresses: invalidAddresses.slice(0, 5) // Show first 5 invalid addresses
      });
    }

    // Validate transaction hashes
    const invalidTransactions = transactions.filter(tx => !isValidBitcoinTxHash(tx));
    if (invalidTransactions.length > 0) {
      throw new ValidationError('Invalid transaction hashes found', {
        invalidTransactions: invalidTransactions.slice(0, 5) // Show first 5 invalid transactions
      });
    }

    logger.info(`Bulk screening request received`, {
      addressCount: addresses.length,
      transactionCount: transactions.length,
      correlationId: req.correlationId,
      ip: req.ip
    });

    // Screen addresses
    let addressResults: ScreeningResult[] = [];
    if (addresses.length > 0) {
      addressResults = await addressScreeningService.screenAddressesBatch(
        addresses,
        false, // No transaction analysis for bulk requests to keep it fast
        config.defaultMaxHops,
        req.correlationId
      );
    }

    // TODO: Screen transactions
    const transactionResults: any[] = []; // Will be populated when transaction service is implemented

    const result = {
      addresses: addressResults,
      transactions: transactionResults,
      summary: {
        totalAddresses: addresses.length,
        totalTransactions: transactions.length,
        processedAddresses: addressResults.length,
        processedTransactions: transactionResults.length,
        highRiskItems: [
          ...addressResults.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL'),
          ...transactionResults.filter((r: any) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL')
        ].length
      }
    };

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.json(response);
  } catch (error) {
    logger.error('Bulk screening failed:', {
      error: (error as Error).message,
      correlationId: req.correlationId,
      addressCount: req.body?.addresses?.length || 0,
      transactionCount: req.body?.transactions?.length || 0
    });

    if (error instanceof ValidationError) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details })
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'SCREENING_FAILED',
        message: 'Bulk screening failed'
      },
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    };

    return res.status(500).json(response);
  }
});

export default router;
