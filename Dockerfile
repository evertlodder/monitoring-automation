# Use Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies (including devDeps needed for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S fontana && \
    adduser -S fontana -u 1001

USER fontana

# Default command: start hourly scraper
# Can be overridden in docker-compose or via command line
CMD ["node", "dist/scheduler/hourly-scraper.js"]
