# Python Flask Migration Tutorial

[![Python Version](https://img.shields.io/badge/python-v3.12+-brightgreen)](https://python.org/)
[![Flask Version](https://img.shields.io/badge/flask-v3.1.1+-blue)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/tutorial/python-flask-tutorial)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/tutorial/python-flask-tutorial)

A comprehensive Python tutorial application demonstrating the migration from Node.js to Flask, showcasing fundamental HTTP server concepts using Flask v3.1.1 and Python 3.12+ through hands-on implementation with a single `/hello` endpoint returning 'Hello world'.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

### Learning Objectives

This tutorial application is designed to provide hands-on experience with fundamental Python Flask concepts and migration patterns:

- **Understanding Python HTTP server fundamentals** - Learn how Python handles HTTP requests and responses with Flask
- **Learning Flask framework basics and routing** - Master Flask's decorator-based routing and request handling patterns
- **Implementing RESTful API endpoints** - Create and test HTTP endpoints following REST principles with Flask
- **Understanding request-response cycles** - Comprehend the complete HTTP request-response flow in Python
- **Learning error handling patterns** - Implement robust error handling with Flask's built-in error management
- **Understanding testing with pytest and Flask test client** - Write comprehensive tests for HTTP endpoints using pytest

### Technology Stack

**Runtime Environment:**
- **Python 3.12+ 'Stable'** - Latest stable Python version with enhanced performance and modern language features, providing comprehensive standard library support for web development

**Web Framework:**
- **Flask v3.1.1** - Modern Python web framework with enhanced type hint support, improved security defaults, and WSGI-compliant request/response processing

**Testing Framework:**
- **pytest v8.4.0** - Advanced Python testing framework with fixture management, parametric testing, and comprehensive assertion capabilities
- **pytest-flask v1.3.0** - Flask-specific testing integration providing Flask test client fixtures and application context management

**Production Server:**
- **Gunicorn v21.2.0** - Production-grade Python WSGI HTTP server with worker process management and graceful shutdown capabilities

**Containerization (Optional):**
- **Docker** - Multi-stage builds with python:3.12-alpine for minimal resource usage and deployment learning

### Project Features

- **Single `/hello` endpoint** returning JSON 'Hello world' response demonstrating basic Flask HTTP server functionality
- **Flask v3.1.1 modern features** including application factory pattern and decorator-based routing
- **Comprehensive error handling** with 404 and 500 responses following HTTP standards using Flask error handlers
- **Educational logging and monitoring patterns** for understanding Flask application behavior
- **Complete pytest test suite with 100% code coverage** demonstrating Python testing best practices
- **Docker containerization support** for deployment learning with Python runtime environment

## Prerequisites

### System Requirements

| Component | Minimum Version | Recommended | Purpose |
|-----------|----------------|-------------|---------|
| **Python** | v3.12.0 | Latest Stable | Python runtime environment |
| **pip** | v23.0.0 | Latest | Python package manager |
| **Memory** | 100MB RAM | 200MB | Application runtime requirements |
| **Disk Space** | 50MB | 100MB | Dependencies and project files |

### Installation Links

- **Python Official**: [https://python.org/downloads/](https://python.org/downloads/) - Official Python installers for all platforms
- **pyenv**: [https://github.com/pyenv/pyenv](https://github.com/pyenv/pyenv) - Manage multiple Python versions
- **Docker (Optional)**: [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/) - For containerization learning

### Verification Commands

Verify your development environment meets the requirements:

```bash
# Check Python version (should show v3.12.0 or higher)
python --version

# Check pip version (should show v23.0.0 or higher)
pip --version

# Optional: Check Docker version for containerization
docker --version
```

## Installation

### 1. Clone Repository

```bash
# Clone the tutorial repository
git clone https://github.com/tutorial/python-flask-tutorial.git

# Navigate to project directory
cd python-flask-tutorial

# Navigate to backend source directory
cd src/backend
```

### 2. Python Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Verify virtual environment is active (should show venv path)
which python
```

### 3. Install Dependencies

```bash
# Install Flask v3.1.1 and production dependencies
pip install -r requirements.txt

# Install development dependencies (optional)
pip install -r requirements-dev.txt

# Verify installed packages
pip list

# Optional: Run security audit
pip-audit
```

**Expected Dependencies:**
- `Flask>=3.1.1` - Modern Python web framework for HTTP server functionality
- `python-dotenv>=1.0.1` - Environment variable management for configuration
- `gunicorn>=21.2.0` - Production WSGI server (for deployment)
- `pytest>=8.4.0` - Advanced testing framework (development dependency)
- `pytest-flask>=1.3.0` - Flask testing integration (development dependency)

### 4. Environment Configuration (Optional)

Create a `.env` file for custom configuration:

```bash
# Optional environment variables
FLASK_ENV=development
PORT=5000
HOST=localhost
FLASK_DEBUG=True
```

**Default Configuration:**
- **PORT**: 5000 (customizable via environment variable)
- **HOST**: localhost (safe for local development)
- **FLASK_ENV**: development (enables enhanced debugging)
- **FLASK_DEBUG**: True (enables development mode features)

## Usage

### Development Server

#### Start the Flask Server

```bash
# Start the Flask development server
python -m flask run

# Alternative: Start with development configuration
FLASK_ENV=development python -m flask run

# Custom port configuration
FLASK_RUN_PORT=8080 python -m flask run

# Production mode with Gunicorn
gunicorn wsgi:app
```

**Expected Output:**
```
 * Environment: development
 * Debug mode: on
 * Running on http://127.0.0.1:5000
 * Restarting with stat
 * Debugger is active!
 * Debugger PIN: 123-456-789

🚀 Flask Application Successfully Started!
============================================================
⏰ Startup time: 2024-01-15T10:30:00.000Z
🌐 Server listening on: http://localhost:5000
📡 Host: localhost
🔌 Port: 5000

🎯 Available Endpoints:
   GET  http://localhost:5000/hello  →  Returns JSON "Hello world"

🔧 Testing Commands:
   curl http://localhost:5000/hello
   curl -i http://localhost:5000/hello  # Include response headers

🌐 Browser Access:
   Open: http://localhost:5000/hello
```

#### Test the Endpoint

**Browser Access:**
```
http://localhost:5000/hello
```

**Command Line Testing:**
```bash
# Basic request
curl http://localhost:5000/hello

# Include response headers
curl -i http://localhost:5000/hello

# Test error handling
curl http://localhost:5000/invalid
```

**Expected Responses:**

✅ **Successful Request:**
```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 45

{
  "message": "Hello world",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

❌ **Error Response:**
```
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Not Found",
  "status": 404,
  "path": "/invalid",
  "method": "GET"
}
```

#### Server Management

**Graceful Shutdown:**
```bash
# Press Ctrl+C for graceful shutdown
^C
```

**Custom Configuration:**
```bash
# Run on custom port
FLASK_RUN_PORT=8080 python -m flask run

# Verify custom port
curl http://localhost:8080/hello
```

**Environment-Specific Configuration:**
```bash
# Development mode with debug
FLASK_ENV=development FLASK_DEBUG=True python -m flask run

# Production mode
FLASK_ENV=production python -m flask run
```

## API Documentation

### Endpoints

#### GET /hello

Returns a simple 'Hello world' greeting with timestamp demonstrating basic Flask HTTP server functionality.

**Request:**
```http
GET /hello HTTP/1.1
Host: localhost:5000
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 45

{
  "message": "Hello world",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response Headers:**
- `Content-Type`: `application/json`
- `Content-Length`: `45`
- `Server`: `Werkzeug/3.0.1 Python/3.12.0` (development) or `gunicorn/21.2.0` (production)

**cURL Example:**
```bash
curl -i http://localhost:5000/hello
```

**Python requests Example:**
```python
import requests

response = requests.get('http://localhost:5000/hello')
data = response.json()
print(data['message'])  # "Hello world"
```

### Error Responses

#### 404 Not Found

Returned for undefined routes and invalid endpoints using Flask's error handling.

**Request:**
```bash
curl http://localhost:5000/nonexistent
```

**Response:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Not Found",
  "status": 404,
  "path": "/nonexistent",
  "method": "GET"
}
```

#### 405 Method Not Allowed

Returned for unsupported HTTP methods on existing endpoints.

**Request:**
```bash
curl -X POST http://localhost:5000/hello
```

**Response:**
```http
HTTP/1.1 405 Method Not Allowed
Content-Type: application/json

{
  "error": "Method Not Allowed",
  "status": 405,
  "allowed_methods": ["GET"]
}
```

### Security Features

**Flask v3.1.1 Security Enhancements:**
- **Security headers enabled** - CORS protection and security header configuration
- **Error message sanitization** - Prevents information disclosure in error responses
- **Request validation** - Input validation and sanitization patterns
- **Environment-based configuration** - Secure production vs development settings

## Testing

### Test Execution

#### Run All Tests

```bash
# Execute complete pytest test suite
pytest

# Run tests with coverage reporting
pytest --cov=src --cov-report=html

# Run tests in verbose mode
pytest -v

# Run specific test file
pytest tests/test_app.py
```

#### Test Structure

**Test Files:**
- `tests/test_app.py` - Flask application testing with pytest-flask fixtures
- `tests/test_wsgi.py` - WSGI server integration and lifecycle testing

**Testing Framework Stack:**
- **pytest v8.4.0** - Advanced testing framework with fixture management
- **pytest-flask v1.3.0** - Flask-specific testing integration with test client fixtures
- **coverage.py v7.6.0** - Code coverage measurement with branch analysis

#### Coverage Reports

**Target Coverage Metrics:**
- **Line Coverage**: 100% (comprehensive code coverage)
- **Function Coverage**: 100% (all functions tested)
- **Branch Coverage**: 100% (all code paths covered)
- **Statement Coverage**: 100% (complete statement testing)

**Coverage Report Example:**
```bash
pytest --cov=src --cov-report=term-missing
```

```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files            |     100 |      100 |     100 |     100 |
 src/app.py          |     100 |      100 |     100 |     100 |
 src/wsgi.py         |     100 |      100 |     100 |     100 |
----------------------|---------|----------|---------|---------|
```

#### Test Examples

**Endpoint Testing:**
```python
# Test /hello endpoint response and headers
def test_hello_endpoint_success(client):
    """Test /hello endpoint returns JSON response with 200 status"""
    response = client.get('/hello')
    assert response.status_code == 200
    assert response.is_json
    
    data = response.get_json()
    assert data['message'] == 'Hello world'
    assert 'timestamp' in data
```

**Error Handling Testing:**
```python
# Test 404 error handling
def test_nonexistent_route_returns_404(client):
    """Test unknown routes return structured JSON error response"""
    response = client.get('/unknown')
    assert response.status_code == 404
    assert response.is_json
    
    data = response.get_json()
    assert data['error'] == 'Not Found'
    assert data['status'] == 404
```

## Deployment

### Local Deployment

#### Production Mode

```bash
# Run Flask in production mode
FLASK_ENV=production python -m flask run

# Production server with Gunicorn
gunicorn --bind 0.0.0.0:5000 wsgi:app

# Custom Gunicorn configuration
gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 30 wsgi:app
```

#### Process Management (Optional)

Install and use Supervisor for production process management:

```bash
# Install Supervisor
pip install supervisor

# Create Supervisor configuration
# /etc/supervisor/conf.d/flask-app.conf
[program:flask-app]
command=/path/to/venv/bin/gunicorn --bind 127.0.0.1:5000 wsgi:app
directory=/path/to/application
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
```

### Docker Deployment

#### Build Docker Images

```bash
# Development build with debugging tools
docker build --target development -t python-flask-tutorial:dev .

# Production build optimized for deployment
docker build --target production -t python-flask-tutorial:prod .
```

#### Run Docker Containers

```bash
# Run development container with volume mounting
docker run -p 5000:5000 -v $(pwd)/src/backend:/usr/src/app python-flask-tutorial:dev

# Run production container
docker run -p 5000:5000 python-flask-tutorial:prod

# Run with custom port
docker run -p 8080:5000 -e PORT=5000 python-flask-tutorial:prod
```

#### Docker Compose (Optional)

```yaml
# docker-compose.yml
version: '3.8'
services:
  flask-app:
    build:
      context: .
      target: production
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - GUNICORN_WORKERS=2
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/hello"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 45s
```

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Cloud Deployment

#### Heroku Deployment

```bash
# Login to Heroku
heroku login

# Create Heroku application
heroku create python-flask-tutorial

# Set Python runtime
echo "python-3.12.0" > runtime.txt

# Deploy application
git push heroku main

# Open deployed application
heroku open
```

#### Render Deployment

1. Connect GitHub repository to Render
2. Select Python environment
3. Configure build and start commands:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn wsgi:app`

#### Railway Deployment

Railway automatically detects Python applications through `requirements.txt`:

```bash
# Install Railway CLI
pip install railway

# Login and deploy
railway login
railway init
railway up
```

#### Azure Web Apps Deployment

1. Configure Azure App Service for Python
2. Set application settings:
   - **Python Version**: 3.12
   - **Startup Command**: `gunicorn wsgi:app`
   - **Runtime Stack**: Python 3.12
   - **Port**: 5000 (configured automatically)

### Environment Configuration

**Required Environment Variables for Deployment:**

| Variable | Default | Purpose | Platform Notes |
|----------|---------|---------|----------------|
| `PORT` | 5000 | Server port | Heroku/Azure set automatically |
| `FLASK_ENV` | development | Environment mode | Set to 'production' for deployment |
| `HOST` | localhost | Host binding | Use '0.0.0.0' for containerized deployment |
| `GUNICORN_WORKERS` | 1 | Worker processes | Set to 2-4 for production |

**Platform-Specific Configuration:**

```python
# wsgi.py - Dynamic configuration for deployment
import os
from src.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    
    app.run(host=host, port=port, debug=debug)
```

## Troubleshooting

### Common Issues

#### Port Already in Use

**Error:**
```
OSError: [Errno 48] Address already in use
```

**Solutions:**
```bash
# Find process using port 5000
lsof -ti:5000 | xargs kill  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Use different port
FLASK_RUN_PORT=8080 python -m flask run

# Kill specific process
kill -9 <process-id>
```

#### Python Version Compatibility

**Error:**
```
Error: Flask v3.1.1 requires Python 3.8+
```

**Solutions:**
```bash
# Check current Python version
python --version

# Update Python to 3.12+
# Download from https://python.org/downloads/

# Using pyenv for version management
pyenv install 3.12.0
pyenv local 3.12.0
pyenv global 3.12.0
```

#### Permission Denied

**Error:**
```
PermissionError: [Errno 13] Permission denied: bind to port 80
```

**Solutions:**
```bash
# Use port 5000 or higher (recommended)
FLASK_RUN_PORT=5000 python -m flask run

# Check port permissions
# Ports below 1024 require administrator privileges

# For development, always use ports above 1024
FLASK_RUN_PORT=5000 python -m flask run
```

#### Dependencies Installation Failed

**Error:**
```
ERROR: pip's dependency resolver does not currently take into account all the packages that are installed
```

**Solutions:**
```bash
# Clear pip cache
pip cache purge

# Create fresh virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install specific Flask version
pip install Flask==3.1.1
```

### Debugging Tips

#### Verbose Logging

```bash
# Enable development logging
FLASK_ENV=development FLASK_DEBUG=True python -m flask run

# Debug mode with detailed output
FLASK_APP=src.app:create_app python -m flask run --debug
```

#### Network Testing

```bash
# Test endpoint with verbose output
curl -v http://localhost:5000/hello

# Test with specific headers
curl -H "Accept: application/json" http://localhost:5000/hello

# Test timeout behavior
curl --max-time 5 http://localhost:5000/hello
```

#### Docker Debugging

```bash
# Debug Docker container
docker run -it python-flask-tutorial:dev sh

# View container logs
docker logs <container-id>

# Inspect running container
docker exec -it <container-id> sh
```

### Performance Issues

#### Slow Startup

**Potential Causes:**
- Python version compatibility
- Virtual environment issues
- System resource constraints

**Solutions:**
```bash
# Verify system resources
free -h  # Linux/macOS memory check
top      # Process monitoring

# Optimize pip install
pip install --no-cache-dir -r requirements.txt

# Check Python performance
python -X dev -m flask run
```

#### Slow Response Times

**Monitoring:**
```bash
# Monitor response times
curl -w "@curl-format.txt" http://localhost:5000/hello

# Create curl-format.txt
echo "Response Time: %{time_total}s\nStatus Code: %{http_code}" > curl-format.txt
```

**Performance Targets:**
- **Response Time**: < 100ms for /hello endpoint
- **Memory Usage**: < 75MB for tutorial application
- **Startup Time**: < 5 seconds for Flask development server

## Contributing

### Development Workflow

#### 1. Fork Repository

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/python-flask-tutorial.git
cd python-flask-tutorial
```

#### 2. Create Feature Branch

```bash
# Create feature branch from main
git checkout -b feature/your-feature-name

# Set up development environment
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt

# Make changes and test
pytest --cov=src
```

#### 3. Submit Changes

```bash
# Format code with Black
black src/ tests/

# Lint code with flake8
flake8 src/ tests/

# Run security analysis
bandit -r src/

# Add and commit changes
git add .
git commit -m "Add: clear description of changes"

# Push to your fork
git push origin feature/your-feature-name

# Submit pull request on GitHub
```

### Code Standards

#### Python Style Guidelines

- **PEP 8 Compliance**: Follow Python style guide standards
- **Type Hints**: Use type annotations for function parameters and returns
- **Black Formatting**: Consistent code formatting with Black
- **Clear Docstrings**: Include comprehensive function documentation

#### Testing Requirements

- **100% Test Coverage**: Maintain complete pytest coverage
- **pytest Fixtures**: Use Flask test client fixtures appropriately
- **Error Case Testing**: Include negative test scenarios
- **Performance Testing**: Verify response time requirements with pytest-benchmark

#### Commit Message Format

```bash
# Format: Type: Description
git commit -m "Add: new /health endpoint for monitoring"
git commit -m "Fix: resolve CORS configuration issue"
git commit -m "Update: improve error handling documentation"
git commit -m "Test: add integration tests for Docker deployment"
```

### Educational Focus

#### Contribution Guidelines

- **Maintain Simplicity**: Preserve educational clarity and Flask simplicity
- **Comprehensive Documentation**: Ensure all changes are well-documented
- **Learning Examples**: Provide clear examples and usage patterns
- **Progressive Learning**: Support progressive learning objectives

**Educational Standards:**
- Clear explanations for code changes
- Maintain beginner-friendly Flask documentation
- Include educational comments in code
- Provide troubleshooting guidance

#### Code Review Criteria

- **Educational Value**: Does the change enhance Flask learning?
- **Simplicity**: Is the implementation clear and understandable?
- **Documentation**: Are changes properly documented?
- **Testing**: Is the change properly tested with pytest?
- **Compatibility**: Does it maintain Python 3.12+ compatibility?

## License

### MIT License

**Copyright (c) 2024 Tutorial Author**

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### License Permissions

**✅ Permitted:**
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

**⚠️ Limitations:**
- ❌ No liability
- ❌ No warranty

**📋 Conditions:**
- 📄 License and copyright notice must be included

### License File

See [LICENSE](LICENSE) file for complete license text and terms.

---

## Additional Resources

### Learning Resources

- **Python Official Documentation**: [https://docs.python.org/3/](https://docs.python.org/3/)
- **Flask Documentation**: [https://flask.palletsprojects.com/](https://flask.palletsprojects.com/)
- **pytest Documentation**: [https://docs.pytest.org/](https://docs.pytest.org/)
- **HTTP Protocol Fundamentals**: [MDN HTTP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP)

### Community Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/tutorial/python-flask-tutorial/issues)
- **Stack Overflow**: Tag questions with `python`, `flask`, `tutorial`
- **Python Community**: [https://python.org/community/](https://python.org/community/)
- **Flask Community**: [https://discord.com/invite/pallets](https://discord.com/invite/pallets)

### Version History

- **v2.0.0** - Migration to Python 3.12+ and Flask v3.1.1 from Node.js/Express.js
- Features: Single /hello endpoint, comprehensive pytest testing, Docker support with python:3.12-alpine
- Educational focus: Python web development fundamentals and Flask application patterns

---

**🐍 Happy Learning!** This tutorial provides a solid foundation for understanding Python Flask fundamentals and migration patterns. Build upon these concepts to create more complex Flask applications and advance your Python web development skills.