# Docker Deployment Guide

This guide covers how to build and deploy the Bitcoin Sanction Detection Service using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)

### Installing Docker

#### macOS
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
# Or using Homebrew:
brew install --cask docker
```

#### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

## Quick Start

### Option 1: Using Docker Compose (Recommended)
```bash
# Build and start the service
npm run docker:run

# View logs
npm run docker:logs

# Stop the service
npm run docker:stop
```

### Option 2: Using Helper Scripts
```bash
# Start everything
./scripts/docker-start.sh

# Stop and clean up
./scripts/docker-stop.sh
```

### Option 3: Manual Docker Commands
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

# Stop the container
docker stop sanction-detector
docker rm sanction-detector
```

## Configuration

### Environment Variables
The service supports the following environment variables:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Port to run on (default: 3000)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)

### Volume Mounts
- `./logs:/app/logs` - Persist application logs
- `./data:/app/data` - Mount sanctions data directory

## Health Checks

The container includes built-in health checks:
- **Endpoint**: `http://localhost:3000/api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## Monitoring

### View Service Status
```bash
# Check if service is running
docker-compose ps

# View real-time logs
docker-compose logs -f bitcoin-sanction-detector

# Check health status
curl http://localhost:3000/api/health
```

### Container Stats
```bash
# View resource usage
docker stats sanction-detector-api

# Inspect container details
docker inspect sanction-detector-api
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Or change the port in docker-compose.yml
   ports:
     - "3001:3000"  # Use port 3001 instead
   ```

2. **Permission denied for volume mounts**
   ```bash
   # Ensure directories exist and have correct permissions
   mkdir -p logs data
   chmod 755 logs data
   ```

3. **Build failures**
   ```bash
   # Clean Docker cache and rebuild
   docker system prune -f
   docker build --no-cache -t bitcoin-sanction-detector .
   ```

4. **Memory issues**
   ```bash
   # Increase Docker memory limit in Docker Desktop settings
   # Or check container memory usage
   docker stats --no-stream
   ```

## Production Deployment

### Security Considerations
- The container runs as a non-root user
- Only necessary ports are exposed
- Sensitive data should be mounted as volumes, not copied into the image
- Use environment variables for configuration

### Scaling
```bash
# Scale to multiple instances
docker-compose up -d --scale bitcoin-sanction-detector=3
```

### Updates
```bash
# Pull latest changes and rebuild
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## API Endpoints

Once running, the following endpoints are available:

- **Health Check**: `GET http://localhost:3000/api/health`
- **Address Screening**: `POST http://localhost:3000/api/screening/check`
- **Batch Screening**: `POST http://localhost:3000/api/screening/batch`
- **Root**: `GET http://localhost:3000/`

## Development

For development with hot reload, you can use:
```bash
# Run development server locally (not in Docker)
npm run dev

# Or mount source code for development in Docker
docker run -d \
  --name sanction-detector-dev \
  -p 3000:3000 \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/logs:/app/logs \
  bitcoin-sanction-detector \
  npm run dev
```
