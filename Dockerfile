FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create required directories
RUN mkdir -p logs audit-logs risk-assessments config

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
