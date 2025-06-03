# Multi-stage Docker container configuration for Node.js tutorial application
# Implements containerized deployment with Node.js v22.16.0 LTS Alpine Linux base image
# Optimized build stages for development and production environments with security best practices
# Educational container patterns for Express.js v5.1.0 hello world HTTP server demonstration

# =============================================================================
# BASE STAGE - Common foundation with Node.js runtime and system setup
# =============================================================================
FROM node:22.16.0-alpine AS base

# Set metadata labels for container identification and maintenance
LABEL maintainer="Tutorial Author" \
      version="1.0.0" \
      description="Node.js tutorial application with Express.js v5.1.0 hello world server" \
      nodejs.version="22.16.0" \
      express.version="5.1.0" \
      alpine.version="3.19" \
      stage="base"

# Install system dependencies and security updates using Alpine package manager
# curl: Required for health checks and debugging capabilities
# dumb-init: Proper signal handling for PID 1 in containers
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        curl=8.* \
        dumb-init=1.* && \
    # Remove package cache to reduce image size
    rm -rf /var/cache/apk/* /tmp/*

# Create application directory with proper ownership
# Use standard Node.js application working directory
WORKDIR /usr/src/app

# Configure proper file permissions and ownership for security
# Change ownership of working directory to node user (UID 1000)
RUN chown -R node:node /usr/src/app

# Set environment variables for Node.js optimization and security
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false \
    NODE_OPTIONS="--max-old-space-size=256" \
    PORT=3000

# Switch to non-root node user for security compliance
# All subsequent operations run as node user (UID 1000)
USER node

# =============================================================================
# DEPENDENCIES STAGE - Install Node.js dependencies with caching optimization
# =============================================================================
FROM base AS dependencies

# Set stage-specific metadata
LABEL stage="dependencies"

# Copy package.json and package-lock.json for dependency installation
# Strategic copying order for optimal Docker layer caching
COPY --chown=node:node package*.json ./

# Verify package files ownership and permissions
RUN ls -la package*.json

# Install Node.js dependencies with npm ci for reproducible builds
# npm ci provides faster, reliable, reproducible builds for production
RUN npm ci --only=production --no-audit --no-fund && \
    # Verify dependency installation success
    npm list --depth=0 && \
    # Remove npm cache to reduce image size significantly
    npm cache clean --force

# Verify Express.js v5.1.0 installation for educational demonstration
RUN node -e "console.log('Express.js version:', require('express/package.json').version)"

# Set proper permissions on node_modules directory
RUN chmod -R 755 /usr/src/app/node_modules

# =============================================================================
# APPLICATION STAGE - Copy source code and configure runtime environment
# =============================================================================
FROM dependencies AS application

# Set stage-specific metadata
LABEL stage="application"

# Copy application source code with build context optimization
# Copy only necessary files for minimal build context
COPY --chown=node:node src/backend/server.js ./
COPY --chown=node:node src/backend/app.js ./

# Verify application files ownership and permissions
RUN ls -la *.js && \
    # Test application syntax without starting server
    node -c server.js && \
    node -c app.js

# Expose port 3000 for HTTP server communication
# Documented port exposure for container orchestration
EXPOSE 3000

# Configure health check endpoint for container monitoring
# Health check verifies server responsiveness and /hello endpoint functionality
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Configure application startup command with proper signal handling
# Use dumb-init for proper PID 1 signal handling in containers
CMD ["dumb-init", "node", "server.js"]

# =============================================================================
# DEVELOPMENT STAGE - Development tools and debugging capabilities
# =============================================================================
FROM dependencies AS development

# Set stage-specific metadata and environment
LABEL stage="development"
ENV NODE_ENV=development \
    LOG_LEVEL=debug

# Install development dependencies including Jest and Supertest
# Switch temporarily to install devDependencies
USER root
COPY --chown=node:node package*.json ./
USER node

# Install both production and development dependencies for development stage
RUN npm ci --include=dev --no-audit --no-fund && \
    # Verify development dependencies installation
    npm list jest supertest --depth=0 && \
    # Clean npm cache
    npm cache clean --force

# Copy all source files for development workflow
COPY --chown=node:node src/backend/ ./
COPY --chown=node:node test/ ./test/

# Set development-specific configurations
ENV NPM_CONFIG_LOGLEVEL=info \
    NPM_CONFIG_COLOR=true

# Override health check for development environment
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=2 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Development startup command with automatic restart capabilities
# Enable development features and debugging
CMD ["dumb-init", "node", "--inspect=0.0.0.0:9229", "server.js"]

# =============================================================================
# PRODUCTION STAGE - Optimized production build with security hardening
# =============================================================================
FROM application AS production

# Set stage-specific metadata
LABEL stage="production"

# Production environment configuration
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    NPM_CONFIG_LOGLEVEL=error

# Remove development tools and packages not needed in production
# Clean up any development artifacts
RUN rm -rf /tmp/* /var/tmp/*

# Configure production-optimized health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Security hardening - ensure read-only application files
RUN chmod -R 444 *.js

# Production startup command optimized for performance
# Use dumb-init for proper signal handling and graceful shutdown
CMD ["dumb-init", "node", "server.js"]

# =============================================================================
# BUILD OPTIMIZATION NOTES FOR EDUCATIONAL PURPOSES
# =============================================================================
# Layer Caching Strategy:
# 1. Base system packages (changes rarely)
# 2. Package.json files (changes when dependencies update)
# 3. npm install (benefits from package.json caching)
# 4. Application source code (changes frequently during development)
#
# Multi-stage Benefits:
# - Development stage: ~150-200MB with dev dependencies and debugging tools
# - Production stage: ~80-120MB optimized for deployment
# - Common base stage reduces duplication and build time
#
# Security Features:
# - Non-root user execution (node user UID 1000)
# - Minimal Alpine Linux base image with security updates
# - No sensitive information in environment variables
# - Proper file permissions and ownership
# - Framework fingerprinting prevention through Express.js configuration
#
# Build Commands:
# Development: docker build --target development -t nodejs-tutorial:dev .
# Production:  docker build --target production -t nodejs-tutorial:prod .
# Testing:     docker build --target development -t nodejs-tutorial:test .
#
# Run Commands:
# Development: docker run -p 3000:3000 -v $(pwd)/src/backend:/usr/src/app nodejs-tutorial:dev
# Production:  docker run -p 3000:3000 nodejs-tutorial:prod
# Testing:     docker run --rm nodejs-tutorial:test npm test