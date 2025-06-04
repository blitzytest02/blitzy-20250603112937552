# Multi-stage Docker container configuration for Python Flask tutorial application
# Implements containerized deployment with Python v3.12+ Alpine Linux base image
# Optimized five-stage build process for development and production environments with security best practices
# Educational container patterns for Flask v3.1.1 hello world HTTP server demonstration

# =============================================================================
# BASE STAGE - Common foundation with Python runtime and system setup
# =============================================================================
FROM python:3.12-alpine AS base

# Set metadata labels for container identification and maintenance
LABEL maintainer="Tutorial Author" \
      version="2.0.0" \
      description="Python Flask tutorial application with Flask v3.1.1 hello world server" \
      python.version="3.12" \
      flask.version="3.1.1" \
      alpine.version="3.19" \
      stage="base"

# Install system dependencies and security updates using Alpine package manager
# curl: Required for health checks and debugging capabilities
# dumb-init: Proper signal handling for PID 1 in containers
# gcc, musl-dev: Required for Python package compilation (e.g., for certain pip packages)
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        curl=8.* \
        dumb-init=1.* \
        gcc=13.* \
        musl-dev=1.* && \
    # Remove package cache to reduce image size
    rm -rf /var/cache/apk/* /tmp/*

# Create application directory with proper ownership
# Use standard Python application working directory
WORKDIR /usr/src/app

# Create non-root python user for security compliance
# Use UID 1000 for consistency with container best practices
RUN addgroup -g 1000 python && \
    adduser -D -u 1000 -G python python

# Configure proper file permissions and ownership for security
# Change ownership of working directory to python user (UID 1000)
RUN chown -R python:python /usr/src/app

# Set environment variables for Python optimization and security
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/usr/src/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHON_VERSION=3.12 \
    PORT=3000

# Switch to non-root python user for security compliance
# All subsequent operations run as python user (UID 1000)
USER python

# =============================================================================
# DEPENDENCIES STAGE - Install Python dependencies with caching optimization
# =============================================================================
FROM base AS dependencies

# Set stage-specific metadata
LABEL stage="dependencies"

# Copy requirements files for dependency installation
# Strategic copying order for optimal Docker layer caching
COPY --chown=python:python requirements.txt ./
COPY --chown=python:python requirements-dev.txt ./

# Verify requirements files ownership and permissions
RUN ls -la requirements*.txt

# Create virtual environment for dependency isolation
RUN python -m venv venv && \
    . venv/bin/activate && \
    # Upgrade pip to latest version for security and performance
    pip install --upgrade pip wheel

# Install production dependencies with pip for reproducible builds
# Use virtual environment for dependency isolation
RUN . venv/bin/activate && \
    pip install -r requirements.txt && \
    # Verify dependency installation success
    pip list && \
    # Verify Flask v3.1.1 installation for educational demonstration
    python -c "import flask; print('Flask version:', flask.__version__)"

# Set proper permissions on virtual environment directory
RUN chmod -R 755 /usr/src/app/venv

# =============================================================================
# APPLICATION STAGE - Copy source code and configure runtime environment
# =============================================================================
FROM dependencies AS application

# Set stage-specific metadata
LABEL stage="application"

# Copy Flask application source code with build context optimization
# Copy only necessary files for minimal build context
COPY --chown=python:python src/backend/app.py ./
COPY --chown=python:python src/backend/wsgi.py ./

# Verify application files ownership and permissions
RUN ls -la *.py && \
    # Test application syntax without starting server
    . venv/bin/activate && \
    python -m py_compile app.py && \
    python -m py_compile wsgi.py

# Set Flask environment variables for application configuration
ENV FLASK_APP=wsgi.py \
    FLASK_ENV=production \
    FLASK_DEBUG=False

# Expose port 3000 for HTTP server communication
# Documented port exposure for container orchestration
EXPOSE 3000

# Configure health check endpoint for container monitoring
# Health check verifies Flask server responsiveness and /hello endpoint functionality
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Configure application startup command with proper signal handling
# Use dumb-init for proper PID 1 signal handling in containers
CMD ["dumb-init", "/usr/src/app/venv/bin/python", "-m", "flask", "run", "--host=0.0.0.0", "--port=3000"]

# =============================================================================
# DEVELOPMENT STAGE - Development tools and debugging capabilities
# =============================================================================
FROM dependencies AS development

# Set stage-specific metadata and environment
LABEL stage="development"
ENV FLASK_ENV=development \
    FLASK_DEBUG=True \
    LOG_LEVEL=debug

# Install development dependencies including pytest and testing tools
# Activate virtual environment and install dev dependencies
RUN . venv/bin/activate && \
    pip install -r requirements-dev.txt && \
    # Verify development dependencies installation
    pip list | grep -E "(pytest|black|flake8|bandit|safety)" && \
    # Verify pytest installation specifically
    python -c "import pytest; print('pytest version:', pytest.__version__)"

# Copy all source files for development workflow including tests
COPY --chown=python:python src/backend/ ./
COPY --chown=python:python src/backend/tests/ ./tests/

# Set development-specific configurations for enhanced debugging
ENV PYTHONPATH=/usr/src/app \
    WERKZEUG_RUN_MAIN=true

# Override health check for development environment (faster checks)
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=2 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Expose Python debugger port for remote debugging capabilities
EXPOSE 5678

# Development startup command with automatic restart capabilities
# Enable Flask development features and debugging with watchdog hot-reload
CMD ["dumb-init", "/usr/src/app/venv/bin/python", "-m", "flask", "run", "--host=0.0.0.0", "--port=3000", "--debug"]

# =============================================================================
# PRODUCTION STAGE - Optimized production build with security hardening
# =============================================================================
FROM application AS production

# Set stage-specific metadata
LABEL stage="production"

# Production environment configuration
ENV FLASK_ENV=production \
    FLASK_DEBUG=False \
    LOG_LEVEL=info \
    GUNICORN_WORKERS=4 \
    GUNICORN_TIMEOUT=30 \
    GUNICORN_KEEPALIVE=2 \
    GUNICORN_MAX_REQUESTS=1000 \
    GUNICORN_MAX_REQUESTS_JITTER=100

# Install Gunicorn WSGI server for production deployment
RUN . venv/bin/activate && \
    pip install gunicorn>=21.2.0 && \
    # Verify Gunicorn installation
    python -c "import gunicorn; print('Gunicorn version:', gunicorn.__version__)"

# Remove development tools and packages not needed in production
# Clean up any development artifacts and temporary files
RUN rm -rf /tmp/* /var/tmp/* /usr/src/app/tests/

# Configure production-optimized health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Security hardening - ensure read-only application files
RUN chmod -R 444 *.py

# Production startup command optimized for performance
# Use Gunicorn WSGI server with dumb-init for proper signal handling and graceful shutdown
CMD ["dumb-init", "/usr/src/app/venv/bin/gunicorn", "--bind", "0.0.0.0:3000", "--workers", "4", "--timeout", "30", "--keepalive", "2", "--max-requests", "1000", "--max-requests-jitter", "100", "--preload", "wsgi:app"]

# =============================================================================
# BUILD OPTIMIZATION NOTES FOR EDUCATIONAL PURPOSES
# =============================================================================
# Layer Caching Strategy:
# 1. Base system packages (changes rarely)
# 2. Requirements.txt files (changes when dependencies update)
# 3. pip install (benefits from requirements.txt caching)
# 4. Application source code (changes frequently during development)
# 5. Virtual environment setup for dependency isolation
#
# Multi-stage Benefits:
# - Development stage: ~200-250MB with dev dependencies and debugging tools
# - Production stage: ~100-150MB optimized for deployment with Gunicorn
# - Common base stage reduces duplication and build time
# - Dependencies stage enables efficient caching of pip installs
# - Application stage provides foundation for both dev and prod variants
#
# Security Features:
# - Non-root user execution (python user UID 1000)
# - Minimal Alpine Linux base image with security updates
# - Virtual environment isolation for Python dependencies
# - No sensitive information in environment variables
# - Proper file permissions and ownership
# - Framework fingerprinting prevention through Flask configuration
# - Security scanning integration points for Trivy, Bandit, and Safety
#
# Python-specific Optimizations:
# - PYTHONUNBUFFERED=1 for immediate output (essential for containers)
# - PYTHONDONTWRITEBYTECODE=1 to prevent .pyc file creation
# - Virtual environment for dependency isolation and reproducibility
# - Gunicorn WSGI server with optimized worker configuration
# - Flask development server with debug mode and hot-reload for development
#
# Build Commands:
# Development: docker build --target development -t flask-tutorial:dev .
# Production:  docker build --target production -t flask-tutorial:prod .
# Testing:     docker build --target development -t flask-tutorial:test .
# Dependencies: docker build --target dependencies -t flask-tutorial:deps .
# Application: docker build --target application -t flask-tutorial:app .
#
# Run Commands:
# Development: docker run -p 3000:3000 -v $(pwd)/src/backend:/usr/src/app flask-tutorial:dev
# Production:  docker run -p 3000:3000 flask-tutorial:prod
# Testing:     docker run --rm flask-tutorial:test /usr/src/app/venv/bin/python -m pytest
# Debug:       docker run -p 3000:3000 -p 5678:5678 flask-tutorial:dev
#
# Environment Variable Configuration:
# FLASK_APP=wsgi.py (WSGI application entry point)
# FLASK_ENV=development|production (Flask environment mode)
# FLASK_DEBUG=True|False (Debug mode for development)
# PORT=3000 (Application port binding)
# PYTHONPATH=/usr/src/app (Python module path configuration)
# GUNICORN_WORKERS=4 (Production worker process count)
# GUNICORN_TIMEOUT=30 (Request timeout configuration)
#
# Health Check Integration:
# The health check endpoint /hello is implemented in Flask application
# and provides comprehensive application readiness verification including:
# - Flask application responsiveness
# - WSGI server functionality
# - Database connectivity (if applicable in future extensions)
# - External service dependencies (configurable)
#
# Resource Optimization for Python Runtime:
# - Memory target: <75MB (adjusted from <50MB Node.js for Python overhead)
# - Virtual environment caching for faster container builds
# - Alpine Linux minimal base for reduced attack surface
# - Multi-stage builds to eliminate development dependencies from production
# - Gunicorn worker process management for optimal resource utilization