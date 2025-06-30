import dotenv from 'dotenv';
import { AppConfig } from './types';

// Load environment variables
dotenv.config();

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  dataDir: process.env.DATA_DIR || './data',
  sanctionsDir: process.env.SANCTIONS_DIR || './data/sanctions',
  riskAssessmentsDir: process.env.RISK_ASSESSMENTS_DIR || './data/risk-assessments',
  auditLogsDir: process.env.AUDIT_LOGS_DIR || './data/audit-logs',
  configDir: process.env.CONFIG_DIR || './data/config',
  apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '60', 10),
  defaultMaxHops: parseInt(process.env.DEFAULT_MAX_HOPS || '5', 10),
  riskCacheTtlHours: parseInt(process.env.RISK_CACHE_TTL_HOURS || '24', 10),
  blockchainApis: {
    mempool: process.env.MEMPOOL_SPACE_BASE_URL || 'https://mempool.space/api',
    blockCypher: process.env.BLOCKCYPHER_BASE_URL || 'https://api.blockcypher.com/v1/btc/main',
    blockStream: process.env.BLOCKSTREAM_BASE_URL || 'https://blockstream.info/api'
  },
  sanctionsUrls: {
    ofac: process.env.OFAC_SDN_URL || 'https://www.treasury.gov/ofac/downloads/sdn.xml',
    eu: process.env.EU_SANCTIONS_URL || 'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content',
    un: process.env.UN_SANCTIONS_URL || 'https://scsanctions.un.org/resources/xml/en/consolidated.xml'
  }
};

export default config;
