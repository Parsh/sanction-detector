#!/bin/bash

# Stop and clean up Docker containers

echo "Stopping Bitcoin Sanction Detection Service..."
docker-compose down

echo "Removing unused Docker resources..."
docker system prune -f

echo "Service stopped successfully."
