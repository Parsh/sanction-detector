import Joi from 'joi';
import { 
  ScreeningRequest, 
  TransactionScreeningRequest, 
  BulkScreeningRequest,
  ValidationError 
} from '../types';

// Bitcoin address validation regex (supports Legacy, SegWit, and Bech32)
const BITCOIN_ADDRESS_REGEX = /^([13][a-km-zA-HJ-NP-Z1-9]{25,34})|^(bc1[a-z0-9]{39,59})$/;

// Bitcoin transaction hash validation regex
const BITCOIN_TX_HASH_REGEX = /^[a-fA-F0-9]{64}$/;

/**
 * Validate Bitcoin address format
 */
export function isValidBitcoinAddress(address: string): boolean {
  return BITCOIN_ADDRESS_REGEX.test(address);
}

/**
 * Validate Bitcoin transaction hash format
 */
export function isValidBitcoinTxHash(txHash: string): boolean {
  return BITCOIN_TX_HASH_REGEX.test(txHash);
}

/**
 * Joi schema for address screening request
 */
const addressScreeningSchema = Joi.object<ScreeningRequest>({
  address: Joi.string()
    .required()
    .custom((value: string, helpers) => {
      if (!isValidBitcoinAddress(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'Invalid Bitcoin address format'
    }),
  includeTransactionAnalysis: Joi.boolean().default(false),
  maxHops: Joi.number().integer().min(1).max(10).default(5)
});

/**
 * Joi schema for transaction screening request
 */
const transactionScreeningSchema = Joi.object<TransactionScreeningRequest>({
  txHash: Joi.string()
    .required()
    .custom((value: string, helpers) => {
      if (!isValidBitcoinTxHash(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'Invalid Bitcoin transaction hash format'
    }),
  direction: Joi.string().valid('incoming', 'outgoing', 'both').default('both')
});

/**
 * Joi schema for bulk screening request
 */
const bulkScreeningSchema = Joi.object<BulkScreeningRequest>({
  addresses: Joi.array()
    .items(
      Joi.string().custom((value: string, helpers) => {
        if (!isValidBitcoinAddress(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      })
    )
    .max(100)
    .messages({
      'any.invalid': 'Invalid Bitcoin address format in addresses array',
      'array.max': 'Maximum 100 addresses allowed in bulk request'
    }),
  transactions: Joi.array()
    .items(
      Joi.string().custom((value: string, helpers) => {
        if (!isValidBitcoinTxHash(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      })
    )
    .max(50)
    .messages({
      'any.invalid': 'Invalid Bitcoin transaction hash format in transactions array',
      'array.max': 'Maximum 50 transactions allowed in bulk request'
    })
}).or('addresses', 'transactions').messages({
  'object.missing': 'Either addresses or transactions array must be provided'
});

/**
 * Validate address screening request
 */
export function validateAddressScreeningRequest(data: unknown): ScreeningRequest {
  const { error, value } = addressScreeningSchema.validate(data);
  if (error) {
    throw new ValidationError(`Invalid address screening request: ${error.message}`, {
      details: error.details
    });
  }
  return value;
}

/**
 * Validate transaction screening request
 */
export function validateTransactionScreeningRequest(data: unknown): TransactionScreeningRequest {
  const { error, value } = transactionScreeningSchema.validate(data);
  if (error) {
    throw new ValidationError(`Invalid transaction screening request: ${error.message}`, {
      details: error.details
    });
  }
  return value;
}

/**
 * Validate bulk screening request
 */
export function validateBulkScreeningRequest(data: unknown): BulkScreeningRequest {
  const { error, value } = bulkScreeningSchema.validate(data);
  if (error) {
    throw new ValidationError(`Invalid bulk screening request: ${error.message}`, {
      details: error.details
    });
  }
  return value;
}

/**
 * Validate risk assessment identifier (address or transaction hash)
 */
export function validateRiskIdentifier(identifier: string): { type: 'address' | 'transaction'; value: string } {
  if (isValidBitcoinAddress(identifier)) {
    return { type: 'address', value: identifier };
  }
  if (isValidBitcoinTxHash(identifier)) {
    return { type: 'transaction', value: identifier };
  }
  throw new ValidationError('Invalid identifier: must be a Bitcoin address or transaction hash');
}
