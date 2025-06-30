#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { writeJsonFile, ensureDirectoryExists } from '../utils/fileUtils';
import logger from '../utils/logger';

interface CryptoEntry {
  entityId: string;
  entityName: string;
  entityType: string;
  program: string;
  cryptocurrency: string;
  address: string;
  remarks: string;
  isActive: boolean;
}

interface ProcessedSanctionsData {
  metadata: {
    source: string;
    lastUpdated: string;
    version: string;
    totalEntities: number;
    cryptocurrencies: {
      [key: string]: number;
    };
  };
  entities: CryptoEntry[];
}

class SDNCryptoExtractor {
  private inputFile: string;
  private outputDir: string;
  private cryptoAddressPatterns: Record<string, RegExp[]>;

  constructor(inputFile: string, outputDir: string) {
    this.inputFile = inputFile;
    this.outputDir = outputDir;
    
    // Define cryptocurrency address patterns
    this.cryptoAddressPatterns = {
      'XBT': [
        /Digital Currency Address - XBT ([13][a-km-zA-HJ-NP-Z1-9]{25,34})/g,
        /Digital Currency Address - XBT (bc1[a-z0-9]{39,59})/g,
        /Digital Currency Address - XBT (3[a-km-zA-HJ-NP-Z1-9]{33})/g
      ],
      'ETH': [
        /Digital Currency Address - ETH (0x[a-fA-F0-9]{40})/g
      ],
      'LTC': [
        /Digital Currency Address - LTC ([LM3][a-km-zA-HJ-NP-Z1-9]{26,33})/g
      ],
      'XMR': [
        /Digital Currency Address - XMR ([4][0-9AB][1-9A-HJ-NP-Za-km-z]{93})/g
      ],
      'ZEC': [
        /Digital Currency Address - ZEC (t1[a-zA-Z0-9]{33})/g
      ],
      'DASH': [
        /Digital Currency Address - DASH (X[1-9A-HJ-NP-Za-km-z]{33})/g
      ],
      'BTG': [
        /Digital Currency Address - BTG ([AG][a-km-zA-HJ-NP-Z1-9]{25,34})/g
      ],
      'ETC': [
        /Digital Currency Address - ETC (0x[a-fA-F0-9]{40})/g
      ],
      'XVG': [
        /Digital Currency Address - XVG ([D][a-km-zA-HJ-NP-Z1-9]{25,34})/g
      ]
    };
  }

  public async extractCryptoData(): Promise<void> {
    try {
      logger.info('Starting SDN cryptocurrency extraction', {
        inputFile: this.inputFile,
        outputDir: this.outputDir
      });

      // Ensure output directory exists
      await ensureDirectoryExists(this.outputDir);

      // Read and process SDN CSV
      const csvContent = fs.readFileSync(this.inputFile, 'utf-8');
      const lines = csvContent.split('\n'); // Fixed: was \\n instead of \n

      console.log(`📊 Processing ${lines.length} SDN entries...`);

      const cryptoEntries: CryptoEntry[] = [];
      const cryptoStats: Record<string, number> = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        // Parse CSV line (basic parsing for SDN format)
        const fields = this.parseSDNLine(line);
        if (!fields || fields.length < 12) continue;

        const [entityId, entityName, entityType, program, , , , , , , , remarks] = fields;

        // Look for cryptocurrency addresses in remarks field
        const cryptoAddresses = this.extractCryptoAddresses(remarks || '');
        
        for (const { currency, address } of cryptoAddresses) {
          cryptoEntries.push({
            entityId: entityId || `SDN-${i}`,
            entityName: this.cleanText(entityName || 'Unknown'),
            entityType: this.cleanText(entityType || 'Unknown'),
            program: this.cleanText(program || 'Unknown'),
            cryptocurrency: currency,
            address: address,
            remarks: this.cleanText(remarks || ''),
            isActive: true
          });

          // Update statistics
          cryptoStats[currency] = (cryptoStats[currency] || 0) + 1;
        }

        // Progress indicator
        if (i % 1000 === 0) {
          console.log(`   Processed ${i}/${lines.length} entries...`);
        }
      }

      console.log(`\\n✅ Extraction complete! Found ${cryptoEntries.length} cryptocurrency addresses`);
      console.log('\\n📈 Cryptocurrency breakdown:');
      Object.entries(cryptoStats).forEach(([currency, count]) => {
        console.log(`   ${currency}: ${count} addresses`);
      });

      // Generate processed data structure
      const processedData: ProcessedSanctionsData = {
        metadata: {
          source: 'OFAC SDN List',
          lastUpdated: new Date().toISOString(),
          version: '1.0.0',
          totalEntities: cryptoEntries.length,
          cryptocurrencies: cryptoStats
        },
        entities: cryptoEntries
      };

      // Save data in different formats
      await this.saveResults(processedData);

    } catch (error) {
      logger.error('Failed to extract crypto data from SDN:', error);
      throw error;
    }
  }

  private parseSDNLine(line: string): string[] | null {
    try {
      // Basic CSV parsing for SDN format
      // Handle quoted fields and commas
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      if (current) {
        fields.push(current.trim());
      }
      
      return fields;
    } catch (error) {
      return null;
    }
  }

  private extractCryptoAddresses(text: string): Array<{ currency: string; address: string }> {
    const addresses: Array<{ currency: string; address: string }> = [];
    
    for (const [currency, patterns] of Object.entries(this.cryptoAddressPatterns)) {
      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(text)) !== null) {
          if (match[1]) {
            addresses.push({
              currency,
              address: match[1]
            });
          }
        }
      }
    }
    
    return addresses;
  }

  private cleanText(text: string): string {
    return text
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/-0-/g, '') // Remove SDN placeholder
      .trim();
  }

  private async saveResults(data: ProcessedSanctionsData): Promise<void> {
    try {
      // 1. Save complete JSON file
      const jsonPath = path.join(this.outputDir, 'ofac-crypto-complete.json');
      await writeJsonFile(jsonPath, data);
      console.log(`💾 Saved complete data: ${jsonPath}`);

      // 2. Save cryptocurrency-specific JSON files
      const cryptoGroups = this.groupByCryptocurrency(data.entities);
      
      for (const [crypto, entries] of Object.entries(cryptoGroups)) {
        const cryptoData: ProcessedSanctionsData = {
          metadata: {
            ...data.metadata,
            totalEntities: entries.length,
            cryptocurrencies: { [crypto]: entries.length }
          },
          entities: entries
        };
        
        const cryptoPath = path.join(this.outputDir, `ofac-${crypto.toLowerCase()}.json`);
        await writeJsonFile(cryptoPath, cryptoData);
        console.log(`💾 Saved ${crypto} data: ${cryptoPath} (${entries.length} addresses)`);
      }

      // 3. Save CSV for analysis
      const csvPath = path.join(this.outputDir, 'ofac-crypto-addresses.csv');
      await this.saveToCsv(data.entities, csvPath);
      console.log(`💾 Saved CSV data: ${csvPath}`);

      // 4. Save statistics
      const statsPath = path.join(this.outputDir, 'extraction-stats.json');
      const stats = {
        extractionDate: new Date().toISOString(),
        totalAddresses: data.entities.length,
        cryptocurrencies: data.metadata.cryptocurrencies,
        topEntities: this.getTopEntities(data.entities),
        programBreakdown: this.getProgramBreakdown(data.entities)
      };
      await writeJsonFile(statsPath, stats);
      console.log(`📊 Saved statistics: ${statsPath}`);

    } catch (error) {
      logger.error('Failed to save results:', error);
      throw error;
    }
  }

  private groupByCryptocurrency(entries: CryptoEntry[]): Record<string, CryptoEntry[]> {
    const groups: Record<string, CryptoEntry[]> = {};
    
    for (const entry of entries) {
      if (!groups[entry.cryptocurrency]) {
        groups[entry.cryptocurrency] = [];
      }
      groups[entry.cryptocurrency]!.push(entry);
    }
    
    return groups;
  }

  private async saveToCsv(entries: CryptoEntry[], filePath: string): Promise<void> {
    try {
      const headers = ['Entity ID', 'Entity Name', 'Entity Type', 'Program', 'Cryptocurrency', 'Address', 'Is Active'];
      const csvLines = [headers.join(',')];
      
      for (const entry of entries) {
        const row = [
          `"${entry.entityId}"`,
          `"${entry.entityName.replace(/"/g, '""')}"`,
          `"${entry.entityType}"`,
          `"${entry.program}"`,
          `"${entry.cryptocurrency}"`,
          `"${entry.address}"`,
          `"${entry.isActive}"`
        ];
        csvLines.push(row.join(','));
      }
      
      fs.writeFileSync(filePath, csvLines.join('\n'), 'utf-8'); // Fixed: was \\n instead of \n
    } catch (error) {
      logger.error('Failed to save CSV:', error);
      throw error;
    }
  }

  private getTopEntities(entries: CryptoEntry[]): Array<{ name: string; count: number }> {
    const entityCounts: Record<string, number> = {};
    
    for (const entry of entries) {
      entityCounts[entry.entityName] = (entityCounts[entry.entityName] || 0) + 1;
    }
    
    return Object.entries(entityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getProgramBreakdown(entries: CryptoEntry[]): Record<string, number> {
    const programCounts: Record<string, number> = {};
    
    for (const entry of entries) {
      programCounts[entry.program] = (programCounts[entry.program] || 0) + 1;
    }
    
    return programCounts;
  }
}

// Main execution
async function main() {
  try {
    const inputFile = path.join(__dirname, '../../data/sanctions/raw_data/SDN Data.csv');
    const outputDir = path.join(__dirname, '../../data/sanctions');

    console.log('🚀 OFAC SDN Cryptocurrency Extractor');
    console.log('=====================================');
    console.log(`📁 Input: ${inputFile}`);
    console.log(`📁 Output: ${outputDir}`);
    console.log('');

    const extractor = new SDNCryptoExtractor(inputFile, outputDir);
    await extractor.extractCryptoData();

    console.log('\\n🎉 Extraction completed successfully!');
    console.log('\\n📄 Generated files:');
    console.log('   • ofac-crypto-complete.json - Complete dataset');
    console.log('   • ofac-xbt.json - Bitcoin addresses only');
    console.log('   • ofac-eth.json - Ethereum addresses only');
    console.log('   • ofac-crypto-addresses.csv - CSV format for analysis');
    console.log('   • extraction-stats.json - Statistics and metadata');

  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SDNCryptoExtractor, CryptoEntry, ProcessedSanctionsData };
