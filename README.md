# 🛡️ Bitcoin Sanction Detection Microservice

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![API](https://img.shields.io/badge/API-OpenAPI%203.0-orange.svg)](https://swagger.io/specification/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A high-performance TypeScript/Node.js microservice for real-time Bitcoin address and transaction screening against international sanctions lists. Built with production-ready features including comprehensive API documentation, Docker deployment, and robust security measures.

## 🌟 Key Features

### 🎯 **Core Functionality**
- **Real-time Address Screening** - Screen Bitcoin addresses against OFAC cryptocurrency sanctions
- **Transaction Analysis** - Analyze Bitcoin transactions for sanctions exposure
- **Bulk Processing** - Efficient batch screening for multiple addresses/transactions
- **Risk Assessment** - Intelligent risk scoring with confidence metrics

### 🔒 **Security & Compliance**
- **OFAC SDN Integration** - Real cryptocurrency addresses from official OFAC data
- **Audit Logging** - Complete compliance trail with correlation tracking
- **Input Validation** - Comprehensive Bitcoin address/transaction validation
- **Secure Headers** - Production-ready security middleware

### 🚀 **Developer Experience**
- **Interactive API Docs** - Complete Swagger/OpenAPI 3.0 documentation
- **Docker Ready** - Single-command deployment with Docker Compose
- **TypeScript** - Full type safety with comprehensive error handling
- **Health Monitoring** - Built-in health checks and readiness probes

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage Examples](#-usage-examples)
- [Docker Deployment](#-docker-deployment)
- [Data Sources](#-data-sources)
- [API Reference](#-api-reference)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
# Clone the repository
git clone https://github.com/your-username/bitcoin-sanction-detector.git
cd bitcoin-sanction-detector

# Start with Docker Compose
npm run docker:run

# Access the API
curl http://localhost:3000/api/health
```

### Option 2: Local Development
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# Or start in development mode with hot reload
npm run dev
```

The API will be available at `http://localhost:3000` with interactive documentation at `http://localhost:3000/api-docs`.

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **OpenAPI JSON**: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

### Quick API Test
```bash
# Health check
curl http://localhost:3000/api/health

# Screen a Bitcoin address
curl -X POST http://localhost:3000/api/screening/address \
  -H "Content-Type: application/json" \
  -d '{"address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"}'
```

## 💻 Installation

### Prerequisites
- **Node.js** 18+ and npm
- **Docker** (optional, for containerized deployment)
- **Git** for version control

### Local Setup
```bash
# Clone the repository
git clone https://github.com/your-username/bitcoin-sanction-detector.git
cd bitcoin-sanction-detector

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Build the TypeScript project
npm run build

# Start the service
npm start
```

## ⚙️ Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# API Configuration
ALLOWED_ORIGINS=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Data Configuration
DATA_DIR=./data
SANCTIONS_DIR=./data/sanctions
```

### Configuration Options
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins |
| `DATA_DIR` | `./data` | Data storage directory |

## 📖 Usage Examples

### 1. Screen a Single Bitcoin Address
```javascript
const response = await fetch('http://localhost:3000/api/screening/address', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
  })
});

const result = await response.json();
console.log('Risk Score:', result.data.riskScore);
console.log('Sanction Matches:', result.data.sanctionMatches);
```

### 2. Bulk Screening
```javascript
const response = await fetch('http://localhost:3000/api/screening/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    addresses: [
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
    ],
    batchId: 'batch_001'
  })
});

const results = await response.json();
console.log('Batch Summary:', results.data.summary);
```

### 3. Risk Assessment
```javascript
const response = await fetch('http://localhost:3000/api/risk/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
const risk = await response.json();

console.log('Risk Level:', risk.data.riskLevel);
console.log('Risk Factors:', risk.data.riskFactors);
```

## 🐳 Docker Deployment

### Quick Start with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build
```bash
# Build the image
docker build -t bitcoin-sanction-detector .

# Run the container
docker run -d \
  --name sanction-detector \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/data:/app/data \
  bitcoin-sanction-detector
```

### Production Deployment
```bash
# Use the provided helper scripts
./scripts/docker-start.sh    # Build and start
./scripts/docker-stop.sh     # Stop and cleanup

# Or use npm scripts
npm run docker:build         # Build image
npm run docker:run           # Start with compose
npm run docker:stop          # Stop services
npm run docker:logs          # View logs
```

## 📊 Data Sources

### OFAC Cryptocurrency Sanctions
- **Source**: Official OFAC Specially Designated Nationals (SDN) List
- **Coverage**: 341 cryptocurrency addresses across 9 cryptocurrencies
- **Format**: Extracted and refined JSON with entity mapping
- **Update Frequency**: Manual updates from official OFAC releases

### Supported Cryptocurrencies
- Bitcoin (BTC)
- Ethereum (ETH)  
- Litecoin (LTC)
- Bitcoin Cash (BCH)
- Monero (XMR)
- Zcash (ZEC)
- Dash (DASH)
- And more...

### Data Processing Pipeline
```bash
# Extract crypto addresses from OFAC SDN CSV
npm run extract-sdn-crypto

# This generates:
# - data/sanctions/refined_data/ofac-crypto-complete.json
# - data/sanctions/refined_data/ofac-crypto-addresses.json
```

## 🔌 API Reference

### Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/health/ready` | Readiness check |
| `POST` | `/api/screening/address` | Screen single address |
| `POST` | `/api/screening/transaction` | Screen transaction |
| `POST` | `/api/screening/bulk` | Bulk screening |
| `GET` | `/api/risk/{identifier}` | Risk assessment |
| `GET` | `/api/risk/stats/summary` | Risk statistics |

### Response Format
All API responses follow a consistent structure:

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
  "correlationId": "b3fc39a5-32f4-49e7-8861-f2f0e258e777"
}
```

### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid Bitcoin address format",
    "details": {
      "field": "address",
      "value": "invalid_address"
    }
  },
  "timestamp": "2025-06-30T19:12:07.852Z",
  "correlationId": "error-correlation-id"
}
```

## 🛠️ Development

### Project Structure
```
src/
├── services/           # Business logic services
│   ├── sanctionsDataService.ts
│   └── addressScreeningService.ts
├── routes/            # API route handlers
│   ├── screening.ts
│   ├── health.ts
│   └── risk.ts
├── utils/             # Utility functions
│   ├── validation.ts
│   ├── logger.ts
│   └── fileUtils.ts
├── docs/              # API documentation
│   └── swagger.ts
├── types.ts           # TypeScript type definitions
├── config.ts          # Configuration management
└── index.ts           # Application entry point
```

### Available Scripts
```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Docker Operations
npm run docker:build     # Build Docker image
npm run docker:run       # Start with Docker Compose
npm run docker:stop      # Stop Docker services
npm run docker:logs      # View container logs

# Data Processing
npm run extract-sdn-crypto  # Extract OFAC crypto data
```

### Adding New Features
1. **Services**: Add business logic in `src/services/`
2. **Routes**: Add API endpoints in `src/routes/`
3. **Documentation**: Add Swagger annotations for new endpoints
4. **Types**: Update `src/types.ts` for new data structures
5. **Tests**: Add tests in appropriate `__tests__/` directories

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add comprehensive error handling
- Include Swagger documentation for new endpoints
- Write tests for new functionality
- Follow the existing code style and patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Documentation**: [API Docs](http://localhost:3000/api-docs)
- **Issues**: [GitHub Issues](https://github.com/your-username/bitcoin-sanction-detector/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/bitcoin-sanction-detector/discussions)

## 🔗 Related Projects

- [OFAC SDN List](https://www.treasury.gov/ofac/downloads/sdnlist.txt) - Official sanctions data
- [Bitcoin Address Validation](https://github.com/bitcoinjs/bitcoinjs-lib) - Bitcoin utilities
- [Blockchain APIs](https://mempool.space/docs/api) - Blockchain data sources

---

**⚠️ Disclaimer**: This tool is for educational and compliance purposes. Always consult with legal experts for regulatory compliance requirements.

**🏛️ Institution**: Developed at ENITS IT Security Lab
- [ ] Performance optimization

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd sanction-detector

# Install dependencies
npm install

# Build the application
npm run build

# Start the service
npm start
```

The service will start on port 3000 (configurable via PORT environment variable).

## 🔧 Configuration

Configuration is handled through environment variables. Copy `.env.example` to `.env` and customize:

```bash
PORT=3000
LOG_LEVEL=info
DATA_DIR=./data
DEFAULT_MAX_HOPS=5
RISK_CACHE_TTL_HOURS=24
```

## 📡 API Endpoints

### Address Screening
```bash
# Screen a single Bitcoin address
POST /api/screening/address
{
  "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "includeTransactionAnalysis": false,
  "maxHops": 5
}
```

### Bulk Screening
```bash
# Screen multiple addresses
POST /api/screening/bulk
{
  "addresses": [
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"
  ]
}
```

### Risk Assessment
```bash
# Get risk assessment for an address
GET /api/risk/{address}
```

### Health Checks
```bash
# Health check
GET /api/health

# Readiness check
GET /api/health/ready
```

## 🏁 Testing

```bash
# Test with a sanctioned address (from sample data)
curl -X POST "http://localhost:3000/api/screening/address" \
  -H "Content-Type: application/json" \
  -d '{"address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"}'

# Expected response: HIGH risk level with OFAC sanction match
```

## 📁 Data Structure

The application uses a structured data directory:

```
data/
├── sanctions/
│   ├── ofac.json          # OFAC sanctions list
│   ├── eu.json            # EU sanctions list
│   └── un.json            # UN sanctions list
├── risk-assessments/      # Risk assessment cache
├── audit-logs/           # Daily audit logs
└── config/              # Configuration files
```

## 🛡️ Security Features

- **Input Validation**: Comprehensive validation of Bitcoin addresses and transaction hashes
- **Security Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable CORS policy
- **Request Logging**: Complete audit trail with correlation IDs
- **Error Handling**: Structured error responses without sensitive data leakage

## 🎯 Risk Assessment Algorithm

The system calculates risk scores based on multiple factors:

- **Direct Sanction Match** (0-40 points): Exact address match in sanctions lists
- **Indirect Exposure** (0-25 points): Transaction path analysis (future feature)
- **Transaction Patterns** (0-20 points): Behavioral analysis (future feature)
- **Geographical Risk** (0-10 points): Location-based risk (future feature)
- **Temporal Factors** (0-5 points): Time-based patterns (future feature)

### Risk Levels
- **LOW** (0-25): Standard processing
- **MEDIUM** (26-50): Enhanced monitoring required
- **HIGH** (51-75): Manual review required  
- **CRITICAL** (76-100): Auto-rejection/quarantine

## 📝 Sample Data

The application includes sample sanctions data for testing:

- **OFAC**: 2 active entities with Bitcoin addresses
- **EU**: 2 active entities with Bitcoin addresses  
- **UN**: 1 active entity with Bitcoin addresses

## 🔄 Development

```bash
# Development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run type-check
```

## 📊 Monitoring

The application provides comprehensive logging and monitoring:

- **Structured Logging**: JSON formatted logs with correlation IDs
- **Performance Metrics**: Processing time tracking for all operations
- **Health Endpoints**: Application health and readiness checks
- **Audit Trail**: Complete request/response logging in daily files

## 🐳 Deployment

The application is designed for containerized deployment:

```dockerfile
# Simple Docker deployment
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔮 Future Enhancements

1. **Transaction Analysis**: Multi-hop Bitcoin transaction path analysis
2. **Machine Learning**: Pattern recognition for advanced risk assessment
3. **Multi-Currency**: Support for Ethereum, privacy coins
4. **Real-time Updates**: Live sanctions list synchronization
5. **Advanced Caching**: Redis integration for performance
6. **Database Migration**: MongoDB integration for scalability

## 📚 Architecture

For detailed system architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

**Academic Project**: This microservice is designed as part of a Master's project focused on cryptocurrency sanctions detection using open-source intelligence techniques.
