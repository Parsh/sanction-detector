# 🛡️ Bitcoin Sanction Detection Microservice

## Project Overview

This repository contains a production-ready Bitcoin sanction detection microservice built with TypeScript, Node.js, and Express. The service provides real-time screening of Bitcoin addresses and transactions against official OFAC cryptocurrency sanctions data.

## 🎯 Project Goals

- **Compliance**: Enable cryptocurrency businesses to comply with OFAC sanctions
- **Real-time**: Provide sub-second response times for screening requests
- **Scalability**: Design for high-throughput screening operations
- **Accuracy**: Minimize false positives while ensuring comprehensive coverage
- **Developer Experience**: Offer comprehensive API documentation and easy integration

## 🏗️ Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Client Apps       │    │   Load Balancer     │    │   Monitoring        │
│                     │    │                     │    │                     │
│ • Web Apps          │    │ • NGINX/HAProxy     │    │ • Health Checks     │
│ • Mobile Apps       │    │ • SSL Termination   │    │ • Metrics           │
│ • Trading Platforms │    │ • Rate Limiting     │    │ • Alerting          │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           │                           │                           │
           └─────────────┐             │             ┌─────────────┘
                         │             │             │
                         ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Bitcoin Sanction Detection API                          │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Screening     │  │      Risk       │  │     Health      │            │
│  │   Endpoints     │  │   Assessment    │  │   Monitoring    │            │
│  │                 │  │                 │  │                 │            │
│  │ • Single        │  │ • Risk Scoring  │  │ • Readiness     │            │
│  │ • Bulk          │  │ • Statistics    │  │ • Liveness      │            │
│  │ • Transaction   │  │ • History       │  │ • Metrics       │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Core Services Layer                            │   │
│  │                                                                     │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │   │
│  │  │   Sanctions   │  │   Address     │  │     Audit     │          │   │
│  │  │   Data        │  │   Screening   │  │   Logging     │          │   │
│  │  │   Service     │  │   Service     │  │   Service     │          │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Data Storage Layer                             │   │
│  │                                                                     │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │   │
│  │  │     OFAC      │  │     Risk      │  │     Audit     │          │   │
│  │  │  Crypto Data  │  │  Assessments  │  │     Logs      │          │   │
│  │  │     (JSON)    │  │     (JSON)    │  │     (JSON)    │          │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Key Metrics & Performance

### Response Times
- **Single Address Screening**: < 10ms average
- **Bulk Screening (100 addresses)**: < 500ms average
- **Risk Assessment**: < 15ms average

### Data Coverage
- **OFAC Cryptocurrency Addresses**: 341 addresses
- **Supported Cryptocurrencies**: 9 types (Bitcoin, Ethereum, etc.)
- **Data Freshness**: Updated with each OFAC release

### Availability
- **Target Uptime**: 99.9%
- **Health Check Interval**: 30 seconds
- **Graceful Shutdown**: Signal handling for zero-downtime deployments

## 🔧 Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+ (LTS)
- **Language**: TypeScript 5+ with strict type checking
- **Framework**: Express.js with security middleware
- **API Documentation**: OpenAPI 3.0 with Swagger UI

### Security & Middleware
- **Helmet**: Security headers and protections
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive Bitcoin address validation

### Development & Operations
- **Build System**: TypeScript compiler with source maps
- **Testing**: Jest with coverage reporting
- **Linting**: ESLint with TypeScript rules
- **Containerization**: Docker with multi-stage builds
- **CI/CD**: GitHub Actions with automated testing

## 📁 Project Structure

```
bitcoin-sanction-detector/
├── 📁 src/                          # Source code
│   ├── 📁 services/                 # Business logic services
│   ├── 📁 routes/                   # API route handlers
│   ├── 📁 utils/                    # Utility functions
│   ├── 📁 docs/                     # API documentation
│   ├── 📄 types.ts                  # TypeScript definitions
│   ├── 📄 config.ts                 # Configuration management
│   └── 📄 index.ts                  # Application entry point
├── 📁 data/                         # Data storage
│   └── 📁 sanctions/                # Sanctions data files
├── 📁 scripts/                      # Utility scripts
├── 📁 .github/                      # GitHub configuration
│   ├── 📁 workflows/                # CI/CD pipelines
│   └── 📁 ISSUE_TEMPLATE/           # Issue templates
├── 🐳 Dockerfile                    # Container configuration
├── 🐳 docker-compose.yml            # Multi-service orchestration
├── 📄 package.json                  # Dependencies and scripts
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 jest.config.js                # Test configuration
└── 📄 README.md                     # Project documentation
```

## 🚀 Getting Started

### Quick Start (5 minutes)
```bash
# Clone and start with Docker
git clone https://github.com/your-username/bitcoin-sanction-detector.git
cd bitcoin-sanction-detector
npm run docker:run

# Test the API
curl http://localhost:3000/api/health
```

### Development Setup
```bash
# Local development environment
npm install
npm run dev

# Access interactive documentation
open http://localhost:3000/api-docs
```

## 🔍 Use Cases

### 1. Cryptocurrency Exchanges
- Screen incoming deposits for sanctions compliance
- Batch process user wallets during onboarding
- Monitor high-risk transactions in real-time

### 2. Financial Institutions
- Due diligence for cryptocurrency-related services
- Compliance reporting and audit trails
- Risk assessment for digital asset exposures

### 3. Regulatory Technology
- Integration with existing compliance systems
- Automated sanctions screening workflows
- Real-time monitoring and alerting

### 4. Research & Academia
- Analysis of cryptocurrency sanctions effectiveness
- Study of blockchain address clustering
- Compliance methodology research

## 🛣️ Roadmap

### Phase 1: Core Functionality ✅
- [x] Basic address screening
- [x] OFAC data integration
- [x] REST API with documentation
- [x] Docker deployment

### Phase 2: Enhanced Features 🚧
- [ ] Transaction graph analysis
- [ ] Machine learning risk factors
- [ ] Comprehensive test suite
- [ ] Performance optimizations

### Phase 3: Advanced Capabilities 📋
- [ ] Multi-blockchain support
- [ ] Real-time data updates
- [ ] Advanced analytics dashboard
- [ ] Enterprise integrations

### Phase 4: Scale & Performance 📋
- [ ] Microservices architecture
- [ ] Database integration
- [ ] Caching strategies
- [ ] High availability setup

## 🤝 Community & Support

### Contributing
We welcome contributions from the community! See our [Contributing Guide](CONTRIBUTING.md) for details on:
- Code style and standards
- Development workflow
- Testing requirements
- Documentation guidelines

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community discussions
- **Documentation**: Comprehensive API documentation
- **Email**: Direct contact for security issues

### Community Guidelines
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow our code of conduct

## 📜 License & Legal

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**⚠️ Important Disclaimers:**
- This tool is for educational and compliance purposes
- Always consult with legal experts for regulatory requirements
- Sanctions laws vary by jurisdiction
- Users are responsible for compliance with applicable laws

**🏛️ Institutional Affiliation:**
Developed at ENITS IT Security Lab as part of cryptocurrency compliance research.

---

**🌟 Star this repository if you find it useful!**
**🐛 Report issues to help us improve**
**🤝 Contribute to make it even better**
