#!/bin/bash

# Build and run the Bitcoin Sanction Detection Service

echo "Building Docker image..."
docker build -t bitcoin-sanction-detector .

echo "Starting service with Docker Compose..."
docker-compose up -d

echo "Service is starting up..."
echo "API will be available at: http://localhost:3000"
echo "Health check: http://localhost:3000/api/health"

echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
