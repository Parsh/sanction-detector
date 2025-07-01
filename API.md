# 📋 API Documentation

Complete API reference for the Bitcoin Sanction Detection Microservice. This document provides detailed information about all available endpoints, request/response formats, and integration examples.

## 📍 Table of Contents

- [Base Information](#-base-information)
- [Authentication](#-authentication)
- [Response Format](#-response-format)
- [Error Handling](#-error-handling)
- [Endpoints](#-endpoints)
  - [Health & Monitoring](#-health--monitoring)
  - [Address Screening](#-address-screening)
  - [Transaction Screening](#-transaction-screening)
  - [Transaction Path Analysis](#-transaction-path-analysis)
  - [Bulk Screening](#-bulk-screening)
  - [Risk Assessment](#-risk-assessment)
- [Rate Limiting](#-rate-limiting)
- [Examples](#-examples)
- [SDKs & Libraries](#-sdks--libraries)

## 🌐 Base Information

### Base URLs
- **Development**: `http://localhost:3000`
- **Production**: `https://your-api-domain.com`

### API Version
- **Current Version**: `v1`
- **API Prefix**: `/api`

### Content Type
- **Request**: `application/json`
- **Response**: `application/json`

### Interactive Documentation
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json`

### Blockchain Data Integration
- **Provider**: Mempool.space API (@mempool/mempool.js)
- **Real-time Data**: Live Bitcoin blockchain information
- **Transaction Analysis**: Multi-hop transaction path tracing
- **Rate Limiting**: Automatic handling of external API limits
- **Caching**: 30-minute cache for performance optimization

## 🔐 Authentication

Currently, the API does not require authentication. For production deployments, consider implementing:
- API Key authentication
- JWT tokens
- OAuth 2.0

### Request Headers
```http
Content-Type: application/json
X-Correlation-ID: uuid (optional)
User-Agent: YourApp/1.0.0 (optional)
```

## 📊 Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data specific to the endpoint
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "b3fc39a5-32f4-49e7-8861-f2f0e258e777"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context (optional)
    }
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "error-correlation-id"
}
```

## ⚠️ Error Handling

### HTTP Status Codes
| Code | Description | Usage |
|------|-------------|-------|
| `200` | OK | Request successful |
| `400` | Bad Request | Invalid input data |
| `404` | Not Found | Resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Service temporarily unavailable |

### Error Codes
| Code | Description | Resolution |
|------|-------------|------------|
| `VALIDATION_ERROR` | Invalid input format | Check request parameters |
| `NOT_FOUND` | Resource not found | Verify endpoint URL |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement backoff strategy |
| `HEALTH_CHECK_FAILED` | Service unhealthy | Check service status |
| `READINESS_CHECK_FAILED` | Service not ready | Wait for service initialization |
| `INTERNAL_SERVER_ERROR` | Server error | Retry with exponential backoff |

## 🔗 Endpoints

### 🏥 Health & Monitoring

#### Get Service Health
Get the current health status of the service.

```http
GET /api/health
```

**Response**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-06-30T19:12:07.852Z",
    "uptime": 1723.45,
    "version": "1.0.0",
    "environment": "development",
    "services": {
      "dataDirectories": {
        "sanctionsDir": true,
        "riskAssessmentsDir": true,
        "auditLogsDir": true,
        "configDir": true
      }
    }
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "health-check-id"
}
```

**Status Values**
- `healthy` - Service is fully operational
- `degraded` - Service is operational but with issues
- `unhealthy` - Service is not operational

#### Check Service Readiness
Check if the service is ready to handle requests.

```http
GET /api/health/ready
```

**Response (Ready)**
```json
{
  "success": true,
  "data": {
    "status": "ready"
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "readiness-check-id"
}
```

**Response (Not Ready)**
```json
{
  "success": false,
  "error": {
    "code": "NOT_READY",
    "message": "Service not ready",
    "details": {
      "missingDirectories": ["/path/to/missing/dir"]
    }
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "readiness-check-id"
}
```

### 🔍 Address Screening

#### Screen Single Bitcoin Address
Screen a Bitcoin address against OFAC cryptocurrency sanctions.

```http
POST /api/screening/address
```

**Request Body**
```json
{
  "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "includeTransactionAnalysis": false,
  "maxHops": 5
}
```

**Parameters**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | ✅ | Bitcoin address to screen |
| `includeTransactionAnalysis` | boolean | ❌ | Include transaction graph analysis (default: false) |
| `maxHops` | integer | ❌ | Maximum hops for analysis (1-10, default: 5) |

**Address Formats Supported**
- Legacy (P2PKH): `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`
- Script Hash (P2SH): `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy`
- Bech32 (P2WPKH/P2WSH): `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`

**Response (Clean Address - Basic)**
```json
{
  "success": true,
  "data": {
    "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "riskScore": 0,
    "riskLevel": "LOW",
    "sanctionMatches": [],
    "timestamp": "2025-06-30T19:12:07.852Z",
    "confidence": 95,
    "processingTimeMs": 3
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "screening-correlation-id"
}
```

**Response (With Transaction Analysis)**
```json
{
  "success": true,
  "data": {
    "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "riskScore": 15,
    "riskLevel": "LOW",
    "sanctionMatches": [],
    "transactionAnalysis": {
      "targetAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "maxHops": 5,
      "totalNodesAnalyzed": 342,
      "sanctionedNodesFound": 1,
      "pathNodes": [
        {
          "address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
          "txid": "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
          "hop": 1,
          "value": 5000000000,
          "timestamp": 1231469665,
          "riskContribution": 0
        },
        {
          "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
          "txid": "6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000",
          "hop": 3,
          "value": 1000000000,
          "timestamp": 1231469665,
          "riskContribution": 15
        }
      ],
      "riskPropagation": 15
    },
    "timestamp": "2025-06-30T19:12:07.852Z",
    "confidence": 85,
    "processingTimeMs": 1247
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "screening-correlation-id"
}
```

**Response (Sanctioned Address)**
```json
{
  "success": true,
  "data": {
    "address": "12QtD5BFwRsdNsAZY76UVE1xyCGNTojH9h",
    "riskScore": 85,
    "riskLevel": "HIGH",
    "sanctionMatches": [
      {
        "listSource": "OFAC",
        "entityName": "YAN, Xiaobing",
        "entityId": "25308",
        "matchType": "DIRECT",
        "confidence": 100,
        "matchedAddress": "12QtD5BFwRsdNsAZY76UVE1xyCGNTojH9h"
      }
    ],
    "timestamp": "2025-06-30T19:12:07.852Z",
    "confidence": 90,
    "processingTimeMs": 5
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "screening-correlation-id"
}
```

**Transaction Analysis Fields**
| Field | Type | Description |
|-------|------|-------------|
| `targetAddress` | string | The address being analyzed |
| `maxHops` | integer | Maximum transaction hops analyzed |
| `totalNodesAnalyzed` | integer | Total addresses/transactions analyzed |
| `sanctionedNodesFound` | integer | Number of sanctioned entities found in path |
| `pathNodes` | array | Array of transaction path nodes |
| `riskPropagation` | integer | Risk score from indirect connections (0-100) |

**Path Node Fields**
| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Address in the transaction path |
| `txid` | string | Transaction ID connecting to this address |
| `hop` | integer | Number of hops from target address |
| `value` | integer | Transaction value in satoshis |
| `timestamp` | integer | Transaction timestamp (Unix) |
| `riskContribution` | integer | Risk contribution from this node (0-100) |

**Risk Levels**
- `LOW` (0-25): Minimal risk
- `MEDIUM` (26-50): Moderate risk
- `HIGH` (51-75): High risk
- `CRITICAL` (76-100): Critical risk

**Match Types**
- `DIRECT`: Exact address match with sanctions list
- `INDIRECT`: Risk identified through transaction path analysis

### 💳 Transaction Screening

#### Screen Bitcoin Transaction
Screen a Bitcoin transaction by analyzing input and output addresses.

```http
POST /api/screening/transaction
```

**Request Body**
```json
{
  "txHash": "3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c",
  "direction": "both",
  "includeMetadata": false
}
```

**Parameters**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `txHash` | string | ✅ | Bitcoin transaction hash (64 hex characters) |
| `direction` | string | ❌ | Analysis direction: "inputs", "outputs", "both" (default: "both") |
| `includeMetadata` | boolean | ❌ | Include transaction metadata (default: false) |

**Response**
```json
{
  "success": true,
  "data": {
    "txHash": "3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c",
    "inputAddresses": [
      {
        "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        "riskScore": 0,
        "riskLevel": "LOW",
        "sanctionMatches": [],
        "confidence": 95,
        "value": 5000000000,
        "sequence": 4294967295
      }
    ],
    "outputAddresses": [
      {
        "address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
        "riskScore": 15,
        "riskLevel": "LOW",
        "sanctionMatches": [],
        "confidence": 90,
        "value": 4999900000
      }
    ],
    "overallRiskScore": 8,
    "riskAssessment": {
      "maxInputRisk": 0,
      "maxOutputRisk": 15,
      "averageRisk": 7.5,
      "totalValue": 4999900000,
      "riskWeightedValue": 749985000
    },
    "metadata": {
      "blockHeight": 170,
      "confirmations": 850234,
      "blockTime": 1231469665,
      "fee": 100000,
      "size": 258,
      "weight": 1032
    },
    "timestamp": "2025-06-30T19:12:07.852Z",
    "processingTimeMs": 156
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "tx-screening-correlation-id"
}
```

**Transaction Screening Fields**
| Field | Type | Description |
|-------|------|-------------|
| `txHash` | string | The transaction hash that was screened |
| `inputAddresses` | array | Screening results for input addresses |
| `outputAddresses` | array | Screening results for output addresses |
| `overallRiskScore` | integer | Aggregated risk score for the transaction (0-100) |
| `riskAssessment` | object | Detailed risk assessment breakdown |
| `metadata` | object | Transaction metadata (if requested) |

**Risk Assessment Fields**
| Field | Type | Description |
|-------|------|-------------|
| `maxInputRisk` | integer | Highest risk score among input addresses |
| `maxOutputRisk` | integer | Highest risk score among output addresses |
| `averageRisk` | number | Average risk across all addresses |
| `totalValue` | integer | Total transaction value in satoshis |
| `riskWeightedValue` | integer | Value weighted by risk scores |

### 🔍 Transaction Path Analysis

The Bitcoin Sanction Detection service provides advanced transaction path analysis that traces connections between addresses through the Bitcoin blockchain. This feature helps identify indirect risks by analyzing multi-hop transaction chains.

#### How Transaction Path Analysis Works

1. **Starting Point**: Analysis begins from a target Bitcoin address
2. **Multi-Hop Tracing**: Follows transaction paths for up to 10 hops (configurable)
3. **Risk Propagation**: Calculates how risk propagates through the transaction graph
4. **Sanctioned Node Detection**: Identifies sanctioned addresses in the transaction path
5. **Risk Scoring**: Assigns risk contributions based on proximity and transaction values

#### Key Features

- **Real-time Analysis**: Uses Mempool.space API for current blockchain data
- **Configurable Depth**: Set maximum hops (1-10) based on analysis requirements
- **Risk Propagation**: Advanced algorithms for calculating indirect risk exposure
- **Performance Optimized**: Caching and concurrent processing for fast results
- **Detailed Insights**: Comprehensive path information with timestamps and values

#### Risk Propagation Algorithm

Risk propagation is calculated using a combination of factors:
- **Hop Distance**: Risk decreases with transaction distance
- **Transaction Value**: Higher value transactions carry more risk weight
- **Temporal Factors**: Recent transactions have higher risk impact
- **Direct Sanctions**: Direct matches contribute maximum risk

**Formula**: `Risk = (DirectRisk × HopDecay × ValueWeight × TimeWeight)`

Where:
- `DirectRisk`: Base risk from sanctioned addresses (0-100)
- `HopDecay`: Exponential decay based on hop distance (0.1^hop)
- `ValueWeight`: Logarithmic scaling based on transaction value
- `TimeWeight`: Decay factor based on transaction age

#### Analysis Output Fields

**TransactionPathAnalysis Object**
```json
{
  "targetAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "maxHops": 5,
  "totalNodesAnalyzed": 342,
  "sanctionedNodesFound": 1,
  "pathNodes": [...],
  "riskPropagation": 15
}
```

**PathNode Object**
```json
{
  "address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
  "txid": "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
  "hop": 1,
  "value": 5000000000,
  "timestamp": 1231469665,
  "riskContribution": 0
}
```

#### Use Cases

- **Enhanced Due Diligence**: Identify indirect exposure to sanctioned entities
- **Risk Assessment**: Comprehensive risk scoring including indirect factors  
- **Compliance Reporting**: Detailed audit trails for regulatory requirements
- **Transaction Monitoring**: Real-time screening with historical context
- **Forensic Analysis**: Investigate complex transaction patterns and relationships

#### Performance Considerations

- **Analysis Time**: Typically 100-2000ms depending on hop depth and network conditions
- **Rate Limiting**: Respects Mempool.space API limits with automatic backoff
- **Caching**: Results cached for 30 minutes to improve performance
- **Concurrent Processing**: Multiple addresses analyzed in parallel where possible

### 📦 Bulk Screening

#### Screen Multiple Addresses/Transactions
Process multiple Bitcoin addresses and transactions in a single request.

```http
POST /api/screening/bulk
```

**Request Body**
```json
{
  "addresses": [
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"
  ],
  "transactions": [
    "3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c"
  ],
  "batchId": "batch_001_20250630",
  "includeTransactionAnalysis": false,
  "maxHops": 5
}
```

**Parameters**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addresses` | array | ❌ | Array of Bitcoin addresses (max: 100) |
| `transactions` | array | ❌ | Array of transaction hashes (max: 50) |
| `batchId` | string | ❌ | Optional batch identifier for tracking |
| `includeTransactionAnalysis` | boolean | ❌ | Include transaction path analysis for addresses (default: false) |
| `maxHops` | integer | ❌ | Maximum hops for transaction analysis (1-10, default: 5) |

**Limits**
- Maximum addresses per request: 100
- Maximum transactions per request: 50
- At least one address or transaction must be provided

**Response**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_001_20250630",
    "summary": {
      "totalProcessed": 3,
      "addressesProcessed": 2,
      "transactionsProcessed": 1,
      "highRiskCount": 0,
      "sanctionMatchesCount": 0,
      "processingTimeMs": 245,
      "transactionAnalysisPerformed": false
    },
    "results": {
      "addresses": [
        {
          "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
          "riskScore": 0,
          "riskLevel": "LOW",
          "sanctionMatches": [],
          "confidence": 95,
          "processingTimeMs": 3
        },
        {
          "address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
          "riskScore": 15,
          "riskLevel": "LOW",
          "sanctionMatches": [],
          "confidence": 90,
          "processingTimeMs": 4
        }
      ],
      "transactions": [
        {
          "txHash": "3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c",
          "overallRiskScore": 8,
          "riskAssessment": {
            "maxInputRisk": 0,
            "maxOutputRisk": 15,
            "averageRisk": 7.5
          },
          "inputAddresses": [
            {
              "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
              "riskScore": 0,
              "riskLevel": "LOW"
            }
          ],
          "outputAddresses": [
            {
              "address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
              "riskScore": 15,
              "riskLevel": "LOW"
            }
          ],
          "processingTimeMs": 238
        }
      ]
    },
    "timestamp": "2025-06-30T19:12:07.852Z"
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "bulk-screening-correlation-id"
}
```

### 📊 Risk Assessment (Coming Soon...)

#### Get Risk Assessment
Retrieve detailed risk assessment for a Bitcoin address or transaction.

```http
GET /api/risk/{identifier}
```

**Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `identifier` | string | Bitcoin address or transaction hash |

**Example Requests**
```http
GET /api/risk/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
GET /api/risk/3e3ba6255653315994b6b84adb7d2a0d9cb7b4eef5c4a86d3c8b1d7e6f4a9b2c
```

**Response**
```json
{
  "success": true,
  "data": {
    "identifier": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "type": "address",
    "riskScore": 15,
    "riskLevel": "LOW",
    "lastAssessment": "2025-06-30T19:12:07.852Z",
    "riskFactors": {
      "directSanctionMatch": 0,
      "indirectExposure": 15,
      "transactionPatterns": 5,
      "geographicalRisk": 10,
      "temporalFactors": 0
    },
    "confidence": 85
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "risk-assessment-correlation-id"
}
```

**Risk Factors Explanation**
- `directSanctionMatch`: Direct match with sanctions lists (0-100)
- `indirectExposure`: Exposure through connected addresses (0-100)
- `transactionPatterns`: Suspicious transaction patterns (0-100)
- `geographicalRisk`: Geographic risk indicators (0-100)
- `temporalFactors`: Time-based risk factors (0-100)

#### Get Risk Statistics
Retrieve aggregated risk statistics for a specified time period.

```http
GET /api/risk/stats/summary?days=7
```

**Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `days` | integer | ❌ | Number of days (1-30, default: 7) |

**Response**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 7,
      "startDate": "2025-06-23T00:00:00.000Z",
      "endDate": "2025-06-30T23:59:59.999Z"
    },
    "assessments": {
      "total": 1250,
      "addresses": 980,
      "transactions": 270
    },
    "riskDistribution": {
      "LOW": 1100,
      "MEDIUM": 120,
      "HIGH": 25,
      "CRITICAL": 5
    },
    "sanctionMatches": {
      "total": 12,
      "direct": 8,
      "indirect": 4
    },
    "trends": {
      "averageRiskScore": 15.5,
      "assessmentsPerDay": 178.6,
      "topRiskFactors": ["transaction_patterns", "geographical_risk"]
    }
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "stats-correlation-id"
}
```

## 🚦 Rate Limiting

### Default Limits
- **Rate Limit**: 100 requests per 15-minute window
- **Burst Limit**: 10 requests per second
- **Bulk Processing**: 100 addresses or 50 transactions per request
- **Transaction Analysis**: Additional rate limiting applies due to blockchain API usage

### Blockchain API Limits
- **Mempool.space Integration**: Respects external API rate limits
- **Automatic Backoff**: Exponential backoff on rate limit hit
- **Request Batching**: Optimized requests to minimize API calls
- **Caching**: 30-minute cache for transaction path analysis

### Enhanced Rate Limits for Transaction Analysis
When `includeTransactionAnalysis=true`:
- **Address Screening**: 20 requests per 15-minute window
- **Bulk Screening**: 10 requests per 15-minute window (max 20 addresses)
- **Processing Time**: 100-2000ms per analysis depending on hop depth

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1656633600
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again later.",
    "details": {
      "limit": 100,
      "windowMs": 900000,
      "retryAfter": 120
    }
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "rate-limit-correlation-id"
}
```

## 📝 Examples

### Example 1: Basic Address Screening

**Request**
```bash
curl -X POST http://localhost:3000/api/screening/address \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: my-request-123" \
  -d '{
    "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
  }'
```

### Example 2: Address Screening with Transaction Analysis

**Request**
```bash
curl -X POST http://localhost:3000/api/screening/address \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: my-request-124" \
  -d '{
    "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "includeTransactionAnalysis": true,
    "maxHops": 3
  }'
```

**JavaScript**
```javascript
const response = await fetch('http://localhost:3000/api/screening/address', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Correlation-ID': 'my-request-124'
  },
  body: JSON.stringify({
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    includeTransactionAnalysis: true,
    maxHops: 3
  })
});

const result = await response.json();

if (result.success) {
  console.log('Risk Level:', result.data.riskLevel);
  console.log('Risk Score:', result.data.riskScore);
  console.log('Sanctions Found:', result.data.sanctionMatches.length);
  
  if (result.data.transactionAnalysis) {
    const analysis = result.data.transactionAnalysis;
    console.log('Transaction Analysis:');
    console.log('- Total Nodes Analyzed:', analysis.totalNodesAnalyzed);
    console.log('- Sanctioned Nodes Found:', analysis.sanctionedNodesFound);
    console.log('- Risk Propagation:', analysis.riskPropagation);
    console.log('- Path Nodes:', analysis.pathNodes.length);
  }
} else {
  console.error('Error:', result.error.message);
}
```

**Python**
```python
import requests

response = requests.post(
    'http://localhost:3000/api/screening/address',
    headers={
        'Content-Type': 'application/json',
        'X-Correlation-ID': 'my-request-123'
    },
    json={
        'address': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
    }
)

result = response.json()

if result['success']:
    print(f"Risk Level: {result['data']['riskLevel']}")
    print(f"Risk Score: {result['data']['riskScore']}")
    print(f"Sanctions Found: {len(result['data']['sanctionMatches'])}")
else:
    print(f"Error: {result['error']['message']}")
```

### Example 3: Transaction Screening

**Request**
```bash
curl -X POST http://localhost:3000/api/screening/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
    "direction": "both",
    "includeMetadata": true
  }'
```

**JavaScript**
```javascript
const txHash = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const response = await fetch('http://localhost:3000/api/screening/transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash,
    direction: 'both',
    includeMetadata: true
  })
});

const result = await response.json();

if (result.success) {
  const tx = result.data;
  console.log(`Transaction ${tx.txHash}:`);
  console.log(`- Overall Risk Score: ${tx.overallRiskScore}`);
  console.log(`- Input Addresses: ${tx.inputAddresses.length}`);
  console.log(`- Output Addresses: ${tx.outputAddresses.length}`);
  console.log(`- Max Input Risk: ${tx.riskAssessment.maxInputRisk}`);
  console.log(`- Max Output Risk: ${tx.riskAssessment.maxOutputRisk}`);
  
  if (tx.metadata) {
    console.log(`- Block Height: ${tx.metadata.blockHeight}`);
    console.log(`- Confirmations: ${tx.metadata.confirmations}`);
    console.log(`- Fee: ${tx.metadata.fee} satoshis`);
  }
}
```

### Example 4: Bulk Screening

**Request**
```bash
curl -X POST http://localhost:3000/api/screening/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"
    ],
    "batchId": "daily_screening_001"
  }'
```

**JavaScript**
```javascript
const addresses = [
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
];

const response = await fetch('http://localhost:3000/api/screening/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    addresses,
    batchId: `batch_${Date.now()}`
  })
});

const result = await response.json();

if (result.success) {
  const { summary, results } = result.data;
  console.log(`Processed ${summary.totalProcessed} items`);
  console.log(`High risk items: ${summary.highRiskCount}`);
  
  // Process results
  results.addresses.forEach(addr => {
    console.log(`${addr.address}: ${addr.riskLevel} (${addr.riskScore})`);
  });
}
```

### Example 5: Risk Assessment

**Request**
```bash
curl http://localhost:3000/api/risk/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
```

**JavaScript**
```javascript
const identifier = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const response = await fetch(`http://localhost:3000/api/risk/${identifier}`);
const result = await response.json();

if (result.success) {
  const risk = result.data;
  console.log(`Risk Assessment for ${risk.identifier}:`);
  console.log(`- Type: ${risk.type}`);
  console.log(`- Risk Level: ${risk.riskLevel} (${risk.riskScore}/100)`);
  console.log(`- Confidence: ${risk.confidence}%`);
  console.log('- Risk Factors:');
  Object.entries(risk.riskFactors).forEach(([factor, score]) => {
    console.log(`  - ${factor}: ${score}`);
  });
}
```

### Example 6: Error Handling

**JavaScript with Error Handling**
```javascript
async function screenAddressWithRetry(address, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('http://localhost:3000/api/screening/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error?.message || 'Unknown error'}`);
      }

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    } catch (error) {
      lastError = error;
      
      // Don't retry validation errors
      if (error.message.includes('VALIDATION_ERROR')) {
        throw error;
      }
      
      // Don't retry rate limit errors immediately
      if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Retry server errors
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Linear backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  throw lastError;
}

// Usage
try {
  const result = await screenAddressWithRetry('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  console.log('Screening result:', result);
} catch (error) {
  console.error('Screening failed after retries:', error.message);
}
```

## 📚 SDKs & Libraries

### Official JavaScript/TypeScript SDK
A complete SDK is available in the [INTEGRATION.md](INTEGRATION.md) file, including:
- **SanctionDetectorClient** class
- **React hooks** for easy integration
- **Vue.js components**
- **Error handling** utilities
- **Rate limiting** management

### Community Libraries
- Python SDK: *Coming soon*
- Go SDK: *Coming soon*
- PHP SDK: *Coming soon*

## 🔧 Testing

### Test Addresses
Use these addresses for testing different scenarios:

**Clean Address (Low Risk) - Bitcoin Genesis Address**
```
1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
```
*This is Satoshi's genesis address with rich transaction history for testing path analysis.*

**Modern Address for Testing**
```
bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
```
*Bech32 format address for testing different address types.*

**Sanctioned Address** (if available in OFAC data)
```
Check your current OFAC crypto data for real sanctioned addresses
```

### Test Transactions
Use these transaction hashes for transaction screening tests:

**Bitcoin Genesis Transaction**
```
4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b
```

**First Bitcoin Transaction**
```
f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16
```

### Testing Transaction Analysis
For comprehensive testing of transaction path analysis:

```bash
# Test with transaction analysis enabled
curl -X POST http://localhost:3000/api/screening/address \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "includeTransactionAnalysis": true,
    "maxHops": 2
  }'
```

### Health Check
Always verify service availability before making requests:
```bash
curl http://localhost:3000/api/health
```

## 📖 Additional Resources

- **Interactive Documentation**: [Swagger UI](http://localhost:3000/api-docs)
- **Integration Guide**: [INTEGRATION.md](INTEGRATION.md)
- **GitHub Repository**: [bitcoin-sanction-detector](https://github.com/your-username/bitcoin-sanction-detector)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-username/bitcoin-sanction-detector/issues)

---

**📞 Support**: For API support, please create an issue on GitHub or refer to the integration guide.

**⚖️ Legal**: This API is for compliance and educational purposes. Consult legal experts for regulatory requirements.
