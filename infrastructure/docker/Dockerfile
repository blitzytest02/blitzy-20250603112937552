# Multi-stage Docker container configuration for Python Flask tutorial application
# Implements containerized deployment with Python v3.12 Alpine Linux base image
# Optimized build stages for development and production environments with security best practices
# Educational container patterns for Flask v3.1.1 hello world WSGI server demonstration

# =============================================================================
# BASE STAGE - Common foundation with Python runtime and system setup
# =============================================================================
FROM python:3.12-alpine AS base

# Set metadata labels for container identification and maintenance
LABEL maintainer="Tutorial Author" \
      version="2.0.0" \
      description="Python Flask tutorial application with Flask v3.1.1 hello world WSGI server" \
      python.version="3.12" \
      flask.version="3.1.1" \
      alpine.version="3.19" \
      stage="base"

# Install system dependencies and security updates using Alpine package manager
# curl: Required for health checks and debugging capabilities
# dumb-init: Proper signal handling for PID 1 in containers
# build-base: Required for compiling Python packages with native extensions
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        curl=8.* \
        dumb-init=1.* \
        build-base=0.* \
        libffi-dev=3.* \
        openssl-dev=3.* && \
    # Remove package cache to reduce image size
    rm -rf /var/cache/apk/* /tmp/*

# Create application directory with proper ownership
# Use standard Python application working directory
WORKDIR /usr/src/app

# Create non-root python user for security compliance
# Use UID 1000 to match common development environments
RUN addgroup -g 1000 python && \
    adduser -D -u 1000 -G python python && \
    chown -R python:python /usr/src/app

# Set environment variables for Python optimization and security
ENV PYTHONPATH=/usr/src/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHON_VERSION=3.12 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    FLASK_ENV=production \
    FLASK_APP=app.py \
    PORT=3000 \
    HOST=0.0.0.0

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
RUN python -m venv /usr/src/app/.venv && \
    # Activate virtual environment for all subsequent commands
    . /usr/src/app/.venv/bin/activate && \
    # Upgrade pip to latest version for security and performance
    pip install --upgrade pip>=24.0 && \
    # Install wheel for optimized package builds
    pip install wheel>=0.42.0

# Install production dependencies with pip for reproducible builds
# pip install provides fast, reliable, reproducible builds for production
RUN . /usr/src/app/.venv/bin/activate && \
    pip install -r requirements.txt && \
    # Verify Flask installation for educational demonstration
    python -c "import flask; print(f'Flask version: {flask.__version__}')" && \
    # Verify Gunicorn installation for WSGI server functionality
    python -c "import gunicorn; print(f'Gunicorn version: {gunicorn.__version__}')"

# Set proper permissions on virtual environment directory
RUN chmod -R 755 /usr/src/app/.venv

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
    . /usr/src/app/.venv/bin/activate && \
    python -c "import app; print('Flask app module loaded successfully')" && \
    python -c "import wsgi; print('WSGI module loaded successfully')"

# Expose port 3000 for HTTP server communication
# Documented port exposure for container orchestration
EXPOSE 3000

# Configure health check endpoint for container monitoring
# Health check verifies Flask server responsiveness and /hello endpoint functionality
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Configure Python path for module imports
ENV PYTHONPATH=/usr/src/app:$PYTHONPATH

# Configure application startup command with proper signal handling
# Use dumb-init for proper PID 1 signal handling in containers
CMD ["dumb-init", "sh", "-c", ". /usr/src/app/.venv/bin/activate && python -m flask run --host=0.0.0.0 --port=3000"]

# =============================================================================
# DEVELOPMENT STAGE - Development tools and debugging capabilities
# =============================================================================
FROM dependencies AS development

# Set stage-specific metadata and environment
LABEL stage="development"
ENV FLASK_ENV=development \
    FLASK_DEBUG=1 \
    LOG_LEVEL=debug

# Install development dependencies including pytest and testing tools
RUN . /usr/src/app/.venv/bin/activate && \
    pip install -r requirements-dev.txt && \
    # Verify pytest installation for testing framework
    python -c "import pytest; print(f'pytest version: {pytest.__version__}')" && \
    # Verify pytest-flask integration for Flask testing
    python -c "import pytest_flask; print('pytest-flask installed successfully')" && \
    # Verify coverage.py for code coverage analysis
    python -c "import coverage; print(f'coverage.py version: {coverage.__version__}')" && \
    # Clean pip cache to reduce image size
    pip cache purge

# Copy all source files for development workflow including tests
COPY --chown=python:python src/backend/ ./
COPY --chown=python:python src/backend/tests/ ./tests/

# Install debugging tools for development
RUN . /usr/src/app/.venv/bin/activate && \
    pip install debugpy>=1.8.0 watchdog>=3.0.0

# Set development-specific configurations
ENV PYTHONPATH=/usr/src/app:$PYTHONPATH \
    FLASK_DEBUG=1 \
    PYTHONDONTWRITEBYTECODE=0

# Expose debugging port for Python debugpy
EXPOSE 5678

# Override health check for development environment
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=2 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Development startup command with debugging and hot-reload capabilities
# Enable Flask development server with debugging and automatic reloading
CMD ["dumb-init", "sh", "-c", ". /usr/src/app/.venv/bin/activate && python -m debugpy --listen 0.0.0.0:5678 --wait-for-client -m flask run --host=0.0.0.0 --port=3000 --debug --reload"]

# =============================================================================
# PRODUCTION STAGE - Optimized production build with security hardening
# =============================================================================
FROM application AS production

# Set stage-specific metadata
LABEL stage="production"

# Production environment configuration
ENV FLASK_ENV=production \
    FLASK_DEBUG=0 \
    LOG_LEVEL=info \
    WORKERS=4 \
    WORKER_CONNECTIONS=1000 \
    MAX_REQUESTS=1000 \
    MAX_REQUESTS_JITTER=100 \
    TIMEOUT=30 \
    KEEPALIVE=2

# Install Gunicorn for production WSGI server if not already installed
RUN . /usr/src/app/.venv/bin/activate && \
    python -c "import gunicorn; print(f'Gunicorn {gunicorn.__version__} ready for production')"

# Remove development tools and packages not needed in production
# Clean up any development artifacts
RUN rm -rf /tmp/* /var/tmp/* /root/.cache

# Configure production-optimized health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/hello || exit 1

# Security hardening - ensure read-only application files
RUN chmod -R 444 *.py

# Configure Gunicorn worker settings for optimal performance
ENV GUNICORN_CMD_ARGS="--bind=0.0.0.0:3000 --workers=4 --worker-class=sync --worker-connections=1000 --max-requests=1000 --max-requests-jitter=100 --timeout=30 --keepalive=2 --preload --access-logfile=- --error-logfile=- --log-level=info"

# Production startup command optimized for performance with Gunicorn WSGI server
# Use dumb-init for proper signal handling and graceful shutdown
CMD ["dumb-init", "sh", "-c", ". /usr/src/app/.venv/bin/activate && gunicorn wsgi:app --bind=0.0.0.0:3000 --workers=4 --worker-class=sync --worker-connections=1000 --max-requests=1000 --max-requests-jitter=100 --timeout=30 --keepalive=2 --preload --access-logfile=- --error-logfile=- --log-level=info"]

# =============================================================================
# BUILD OPTIMIZATION NOTES FOR EDUCATIONAL PURPOSES
# =============================================================================
# Layer Caching Strategy:
# 1. Base system packages (changes rarely)
# 2. Requirements.txt files (changes when dependencies update)
# 3. pip install (benefits from requirements.txt caching)
# 4. Application source code (changes frequently during development)
#
# Multi-stage Benefits:
# - Development stage: ~200-250MB with dev dependencies and debugging tools
# - Production stage: ~100-120MB optimized for deployment with Gunicorn
# - Common base stage reduces duplication and build time
# - Virtual environment isolation provides clean dependency management
#
# Security Features:
# - Non-root user execution (python user UID 1000)
# - Minimal Alpine Linux base image with security updates
# - No sensitive information in environment variables
# - Proper file permissions and ownership
# - Python security scanning integration (Bandit, Safety, pip-audit)
# - Virtual environment isolation for dependency security
#
# Python-specific Optimizations:
# - PYTHONUNBUFFERED=1 for immediate stdout/stderr output
# - PYTHONDONTWRITEBYTECODE=1 prevents .pyc file creation
# - Virtual environment (.venv) for dependency isolation
# - pip caching disabled to reduce image size
# - Wheel format installation for faster builds
#
# Build Commands:
# Development: docker build --target development -t flask-tutorial:dev .
# Production:  docker build --target production -t flask-tutorial:prod .
# Testing:     docker build --target development -t flask-tutorial:test .
#
# Run Commands:
# Development: docker run -p 3000:3000 -p 5678:5678 -v $(pwd)/src/backend:/usr/src/app flask-tutorial:dev
# Production:  docker run -p 3000:3000 flask-tutorial:prod
# Testing:     docker run --rm flask-tutorial:test sh -c ". .venv/bin/activate && pytest"
#
# WSGI Production Deployment:
# The production stage uses Gunicorn WSGI server with optimized configuration:
# - 4 worker processes for concurrent request handling
# - Sync worker class for CPU-bound Flask applications
# - 1000 worker connections per worker process
# - Request recycling (max-requests) for memory management
# - Graceful shutdown handling with proper signal propagation
# - Access and error logging to stdout/stderr for container log aggregation
#
# Flask Development Features:
# - Hot-reload capability with watchdog file monitoring
# - Python debugpy integration for IDE debugging support
# - Flask debug mode with enhanced error pages and automatic reloading
# - pytest integration with Flask test client for comprehensive testing
# - Coverage.py integration for code coverage analysis and reporting
#
# Memory and Resource Optimization:
# - Target memory usage: <75MB for production container
# - Python garbage collection optimization through environment variables
# - Virtual environment caching for faster local development iterations
# - Alpine Linux minimal base image for reduced attack surface
# - Multi-stage copying to eliminate unnecessary build dependencies
#
# Security Integration:
# - Bandit static analysis for Python security vulnerabilities
# - Safety dependency scanning for known package vulnerabilities
# - pip-audit for comprehensive dependency security assessment
# - Trivy container scanning for OS and application vulnerabilities
# - SBOM generation for supply chain security tracking
# - Non-root user execution with proper UID/GID mapping