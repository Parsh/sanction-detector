import { readJsonFile, writeJsonFile, ensureDirectoryExists, fileExists } from '../utils/fileUtils';
import { SanctionsFile, SanctionEntity, SanctionSource } from '../types';
import config from '../config';
import logger from '../utils/logger';
import path from 'path';
import { promises as fs } from 'fs';

// Interface for OFAC crypto data format
interface OFACCryptoEntry {
  entityId: string;
  entityName: string;
  entityType: string;
  program: string;
  cryptocurrency: string;
  address: string;
  remarks: string;
  isActive: boolean;
}

interface OFACCryptoFile {
  metadata: {
    source: string;
    lastUpdated: string;
    version: string;
    totalEntities: number;
    cryptocurrencies: Record<string, number>;
  };
  entities: OFACCryptoEntry[];
}

/**
 * Data access layer for OFAC cryptocurrency sanctions data
 */
export class SanctionsDataService {
  private sanctionsCache: SanctionEntity[] = [];
  private lastLoadTime: number = 0;
  private readonly cacheValidityMs = 1000 * 60 * 60; // 1 hour
  private readonly dataFilePath: string;

  constructor() {
    this.dataFilePath = path.join(config.sanctionsDir, 'refined_data', 'ofac-crypto-addresses.json');
    this.initializeDirectories();
  }

  private async initializeDirectories(): Promise<void> {
    await ensureDirectoryExists(config.sanctionsDir);
    await ensureDirectoryExists(path.join(config.sanctionsDir, 'refined_data'));
  }

  /**
   * Load OFAC cryptocurrency sanctions data
   */
  public async loadAllSanctions(): Promise<void> {
    try {
      // Check if cache is still valid
      if (Date.now() - this.lastLoadTime < this.cacheValidityMs && this.sanctionsCache.length > 0) {
        return;
      }

      const fileContent = await fs.readFile(this.dataFilePath, 'utf-8');
      const ofacCryptoFile: OFACCryptoFile = JSON.parse(fileContent);
      
      // Transform OFAC crypto data to standard format
      const entities = this.transformOFACCryptoData(ofacCryptoFile);
      
      // Filter active entities only
      const activeEntities = entities.filter(entity => entity.isActive);

      this.sanctionsCache = activeEntities;
      this.lastLoadTime = Date.now();

      logger.info(`Loaded ${activeEntities.length} active OFAC crypto sanctions`, {
        source: 'OFAC',
        filename: 'ofac-crypto-addresses.json',
        totalEntities: entities.length,
        activeEntities: activeEntities.length,
        cryptocurrencies: ofacCryptoFile.metadata.cryptocurrencies
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn(`OFAC crypto sanctions file not found: ${this.dataFilePath}. Creating empty cache`);
        this.sanctionsCache = [];
        this.lastLoadTime = Date.now();
      } else {
        logger.error(`Failed to load OFAC crypto sanctions:`, error);
        throw error;
      }
    }
  }

  /**
   * Transform OFAC crypto data format to standard SanctionEntity format
   */
  private transformOFACCryptoData(ofacData: OFACCryptoFile): SanctionEntity[] {
    // Group entries by entityId to consolidate addresses
    const entityMap = new Map<string, SanctionEntity>();
    
    for (const entry of ofacData.entities) {
      if (!entityMap.has(entry.entityId)) {
        // Extract aliases from remarks
        const aliases = this.extractAliasesFromRemarks(entry.remarks);
        
        entityMap.set(entry.entityId, {
          entityId: entry.entityId,
          name: entry.entityName,
          listSource: 'OFAC',
          addresses: [entry.address],
          aliases: aliases,
          lastUpdated: ofacData.metadata.lastUpdated,
          isActive: entry.isActive
        });
      } else {
        // Add address to existing entity
        const existingEntity = entityMap.get(entry.entityId)!;
        if (!existingEntity.addresses.includes(entry.address)) {
          existingEntity.addresses.push(entry.address);
        }
      }
    }
    
    return Array.from(entityMap.values());
  }

  /**
   * Extract aliases from OFAC remarks field
   */
  private extractAliasesFromRemarks(remarks: string): string[] {
    const aliases: string[] = [];
    
    // Match patterns like "a.k.a. 'NAME'" or "a.k.a. \"NAME\""
    const akaPattern = /a\.k\.a\.\s+['""]([^'""]+)['""](?:;|$)/gi;
    let match;
    
    while ((match = akaPattern.exec(remarks)) !== null) {
      if (match[1] && match[1].trim()) {
        aliases.push(match[1].trim());
      }
    }
    
    return aliases;
  }

  /**
   * Get all sanctions entities
   */
  public async getAllSanctions(): Promise<SanctionEntity[]> {
    await this.loadAllSanctions();
    return this.sanctionsCache;
  }

  /**
   * Find sanctions entities by address
   */
  public async findSanctionsByAddress(address: string): Promise<SanctionEntity[]> {
    const allSanctions = await this.getAllSanctions();
    
    return allSanctions.filter(entity => 
      entity.addresses.some(addr => addr.toLowerCase() === address.toLowerCase())
    );
  }

  /**
   * Find sanctions entities by multiple addresses
   */
  public async findSanctionsByAddresses(addresses: string[]): Promise<Map<string, SanctionEntity[]>> {
    const allSanctions = await this.getAllSanctions();
    const results = new Map<string, SanctionEntity[]>();
    
    for (const address of addresses) {
      const lowerAddress = address.toLowerCase();
      const matchingEntities = allSanctions.filter(entity =>
        entity.addresses.some(addr => addr.toLowerCase() === lowerAddress)
      );
      results.set(address, matchingEntities);
    }
    
    return results;
  }

  /**
   * Search sanctions entities by name or alias (fuzzy search)
   */
  public async searchSanctionsByName(query: string): Promise<SanctionEntity[]> {
    const allSanctions = await this.getAllSanctions();
    const lowerQuery = query.toLowerCase();
    
    return allSanctions.filter(entity => {
      const nameMatch = entity.name.toLowerCase().includes(lowerQuery);
      const aliasMatch = entity.aliases.some(alias => 
        alias.toLowerCase().includes(lowerQuery)
      );
      return nameMatch || aliasMatch;
    });
  }

  /**
   * Get sanctions metadata
   */
  public async getSanctionsMetadata(): Promise<any> {
    try {
      const fileContent = await fs.readFile(this.dataFilePath, 'utf-8');
      const ofacCryptoFile: OFACCryptoFile = JSON.parse(fileContent);
      return ofacCryptoFile.metadata;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.sanctionsCache = [];
    this.lastLoadTime = 0;
    logger.info('OFAC crypto sanctions cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): Record<string, any> {
    return {
      entitiesCount: this.sanctionsCache.length,
      lastLoadTime: this.lastLoadTime ? new Date(this.lastLoadTime).toISOString() : null,
      cacheAge: this.lastLoadTime ? Date.now() - this.lastLoadTime : null,
      isValid: this.lastLoadTime ? (Date.now() - this.lastLoadTime) < this.cacheValidityMs : false,
      dataFile: this.dataFilePath
    };
  }
}

// Export singleton instance
export const sanctionsDataService = new SanctionsDataService();
