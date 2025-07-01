import { 
  TransactionPathAnalysis, 
  TransactionPathNode, 
  BitcoinTransaction,
  SanctionMatch,
  ExternalApiError 
} from '../types';
import { blockchainApiService } from './blockchainApiService';
import { sanctionsDataService } from './sanctionsDataService';
import logger from '../utils/logger';

/**
 * Service for analyzing Bitcoin transaction paths and tracing connections
 */
export class TransactionPathAnalysisService {
  private readonly maxConcurrentRequests: number = 5;
  private readonly analysisCache = new Map<string, TransactionPathAnalysis>();
  private readonly cacheValidityMs = 1000 * 60 * 30; // 30 minutes

  constructor() {}

  /**
   * Analyze transaction paths from a given address
   */
  async analyzeTransactionPath(
    targetAddress: string,
    maxHops: number = 5,
    correlationId?: string
  ): Promise<TransactionPathAnalysis> {
    const startTime = Date.now();
    const cacheKey = `${targetAddress}-${maxHops}`;

    try {
      // Check cache first
      if (this.analysisCache.has(cacheKey)) {
        const cached = this.analysisCache.get(cacheKey)!;
        if (Date.now() - new Date(cached.pathNodes[0]?.timestamp || 0).getTime() < this.cacheValidityMs) {
          logger.debug(`Using cached transaction path analysis for ${targetAddress}`, { correlationId });
          return cached;
        }
        this.analysisCache.delete(cacheKey);
      }

      logger.info(`Starting transaction path analysis for ${targetAddress}`, {
        maxHops,
        correlationId
      });

      const analysis: TransactionPathAnalysis = {
        targetAddress,
        maxHops,
        totalNodesAnalyzed: 0,
        sanctionedNodesFound: 0,
        pathNodes: [],
        riskPropagation: 0
      };

      // Get initial address transactions
      const addressTransactions = await blockchainApiService.getAddressTransactions(targetAddress, 25);
      const visitedAddresses = new Set<string>([targetAddress]);
      const visitedTransactions = new Set<string>();

      // Analyze transactions hop by hop
      await this.analyzeHop(
        targetAddress,
        addressTransactions.map(tx => tx.txid),
        0,
        maxHops,
        analysis,
        visitedAddresses,
        visitedTransactions,
        correlationId
      );

      // Calculate risk propagation
      analysis.riskPropagation = this.calculateRiskPropagation(analysis);

      // Cache the result
      this.analysisCache.set(cacheKey, analysis);

      const processingTime = Date.now() - startTime;
      logger.info(`Completed transaction path analysis for ${targetAddress}`, {
        totalNodesAnalyzed: analysis.totalNodesAnalyzed,
        sanctionedNodesFound: analysis.sanctionedNodesFound,
        riskPropagation: analysis.riskPropagation,
        processingTimeMs: processingTime,
        correlationId
      });

      return analysis;
    } catch (error) {
      logger.error(`Transaction path analysis failed for ${targetAddress}:`, error, { correlationId });
      throw new ExternalApiError(`Transaction path analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        targetAddress,
        maxHops,
        correlationId
      });
    }
  }

  /**
   * Analyze a single hop in the transaction path
   */
  private async analyzeHop(
    currentAddress: string,
    transactionIds: string[],
    currentHop: number,
    maxHops: number,
    analysis: TransactionPathAnalysis,
    visitedAddresses: Set<string>,
    visitedTransactions: Set<string>,
    correlationId?: string
  ): Promise<void> {
    if (currentHop >= maxHops || transactionIds.length === 0) {
      return;
    }

    logger.debug(`Analyzing hop ${currentHop + 1}/${maxHops} for ${currentAddress}`, {
      transactionCount: transactionIds.length,
      correlationId
    });

    // Process transactions in batches to respect rate limits
    const batchSize = Math.min(this.maxConcurrentRequests, transactionIds.length);
    const transactionBatches = this.chunkArray(transactionIds.slice(0, 10), batchSize); // Limit to 10 most recent transactions per hop

    for (const batch of transactionBatches) {
      const transactionPromises = batch
        .filter(txid => !visitedTransactions.has(txid))
        .map(async (txid) => {
          try {
            visitedTransactions.add(txid);
            const transaction = await blockchainApiService.getTransaction(txid);
            return { txid, transaction };
          } catch (error) {
            logger.warn(`Failed to fetch transaction ${txid} in path analysis:`, error, { correlationId });
            return null;
          }
        });

      const transactionResults = await Promise.all(transactionPromises);
      const validTransactions = transactionResults.filter(result => result !== null) as Array<{ txid: string; transaction: BitcoinTransaction }>;

      // Analyze each transaction
      for (const { txid, transaction } of validTransactions) {
        await this.analyzeTransaction(
          transaction,
          currentHop,
          analysis,
          visitedAddresses,
          correlationId
        );

        // Extract addresses for next hop
        if (currentHop + 1 < maxHops) {
          const connectedAddresses = blockchainApiService.extractAddressesFromTransaction(transaction)
            .filter(addr => !visitedAddresses.has(addr));

          // Limit the number of addresses to analyze in the next hop
          const nextHopAddresses = connectedAddresses.slice(0, 3);
          
          for (const nextAddress of nextHopAddresses) {
            visitedAddresses.add(nextAddress);
            try {
              const nextTransactions = await blockchainApiService.getAddressTransactions(nextAddress, 5);
              await this.analyzeHop(
                nextAddress,
                nextTransactions.map(tx => tx.txid),
                currentHop + 1,
                maxHops,
                analysis,
                visitedAddresses,
                visitedTransactions,
                correlationId
              );
            } catch (error) {
              logger.warn(`Failed to analyze next hop for address ${nextAddress}:`, error, { correlationId });
            }
          }
        }
      }
    }
  }

  /**
   * Analyze a single transaction for sanctions exposure
   */
  private async analyzeTransaction(
    transaction: BitcoinTransaction,
    hop: number,
    analysis: TransactionPathAnalysis,
    visitedAddresses: Set<string>,
    correlationId?: string
  ): Promise<void> {
    analysis.totalNodesAnalyzed++;

    // Extract all addresses from the transaction
    const addresses = blockchainApiService.extractAddressesFromTransaction(transaction);
    
    // Check each address against sanctions lists
    for (const address of addresses) {
      if (visitedAddresses.has(address)) continue;
      
      try {
        // Check if address is sanctioned
        const sanctions = await sanctionsDataService.getAllSanctions();
        const sanctionMatches: SanctionMatch[] = [];

        for (const entity of sanctions) {
          if (entity.addresses.includes(address)) {
            sanctionMatches.push({
              listSource: entity.listSource,
              entityName: entity.name,
              entityId: entity.entityId,
              matchType: 'DIRECT',
              confidence: 100,
              matchedAddress: address
            });
          }
        }

        if (sanctionMatches.length > 0) {
          analysis.sanctionedNodesFound++;
          
          // Create path node for sanctioned address
          const pathNode: TransactionPathNode = {
            address,
            txid: transaction.txid,
            hop: hop + 1,
            value: this.calculateTransactionValue(transaction, address),
            timestamp: transaction.blockTime * 1000, // Convert to milliseconds
            riskContribution: this.calculateRiskContribution(hop + 1, sanctionMatches.length)
          };

          analysis.pathNodes.push(pathNode);

          logger.warn(`Sanctioned address found in transaction path`, {
            address,
            txid: transaction.txid,
            hop: hop + 1,
            sanctionMatches: sanctionMatches.length,
            correlationId
          });
        }
      } catch (error) {
        logger.warn(`Failed to check sanctions for address ${address}:`, error, { correlationId });
      }
    }
  }

  /**
   * Calculate the transaction value associated with a specific address
   */
  private calculateTransactionValue(transaction: BitcoinTransaction, address: string): number {
    let totalValue = 0;

    // Check inputs
    for (const input of transaction.inputs) {
      if (input.addresses.includes(address)) {
        totalValue += input.value;
      }
    }

    // Check outputs
    for (const output of transaction.outputs) {
      if (output.addresses.includes(address)) {
        totalValue += output.value;
      }
    }

    return totalValue;
  }

  /**
   * Calculate risk contribution based on hop distance and number of matches
   */
  private calculateRiskContribution(hop: number, matchCount: number): number {
    // Risk decreases with distance (hop) and increases with match count
    const hopPenalty = Math.max(0, 100 - (hop * 20)); // Decreases by 20 points per hop
    const matchBonus = Math.min(50, matchCount * 25); // Up to 50 points for multiple matches
    
    return Math.min(100, hopPenalty + matchBonus);
  }

  /**
   * Calculate overall risk propagation score
   */
  private calculateRiskPropagation(analysis: TransactionPathAnalysis): number {
    if (analysis.pathNodes.length === 0) {
      return 0;
    }

    // Calculate weighted average based on hop distance and risk contribution
    const totalWeightedRisk = analysis.pathNodes.reduce((sum, node) => {
      const hopWeight = Math.max(0.1, 1 - (node.hop * 0.15)); // Weight decreases with hop distance
      return sum + (node.riskContribution * hopWeight);
    }, 0);

    const totalWeight = analysis.pathNodes.reduce((sum, node) => {
      return sum + Math.max(0.1, 1 - (node.hop * 0.15));
    }, 0);

    const averageRisk = totalWeightedRisk / totalWeight;
    
    // Apply penalty for multiple sanctioned nodes
    const nodePenalty = Math.min(25, analysis.sanctionedNodesFound * 5);
    
    return Math.min(100, Math.round(averageRisk + nodePenalty));
  }

  /**
   * Utility function to split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    logger.info('Transaction path analysis cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.analysisCache.size,
      maxSize: 100 // We can add a max size limit if needed
    };
  }
}

// Export singleton instance
export const transactionPathAnalysisService = new TransactionPathAnalysisService();
