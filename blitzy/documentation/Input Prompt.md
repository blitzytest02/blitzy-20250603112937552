Can you create a Python Flask tutorial project that features one endpoint '/hello' that returns "Hello world" to the calling HTTP client?

## Technical Requirements

**Framework & Runtime:**
- Python 3.12+ with Flask v3.1.1 web framework
- WSGI-compliant application using Gunicorn/uWSGI for production deployment
- Flask application factory pattern for scalable configuration management
- Type hints and PEP 8 compliance for modern Python development standards

**API Implementation:**
- Flask route decorator (`@app.route('/hello', methods=['GET'])`) for endpoint definition
- JSON response using Flask's `jsonify()` function for proper content-type headers
- Flask error handlers (`@app.errorhandler`) for 404, 405, and 500 HTTP status codes
- CORS support via Flask-CORS extension for cross-origin resource sharing

**Testing & Quality:**
- pytest v8.4.0 testing framework with pytest-flask integration
- 100% code coverage using coverage.py with pytest-cov plugin
- Security scanning with bandit and safety tools for Python vulnerability assessment
- Code formatting with black and linting with flake8 for PEP 8 compliance

**Dependency Management:**
- Python virtual environment (venv/pipenv) for isolated development
- requirements.txt and requirements-dev.txt for reproducible dependency resolution
- pip package management with security vulnerability scanning (pip-audit)

**Containerization & Deployment:**
- Multi-stage Docker builds using python:3.12-alpine base image
- Production WSGI server (Gunicorn) configuration within containers
- Docker Compose orchestration for development and production environments
- Health check endpoint (`/health`) for monitoring and deployment verification

**Performance Targets:**
- <100ms cold start, <50ms warm response times
- <75MB memory footprint for Python runtime (increased from Node.js requirements)
- Optimized container image size with Alpine Linux foundation

**CI/CD Pipeline:**
- GitHub Actions workflows adapted for Python environments
- Multi-version Python testing matrix (3.12, 3.13) for compatibility validation
- Automated Flask application deployment to Azure Web Apps with Python runtime
- Integration with pytest coverage reporting and security scanning tools

**Educational Value:**
- Demonstrates modern Flask development patterns and Python web application architecture
- Showcases production-ready Python practices including WSGI deployment and testing methodologies
- Illustrates migration patterns from Express.js to Flask with equivalent functionality
- Provides comprehensive documentation covering Flask-specific implementation details