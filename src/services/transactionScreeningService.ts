import { 
  BitcoinTransaction,
  ScreeningResult,
  TransactionScreeningRequest,
  SanctionMatch,
  RiskLevel,
  ValidationError,
  ExternalApiError
} from '../types';
import { blockchainApiService } from './blockchainApiService';
import { addressScreeningService } from './addressScreeningService';
import { auditLogService } from './auditLogService';
import { isValidBitcoinTxHash } from '../utils/validation';
import { getCurrentTimestamp, calculateProcessingTime } from '../utils/fileUtils';
import logger from '../utils/logger';

export interface TransactionScreeningResult {
  txHash: string;
  direction: 'incoming' | 'outgoing' | 'both';
  inputAddresses: ScreeningResult[];
  outputAddresses: ScreeningResult[];
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  sanctionMatches: SanctionMatch[];
  timestamp: string;
  confidence: number;
  processingTimeMs: number;
  transaction?: BitcoinTransaction;
}

/**
 * Service for screening Bitcoin transactions
 */
export class TransactionScreeningService {

  /**
   * Screen a Bitcoin transaction by analyzing input and output addresses
   */
  async screenTransaction(
    txHash: string,
    direction: 'incoming' | 'outgoing' | 'both' = 'both',
    includeMetadata: boolean = false,
    correlationId?: string
  ): Promise<TransactionScreeningResult> {
    const startTime = Date.now();

    try {
      // Validate transaction hash
      if (!isValidBitcoinTxHash(txHash)) {
        throw new ValidationError(`Invalid Bitcoin transaction hash: ${txHash}`);
      }

      logger.info(`Starting transaction screening for ${txHash}`, {
        txHash,
        direction,
        includeMetadata,
        correlationId
      });

      // Get transaction details from blockchain
      const transaction = await blockchainApiService.getTransaction(txHash);
      
      // Extract addresses based on direction
      let inputAddresses: string[] = [];
      let outputAddresses: string[] = [];

      if (direction === 'incoming' || direction === 'both') {
        inputAddresses = this.extractInputAddresses(transaction);
      }

      if (direction === 'outgoing' || direction === 'both') {
        outputAddresses = this.extractOutputAddresses(transaction);
      }

      // Screen input addresses
      const inputScreeningResults: ScreeningResult[] = [];
      if (inputAddresses.length > 0) {
        for (const address of inputAddresses) {
          try {
            const result = await addressScreeningService.screenAddress(
              address,
              false, // Don't include transaction analysis for each address to avoid recursion
              3, // Limited hops for transaction screening
              correlationId
            );
            inputScreeningResults.push(result);
          } catch (error) {
            logger.warn(`Failed to screen input address ${address}:`, error, { correlationId });
          }
        }
      }

      // Screen output addresses
      const outputScreeningResults: ScreeningResult[] = [];
      if (outputAddresses.length > 0) {
        for (const address of outputAddresses) {
          try {
            const result = await addressScreeningService.screenAddress(
              address,
              false, // Don't include transaction analysis for each address to avoid recursion
              3, // Limited hops for transaction screening
              correlationId
            );
            outputScreeningResults.push(result);
          } catch (error) {
            logger.warn(`Failed to screen output address ${address}:`, error, { correlationId });
          }
        }
      }

      // Calculate overall risk assessment
      const riskAssessment = this.calculateOverallRisk(inputScreeningResults, outputScreeningResults);
      
      // Collect all sanction matches
      const allSanctionMatches = [
        ...inputScreeningResults.flatMap(result => result.sanctionMatches),
        ...outputScreeningResults.flatMap(result => result.sanctionMatches)
      ];

      // Calculate confidence score
      const confidence = this.calculateTransactionConfidence(
        inputScreeningResults,
        outputScreeningResults,
        transaction
      );

      const processingTime = calculateProcessingTime(startTime);

      const result: TransactionScreeningResult = {
        txHash,
        direction,
        inputAddresses: inputScreeningResults,
        outputAddresses: outputScreeningResults,
        overallRiskScore: riskAssessment.score,
        overallRiskLevel: riskAssessment.level,
        sanctionMatches: allSanctionMatches,
        timestamp: getCurrentTimestamp(),
        confidence,
        processingTimeMs: processingTime
      };

      // Include transaction metadata if requested
      if (includeMetadata) {
        result.transaction = transaction;
      }

      // Log the screening action
      await auditLogService.logScreeningAction(
        'TRANSACTION_SCREENING',
        `tx:${txHash}`,
        {
          overallRiskScore: riskAssessment.score,
          overallRiskLevel: riskAssessment.level,
          sanctionMatchCount: allSanctionMatches.length,
          inputAddressCount: inputAddresses.length,
          outputAddressCount: outputAddresses.length
        },
        processingTime,
        correlationId,
        txHash,
        true
      );

      logger.info(`Transaction screening completed for ${txHash}`, {
        txHash,
        overallRiskScore: riskAssessment.score,
        overallRiskLevel: riskAssessment.level,
        sanctionMatches: allSanctionMatches.length,
        processingTime,
        correlationId
      });

      return result;

    } catch (error) {
      const processingTime = calculateProcessingTime(startTime);
      
      // Log the error
      await auditLogService.logScreeningAction(
        'TRANSACTION_SCREENING',
        `tx:${txHash}`,
        { error: (error as Error).message },
        processingTime,
        correlationId,
        txHash,
        false,
        (error as Error).message
      );

      logger.error(`Transaction screening failed for ${txHash}:`, error, { correlationId });
      throw error;
    }
  }

  /**
   * Extract input addresses from transaction
   */
  private extractInputAddresses(transaction: BitcoinTransaction): string[] {
    const addresses = new Set<string>();
    
    transaction.inputs.forEach(input => {
      input.addresses.forEach(addr => {
        if (addr && addr.length > 0) {
          addresses.add(addr);
        }
      });
    });
    
    return Array.from(addresses);
  }

  /**
   * Extract output addresses from transaction
   */
  private extractOutputAddresses(transaction: BitcoinTransaction): string[] {
    const addresses = new Set<string>();
    
    transaction.outputs.forEach(output => {
      output.addresses.forEach(addr => {
        if (addr && addr.length > 0) {
          addresses.add(addr);
        }
      });
    });
    
    return Array.from(addresses);
  }

  /**
   * Calculate overall risk score and level from input and output screening results
   */
  private calculateOverallRisk(
    inputResults: ScreeningResult[],
    outputResults: ScreeningResult[]
  ): { score: number; level: RiskLevel } {
    const allResults = [...inputResults, ...outputResults];
    
    if (allResults.length === 0) {
      return { score: 0, level: 'LOW' };
    }

    // Calculate weighted average risk score
    let totalWeightedScore = 0;
    let totalWeight = 0;

    allResults.forEach(result => {
      // Weight by the number of sanction matches and confidence
      const weight = Math.max(1, result.sanctionMatches.length) * (result.confidence / 100);
      totalWeightedScore += result.riskScore * weight;
      totalWeight += weight;
    });

    const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // Apply penalty for high-risk addresses
    const highRiskCount = allResults.filter(result => 
      result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL'
    ).length;
    
    const highRiskPenalty = Math.min(25, highRiskCount * 10);
    
    const finalScore = Math.min(100, Math.round(averageScore + highRiskPenalty));
    
    // Determine risk level
    let level: RiskLevel = 'LOW';
    if (finalScore >= 76) level = 'CRITICAL';
    else if (finalScore >= 51) level = 'HIGH';
    else if (finalScore >= 26) level = 'MEDIUM';

    return { score: finalScore, level };
  }

  /**
   * Calculate confidence score for transaction screening
   */
  private calculateTransactionConfidence(
    inputResults: ScreeningResult[],
    outputResults: ScreeningResult[],
    transaction: BitcoinTransaction
  ): number {
    const allResults = [...inputResults, ...outputResults];
    
    if (allResults.length === 0) {
      return 30; // Low confidence with no address screening
    }

    // Base confidence from successful address screening
    let confidence = 60;

    // Add confidence based on screening completeness
    const totalAddresses = this.extractInputAddresses(transaction).length + 
                          this.extractOutputAddresses(transaction).length;
    const screenedAddresses = allResults.length;
    
    const completenessRatio = totalAddresses > 0 ? screenedAddresses / totalAddresses : 1;
    confidence += completenessRatio * 20;

    // Add confidence based on individual result confidence
    if (allResults.length > 0) {
      const averageConfidence = allResults.reduce((sum, result) => sum + result.confidence, 0) / allResults.length;
      confidence += (averageConfidence / 100) * 20;
    }

    return Math.min(100, Math.round(confidence));
  }

  /**
   * Screen multiple transactions in batch
   */
  async screenTransactionsBatch(
    txHashes: string[],
    direction: 'incoming' | 'outgoing' | 'both' = 'both',
    correlationId?: string
  ): Promise<TransactionScreeningResult[]> {
    logger.info(`Starting batch transaction screening for ${txHashes.length} transactions`, {
      count: txHashes.length,
      direction,
      correlationId
    });

    const results: TransactionScreeningResult[] = [];
    
    // Process transactions sequentially to respect rate limits
    for (const txHash of txHashes) {
      try {
        const result = await this.screenTransaction(txHash, direction, false, correlationId);
        results.push(result);
      } catch (error) {
        logger.warn(`Failed to screen transaction ${txHash} in batch:`, error, { correlationId });
        // Continue with other transactions
      }
    }

    logger.info(`Batch transaction screening completed`, {
      requested: txHashes.length,
      completed: results.length,
      correlationId
    });

    return results;
  }
}

// Export singleton instance
export const transactionScreeningService = new TransactionScreeningService();
