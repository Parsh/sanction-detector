import { SanctionMatch, SanctionEntity, MatchType, RiskLevel, ScreeningResult, TransactionPathAnalysis } from '../types';
import { sanctionsDataService } from './sanctionsDataService';
import { transactionPathAnalysisService } from './transactionPathAnalysisService';
// import { riskAssessmentService } from './riskAssessmentService'; // TODO: Create this service
import { auditLogService } from './auditLogService';
import { isValidBitcoinAddress } from '../utils/validation';
import { getCurrentTimestamp, calculateProcessingTime } from '../utils/fileUtils';
import logger from '../utils/logger';

/**
 * Service for screening Bitcoin addresses against sanctions lists
 */
export class AddressScreeningService {
  
  /**
   * Screen a single Bitcoin address against all sanctions lists
   */
  public async screenAddress(
    address: string,
    includeTransactionAnalysis: boolean = false,
    maxHops: number = 5,
    correlationId?: string
  ): Promise<ScreeningResult> {
    const startTime = Date.now();
    
    try {
      // Validate Bitcoin address
      if (!isValidBitcoinAddress(address)) {
        throw new Error(`Invalid Bitcoin address: ${address}`);
      }

      logger.info(`Starting address screening for ${address}`, {
        address,
        includeTransactionAnalysis,
        maxHops,
        correlationId
      });

      // Find direct sanction matches
      const sanctionMatches = await this.findDirectSanctionMatches(address);
      
      // Calculate base risk score from direct matches
      let riskScore = this.calculateDirectMatchRiskScore(sanctionMatches);
      
      // Perform transaction path analysis if requested
      let transactionAnalysis: TransactionPathAnalysis | undefined;
      if (includeTransactionAnalysis) {
        try {
          transactionAnalysis = await transactionPathAnalysisService.analyzeTransactionPath(
            address, 
            maxHops, 
            correlationId
          );
          // Add indirect risk from transaction analysis (weighted at 60% of direct matches)
          const indirectRiskScore = (transactionAnalysis.riskPropagation * 0.6);
          riskScore += indirectRiskScore;
          
          logger.debug(`Transaction analysis completed for ${address}`, {
            totalNodesAnalyzed: transactionAnalysis.totalNodesAnalyzed,
            sanctionedNodesFound: transactionAnalysis.sanctionedNodesFound,
            riskPropagation: transactionAnalysis.riskPropagation,
            indirectRiskScore,
            correlationId
          });
        } catch (error) {
          logger.warn(`Transaction analysis failed for ${address}:`, error, { correlationId });
          // Continue without transaction analysis
        }
      }

      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore);
      
      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(sanctionMatches, transactionAnalysis);
      
      const processingTime = calculateProcessingTime(startTime);
      
      const result: ScreeningResult = {
        address,
        riskScore,
        riskLevel,
        sanctionMatches,
        timestamp: getCurrentTimestamp(),
        confidence,
        processingTimeMs: processingTime
      };

      // Add transaction analysis if it exists
      if (transactionAnalysis) {
        result.transactionAnalysis = transactionAnalysis;
      }

      // Log the screening action
      await auditLogService.logAddressScreening(
        address,
        { riskScore, riskLevel, sanctionMatchCount: sanctionMatches.length },
        processingTime,
        correlationId,
        true
      );

      logger.info(`Address screening completed for ${address}`, {
        address,
        riskScore,
        riskLevel,
        sanctionMatches: sanctionMatches.length,
        processingTime,
        correlationId
      });

      return result;
    } catch (error) {
      const processingTime = calculateProcessingTime(startTime);
      
      // Log the error
      await auditLogService.logAddressScreening(
        address,
        { error: (error as Error).message },
        processingTime,
        correlationId,
        false,
        (error as Error).message
      );

      logger.error(`Address screening failed for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Screen multiple addresses in batch
   */
  public async screenAddressesBatch(
    addresses: string[],
    includeTransactionAnalysis: boolean = false,
    maxHops: number = 5,
    correlationId?: string
  ): Promise<ScreeningResult[]> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting batch address screening for ${addresses.length} addresses`, {
        addressCount: addresses.length,
        includeTransactionAnalysis,
        maxHops,
        correlationId
      });

      // Validate all addresses first
      const validAddresses = addresses.filter(addr => isValidBitcoinAddress(addr));
      const invalidAddresses = addresses.filter(addr => !isValidBitcoinAddress(addr));

      if (invalidAddresses.length > 0) {
        logger.warn(`Found ${invalidAddresses.length} invalid addresses in batch`, {
          invalidAddresses: invalidAddresses.slice(0, 5), // Log first 5 only
          correlationId
        });
      }

      // Process valid addresses concurrently (with limit to avoid overwhelming external APIs)
      const batchSize = 10; // Process in batches of 10
      const results: ScreeningResult[] = [];
      
      for (let i = 0; i < validAddresses.length; i += batchSize) {
        const batch = validAddresses.slice(i, i + batchSize);
        const batchPromises = batch.map(address => 
          this.screenAddress(address, includeTransactionAnalysis, maxHops, correlationId)
            .catch(error => {
              logger.error(`Failed to screen address ${address} in batch:`, error);
              // Return a failed result instead of throwing
              return {
                address,
                riskScore: 0,
                riskLevel: 'LOW' as RiskLevel,
                sanctionMatches: [],
                timestamp: getCurrentTimestamp(),
                confidence: 0,
                processingTimeMs: 0
              };
            })
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to be respectful to external APIs
        if (i + batchSize < validAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const processingTime = calculateProcessingTime(startTime);

      // Log the bulk screening action
      await auditLogService.logBulkScreening(
        addresses.length,
        { 
          totalAddresses: addresses.length,
          validAddresses: validAddresses.length,
          invalidAddresses: invalidAddresses.length,
          resultsCount: results.length
        },
        processingTime,
        correlationId,
        true
      );

      logger.info(`Batch address screening completed`, {
        totalAddresses: addresses.length,
        validAddresses: validAddresses.length,
        resultsCount: results.length,
        processingTime,
        correlationId
      });

      return results;
    } catch (error) {
      const processingTime = calculateProcessingTime(startTime);
      
      await auditLogService.logBulkScreening(
        addresses.length,
        { error: (error as Error).message },
        processingTime,
        correlationId,
        false,
        (error as Error).message
      );

      logger.error('Batch address screening failed:', error);
      throw error;
    }
  }

  /**
   * Find direct sanction matches for an address
   */
  private async findDirectSanctionMatches(address: string): Promise<SanctionMatch[]> {
    try {
      const sanctionEntities = await sanctionsDataService.findSanctionsByAddress(address);
      
      return sanctionEntities.map((entity: SanctionEntity) => ({
        listSource: entity.listSource,
        entityName: entity.name,
        entityId: entity.entityId,
        matchType: 'DIRECT' as MatchType,
        confidence: 100, // Direct matches have 100% confidence
        matchedAddress: address
      }));
    } catch (error) {
      logger.error(`Failed to find direct sanction matches for ${address}:`, error);
      return [];
    }
  }

  /**
   * Calculate risk score from direct sanction matches
   */
  private calculateDirectMatchRiskScore(sanctionMatches: SanctionMatch[]): number {
    if (sanctionMatches.length === 0) {
      return 0;
    }

    // Base score for any direct match
    let score = 60;
    
    // Additional points for multiple matches
    if (sanctionMatches.length > 1) {
      score += Math.min(sanctionMatches.length * 5, 20); // Max 20 additional points
    }
    
    // Additional points for high-priority lists (OFAC gets higher score)
    const hasOFAC = sanctionMatches.some(match => match.listSource === 'OFAC');
    if (hasOFAC) {
      score += 15;
    }
    
    return Math.min(score, 80); // Max 80 points from direct matches
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 76) return 'CRITICAL';
    if (riskScore >= 51) return 'HIGH';
    if (riskScore >= 26) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(
    sanctionMatches: SanctionMatch[], 
    transactionAnalysis?: TransactionPathAnalysis
  ): number {
    let confidence = 0;
    
    // Confidence from direct matches
    if (sanctionMatches.length > 0) {
      confidence += 70; // High confidence for direct matches
      
      // Additional confidence for multiple matches
      if (sanctionMatches.length > 1) {
        confidence += 10;
      }
    } else {
      confidence += 30; // Base confidence for no matches
    }
    
    // Confidence from transaction analysis
    if (transactionAnalysis && transactionAnalysis.totalNodesAnalyzed > 0) {
      confidence += 15;
      
      // Additional confidence for thorough analysis
      if (transactionAnalysis.totalNodesAnalyzed > 10) {
        confidence += 5;
      }
    }
    
    return Math.min(confidence, 100);
  }
}

// Export singleton instance
export const addressScreeningService = new AddressScreeningService();
