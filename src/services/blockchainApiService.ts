import mempoolJS from '@mempool/mempool.js';
import { 
  MempoolTransaction, 
  MempoolAddressInfo, 
  MempoolAddressTransaction,
  BitcoinTransaction,
  TransactionInput,
  TransactionOutput,
  ExternalApiError 
} from '../types';
import logger from '../utils/logger';
import config from '../config';

/**
 * Service for interacting with blockchain APIs (primarily Mempool.space)
 */
export class BlockchainApiService {
  private mempool: any;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly maxRequestsPerMinute: number = 60; // Conservative rate limit

  constructor() {
    const { bitcoin: { addresses, blocks, fees, mempool, transactions } } = mempoolJS({
      hostname: 'mempool.space'
    });

    this.mempool = {
      addresses,
      blocks,
      fees,
      mempool,
      transactions
    };
  }

  /**
   * Check and enforce rate limiting
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute

    // Reset counter if a minute has passed
    if (now - this.lastResetTime > timeWindow) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.maxRequestsPerMinute) {
      throw new ExternalApiError('Rate limit exceeded for Mempool API', {
        requestCount: this.requestCount,
        limit: this.maxRequestsPerMinute
      });
    }

    this.requestCount++;
  }

  /**
   * Get transaction details from Mempool.space
   */
  async getTransaction(txid: string): Promise<BitcoinTransaction> {
    try {
      this.checkRateLimit();
      
      logger.debug(`Fetching transaction from Mempool.space: ${txid}`);
      const mempoolTx: MempoolTransaction = await this.mempool.transactions.getTx({ txid });
      
      // Transform Mempool response to our standard format
      const transaction: BitcoinTransaction = {
        txid: mempoolTx.txid,
        blockHeight: mempoolTx.status.block_height || 0,
        blockTime: mempoolTx.status.block_time || 0,
        inputs: mempoolTx.vin.map((vin): TransactionInput => ({
          txid: vin.txid,
          vout: vin.vout,
          addresses: (vin.prevout && vin.prevout.scriptpubkey_address) ? [vin.prevout.scriptpubkey_address] : [],
          value: (vin.prevout && vin.prevout.value) ? vin.prevout.value : 0
        })),
        outputs: mempoolTx.vout.map((vout): TransactionOutput => ({
          addresses: vout.scriptpubkey_address ? [vout.scriptpubkey_address] : [],
          value: vout.value || 0,
          scriptPubKey: vout.scriptpubkey || ''
        })),
        fee: mempoolTx.fee,
        size: mempoolTx.size
      };

      logger.debug(`Successfully fetched transaction: ${txid}`, {
        inputCount: transaction.inputs.length,
        outputCount: transaction.outputs.length,
        fee: transaction.fee
      });

      return transaction;
    } catch (error) {
      logger.error(`Failed to fetch transaction ${txid}:`, error);
      throw new ExternalApiError(`Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        txid,
        service: 'mempool.space'
      });
    }
  }

  /**
   * Get address information from Mempool.space
   */
  async getAddressInfo(address: string): Promise<MempoolAddressInfo> {
    try {
      this.checkRateLimit();
      
      logger.debug(`Fetching address info from Mempool.space: ${address}`);
      const addressInfo: MempoolAddressInfo = await this.mempool.addresses.getAddress({ address });
      
      logger.debug(`Successfully fetched address info: ${address}`, {
        txCount: addressInfo.chain_stats.tx_count,
        balance: addressInfo.chain_stats.funded_txo_sum - addressInfo.chain_stats.spent_txo_sum
      });

      return addressInfo;
    } catch (error) {
      logger.error(`Failed to fetch address info ${address}:`, error);
      throw new ExternalApiError(`Failed to fetch address info: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        address,
        service: 'mempool.space'
      });
    }
  }

  /**
   * Get transactions for an address from Mempool.space
   */
  async getAddressTransactions(address: string, limit: number = 50): Promise<MempoolAddressTransaction[]> {
    try {
      this.checkRateLimit();
      
      logger.debug(`Fetching address transactions from Mempool.space: ${address} (limit: ${limit})`);
      const transactions: MempoolAddressTransaction[] = await this.mempool.addresses.getAddressTxs({ 
        address,
        // Note: Mempool API doesn't have a direct limit parameter, we'll slice the results
      });
      
      // Limit the results to avoid too much data
      const limitedTransactions = transactions.slice(0, limit);
      
      logger.debug(`Successfully fetched address transactions: ${address}`, {
        totalFound: transactions.length,
        returned: limitedTransactions.length
      });

      return limitedTransactions;
    } catch (error) {
      logger.error(`Failed to fetch address transactions ${address}:`, error);
      throw new ExternalApiError(`Failed to fetch address transactions: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        address,
        service: 'mempool.space'
      });
    }
  }

  /**
   * Get UTXO (Unspent Transaction Outputs) for an address
   */
  async getAddressUtxos(address: string): Promise<any[]> {
    try {
      this.checkRateLimit();
      
      logger.debug(`Fetching address UTXOs from Mempool.space: ${address}`);
      const utxos = await this.mempool.addresses.getAddressUtxo({ address });
      
      logger.debug(`Successfully fetched address UTXOs: ${address}`, {
        utxoCount: utxos.length
      });

      return utxos;
    } catch (error) {
      logger.error(`Failed to fetch address UTXOs ${address}:`, error);
      throw new ExternalApiError(`Failed to fetch address UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        address,
        service: 'mempool.space'
      });
    }
  }

  /**
   * Extract all unique addresses from a transaction
   */
  extractAddressesFromTransaction(transaction: BitcoinTransaction): string[] {
    const addresses = new Set<string>();
    
    // Add input addresses
    transaction.inputs.forEach(input => {
      input.addresses.forEach(addr => addresses.add(addr));
    });
    
    // Add output addresses
    transaction.outputs.forEach(output => {
      output.addresses.forEach(addr => addresses.add(addr));
    });
    
    return Array.from(addresses);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { requestCount: number; limit: number; resetTime: number } {
    return {
      requestCount: this.requestCount,
      limit: this.maxRequestsPerMinute,
      resetTime: this.lastResetTime + (60 * 1000)
    };
  }

  /**
   * Health check for the blockchain API service
   */
  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      
      // Try to fetch a well-known transaction (Genesis block coinbase)
      const genesisTxid = '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b';
      await this.getTransaction(genesisTxid);
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      logger.error('Blockchain API health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const blockchainApiService = new BlockchainApiService();
