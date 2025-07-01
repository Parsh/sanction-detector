// Core data types and interfaces for the sanction detection system

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SanctionSource = 'OFAC';
export type MatchType = 'DIRECT' | 'INDIRECT' | 'CLUSTER';

export interface SanctionEntity {
  entityId: string;
  name: string;
  listSource: SanctionSource;
  addresses: string[];
  aliases: string[];
  lastUpdated: string; // ISO date
  isActive: boolean;
}

export interface SanctionsFile {
  metadata: {
    source: string;
    lastUpdated: string;
    version: string;
    totalEntities: number;
  };
  entities: SanctionEntity[];
}

export interface SanctionMatch {
  listSource: SanctionSource;
  entityName: string;
  entityId: string;
  matchType: MatchType;
  confidence: number; // 0-100
  matchedAddress?: string;
}

export interface TransactionInput {
  txid: string;
  vout: number;
  addresses: string[];
  value: number;
}

export interface TransactionOutput {
  addresses: string[];
  value: number;
  scriptPubKey: string;
}

export interface BitcoinTransaction {
  txid: string;
  blockHeight: number;
  blockTime: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  fee: number;
  size: number;
}

export interface TransactionPathNode {
  address: string;
  txid: string;
  hop: number;
  value: number;
  timestamp: number;
  riskContribution: number;
}

export interface TransactionPathAnalysis {
  targetAddress: string;
  maxHops: number;
  totalNodesAnalyzed: number;
  sanctionedNodesFound: number;
  pathNodes: TransactionPathNode[];
  riskPropagation: number; // 0-100
}

export interface RiskFactors {
  directSanctionMatch: number;      // 0-40 points
  indirectExposure: number;         // 0-25 points
  transactionPatterns: number;      // 0-20 points
  geographicalRisk: number;         // 0-10 points
  temporalFactors: number;          // 0-5 points
}

export interface RiskAssessment {
  id: string;
  address: string;
  txHash?: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  riskFactors: RiskFactors;
  sanctionMatches: SanctionMatch[];
  transactionAnalysis?: TransactionPathAnalysis;
  assessmentDate: string;
  expiresAt: string; // TTL behavior
  confidence: number; // 0-100
}

export interface ScreeningRequest {
  address: string;
  includeTransactionAnalysis?: boolean;
  maxHops?: number;
}

export interface TransactionScreeningRequest {
  txHash: string;
  direction?: 'incoming' | 'outgoing' | 'both';
}

export interface BulkScreeningRequest {
  addresses?: string[];
  transactions?: string[];
}

export interface ScreeningResult {
  address: string;
  riskScore: number;
  riskLevel: RiskLevel;
  sanctionMatches: SanctionMatch[];
  transactionAnalysis?: TransactionPathAnalysis;
  timestamp: string;
  confidence: number;
  processingTimeMs: number;
}

export interface AuditLog {
  id: string;
  action: string;
  address: string;
  txHash?: string;
  result: Record<string, unknown>;
  timestamp: string;
  correlationId: string;
  processingTimeMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface AppConfig {
  port: number;
  logLevel: string;
  dataDir: string;
  sanctionsDir: string;
  riskAssessmentsDir: string;
  auditLogsDir: string;
  configDir: string;
  apiRateLimit: number;
  defaultMaxHops: number;
  riskCacheTtlHours: number;
  blockchainApis: {
    mempool: string;
    blockCypher: string;
    blockStream: string;
  };
  sanctionsUrls: {
    ofac: string;
    eu: string;
    un: string;
  };
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  correlationId: string;
}

// Error types
export class SanctionDetectorError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SanctionDetectorError';
  }
}

export class ValidationError extends SanctionDetectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ExternalApiError extends SanctionDetectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EXTERNAL_API_ERROR', 502, details);
    this.name = 'ExternalApiError';
  }
}

export class DataNotFoundError extends SanctionDetectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DATA_NOT_FOUND', 404, details);
    this.name = 'DataNotFoundError';
  }
}

// Mempool API response types
export interface MempoolTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: MempoolVin[];
  vout: MempoolVout[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface MempoolVin {
  txid: string;
  vout: number;
  prevout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address?: string;
    value: number;
  };
  scriptsig: string;
  scriptsig_asm: string;
  is_coinbase: boolean;
  sequence: number;
}

export interface MempoolVout {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface MempoolAddressInfo {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

export interface MempoolAddressTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: MempoolVin[];
  vout: MempoolVout[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}
