# Python Flask Hello World Tutorial

[![Python Version](https://img.shields.io/badge/python-v3.12%2B-brightgreen)](https://python.org/)
[![Flask Version](https://img.shields.io/badge/flask-v3.1.1-blue)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/tutorial/python-flask-tutorial)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/tutorial/python-flask-tutorial)

A comprehensive Python Flask tutorial application demonstrating fundamental WSGI web server concepts using Flask v3.1.1 and Python 3.12+ through hands-on HTTP server implementation with a single `/hello` endpoint returning 'Hello world'.

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

This tutorial application is designed to provide hands-on experience with fundamental Python web development and Flask concepts:

- **Understanding Python WSGI server fundamentals** - Learn how Python handles HTTP requests and responses through WSGI protocol
- **Learning Flask framework basics and routing** - Master Flask decorator-based routing and view function patterns
- **Implementing RESTful API endpoints** - Create and test HTTP endpoints following REST principles with Flask
- **Understanding request-response cycles** - Comprehend the complete HTTP request-response flow in Python
- **Learning error handling patterns** - Implement robust error handling and status code management with Flask decorators
- **Understanding testing with pytest and Flask test client** - Write comprehensive tests for Flask endpoints using pytest fixtures

### Technology Stack

**Runtime Environment:**
- **Python 3.12+ 'Latest'** - Modern Python interpreter with enhanced performance, improved type hints, and comprehensive standard library support extending long-term stability

**Web Framework:**
- **Flask v3.1.1** - Latest WSGI web framework with enhanced type hint support, security defaults, and modern Python 3.12+ compatibility for production-ready applications

**Testing Framework:**
- **pytest v8.4.0** - Comprehensive Python testing framework with advanced fixture management and Flask-specific integration
- **pytest-flask v1.3.0** - Flask application testing plugin providing specialized fixtures for HTTP endpoint testing

**WSGI Server:**
- **Gunicorn v21.2.0** - Production-grade Python WSGI HTTP server with multi-worker process management for scalable deployment

**Containerization (Optional):**
- **Docker** - Multi-stage builds with python:3.12-alpine for minimal resource usage and deployment learning

### Project Features

- **Single `/hello` endpoint** returning 'Hello world' response demonstrating basic Flask WSGI server functionality
- **Flask v3.1.1 security features** including automatic JSON serialization and modern security defaults
- **Comprehensive error handling** with 404 and 500 responses following HTTP standards using Flask decorators
- **Educational logging and monitoring patterns** for understanding Python web server behavior
- **Complete test suite with 100% code coverage** demonstrating pytest best practices and Flask testing patterns
- **Docker containerization support** for deployment learning and environment consistency with Python runtime

## Prerequisites

### System Requirements

| Component | Minimum Version | Recommended | Purpose |
|-----------|----------------|-------------|---------|
| **Python** | v3.12.0 | Latest 3.12.x | Python runtime environment with modern language features |
| **pip** | v23.0.0 | Latest | Python package manager (bundled with Python) |
| **Memory** | 75MB RAM | 150MB | Flask application runtime requirements |
| **Disk Space** | 100MB | 200MB | Virtual environment and dependencies |

### Installation Links

- **Python Official**: [https://python.org/downloads/](https://python.org/downloads/) - Official Python installers for all platforms
- **pyenv (Version Manager)**: [https://github.com/pyenv/pyenv](https://github.com/pyenv/pyenv) - Manage multiple Python versions
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

### 2. Virtual Environment Setup

```bash
# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Verify virtual environment activation
which python  # Should show .venv path
```

### 3. Install Dependencies

```bash
# Install Flask v3.1.1 and production dependencies
pip install -r requirements.txt

# Install development dependencies (optional)
pip install -r requirements-dev.txt

# Verify installed packages
pip list

# Optional: Check for security vulnerabilities
pip-audit
```

**Expected Dependencies:**
- `Flask>=3.1.1` - WSGI web framework for HTTP server functionality
- `python-dotenv>=1.0.1` - Environment variable management
- `Flask-CORS>=4.0.0` - Cross-origin resource sharing
- `pytest>=8.4.0` - Testing framework (development dependency)
- `pytest-flask>=1.3.0` - Flask testing integration (development dependency)

### 4. Environment Setup (Optional)

Create a `.env` file for custom configuration:

```bash
# Optional environment variables
FLASK_APP=app.py
FLASK_ENV=development
PORT=5000
HOST=localhost
```

**Default Configuration:**
- **PORT**: 5000 (customizable via environment variable)
- **HOST**: localhost (safe for local development)
- **FLASK_ENV**: development (enables enhanced debugging)

## Usage

### Development Server

#### Start the Flask Server

```bash
# Activate virtual environment first
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate  # Windows

# Start the Flask development server
python -m flask run

# Alternative: Start with Gunicorn for production testing
gunicorn wsgi:app

# Custom port development mode
python -m flask run --port=8080

# Development mode with debug enabled
FLASK_DEBUG=True python -m flask run
```

**Expected Output:**
```
🚀 Flask Server Successfully Started!
============================================================
⏰ Startup time: 2024-01-15T10:30:00.000Z
🌐 Server listening on: http://localhost:5000
📡 Host: localhost
🔌 Port: 5000

🎯 Available Endpoints:
   GET  http://localhost:5000/hello  →  Returns "Hello world"

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

# Test with JSON response format
curl -H "Accept: application/json" http://localhost:5000/hello
```

**Expected Responses:**

✅ **Successful Request:**
```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11

Hello world
```

❌ **Error Response:**
```
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "status": 404,
  "message": "Not Found",
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

**Custom Port Configuration:**
```bash
# Run on custom port
FLASK_RUN_PORT=8080 python -m flask run

# Verify custom port
curl http://localhost:8080/hello
```

**Environment-Specific Configuration:**
```bash
# Enhanced development debugging
FLASK_DEBUG=True python -m flask run

# Production mode testing
FLASK_ENV=production gunicorn wsgi:app
```

## API Documentation

### Endpoints

#### GET /hello

Returns a simple 'Hello world' greeting demonstrating basic Flask WSGI server functionality.

**Request:**
```http
GET /hello HTTP/1.1
Host: localhost:5000
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11

Hello world
```

**Response Headers:**
- `Content-Type`: `text/plain; charset=utf-8`
- `Content-Length`: `11`
- `Server`: `Werkzeug/3.x.x Python/3.12.x` (development)

**cURL Example:**
```bash
curl -i http://localhost:5000/hello
```

**Python Requests Example:**
```python
import requests

response = requests.get('http://localhost:5000/hello')
print(response.text)  # "Hello world"
print(response.status_code)  # 200
```

**JavaScript Fetch Example:**
```javascript
fetch('http://localhost:5000/hello')
  .then(response => response.text())
  .then(data => console.log(data)); // "Hello world"
```

### Error Responses

#### 404 Not Found

Returned for undefined routes and invalid endpoints using Flask error handlers.

**Request:**
```bash
curl http://localhost:5000/nonexistent
```

**Response:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "status": 404,
  "message": "Not Found",
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
  "status": 405,
  "message": "Method Not Allowed"
}
```

### Security Features

**Flask v3.1.1 Security Enhancements:**
- **Server header configuration** - Configurable server identification for production
- **Automatic JSON serialization** - Built-in JSON response handling with security defaults
- **CORS integration** - Flask-CORS extension for secure cross-origin request handling
- **Generic error messages** - Prevents information disclosure in production environments

## Testing

### Test Execution

#### Run All Tests

```bash
# Activate virtual environment
source .venv/bin/activate

# Execute complete test suite
pytest

# Run tests with verbose output
pytest -v

# Run tests in watch mode for development (requires pytest-watch)
pytest-watch

# Generate coverage report
pytest --cov=. --cov-report=html

# CI/CD optimized testing
pytest --cov=. --cov-report=xml --junitxml=test-results.xml
```

#### Test Structure

**Test Files:**
- `tests/test_app.py` - Flask application testing with pytest-flask fixtures
- `tests/test_wsgi.py` - WSGI server lifecycle and configuration testing

**Testing Framework Stack:**
- **pytest v8.4.0** - Advanced testing framework with fixture management
- **pytest-flask v1.3.0** - Flask-specific testing fixtures and utilities
- **coverage.py v7.6.0** - Code coverage measurement and reporting

#### Coverage Reports

**Target Coverage Metrics:**
- **Line Coverage**: 100% (comprehensive code coverage)
- **Function Coverage**: 100% (all functions tested)
- **Branch Coverage**: 100% (all code paths covered)
- **Statement Coverage**: 100% (complete statement testing)

**Coverage Report Example:**
```bash
pytest --cov=. --cov-report=term-missing
```

```
----------------------|---------|----------|---------|---------|
Name                  | Stmts   | Miss     | Branch  | BrPart  | Cover   |
----------------------|---------|----------|---------|---------|---------|
app.py               |      45 |        0 |       8 |       0 |   100%  |
wsgi.py              |      32 |        0 |       6 |       0 |   100%  |
tests/test_app.py    |      28 |        0 |       0 |       0 |   100%  |
----------------------|---------|----------|---------|---------|---------|
TOTAL                |     105 |        0 |      14 |       0 |   100%  |
```

#### Test Examples

**Endpoint Testing with pytest-flask:**
```python
# Test /hello endpoint response and headers
def test_hello_endpoint(client):
    """Test Flask /hello endpoint returns correct response."""
    response = client.get('/hello')
    
    assert response.status_code == 200
    assert response.data == b'Hello world'
    assert response.content_type == 'text/plain; charset=utf-8'
```

**Error Handling Testing:**
```python
# Test 404 error handling with Flask error handlers
def test_404_error_handling(client):
    """Test Flask 404 error handler returns JSON response."""
    response = client.get('/unknown')
    
    assert response.status_code == 404
    assert response.content_type == 'application/json'
    
    json_data = response.get_json()
    assert json_data['status'] == 404
    assert json_data['message'] == 'Not Found'
```

## Deployment

### Local Deployment

#### Production Mode

```bash
# Activate virtual environment
source .venv/bin/activate

# Run with Gunicorn for production testing
gunicorn wsgi:app

# Custom port and workers for production
gunicorn --bind 0.0.0.0:8080 --workers 2 wsgi:app

# With configuration file
gunicorn --config gunicorn.conf.py wsgi:app
```

#### Process Management with Supervisor (Optional)

Install and use Supervisor for production process management:

```bash
# Install Supervisor
pip install supervisor

# Create configuration file
cat > supervisord.conf << EOF
[program:flask-tutorial]
command=gunicorn --bind 0.0.0.0:5000 wsgi:app
directory=/path/to/project
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/flask-tutorial.log
EOF

# Start application with Supervisor
supervisorctl start flask-tutorial
```

### Docker Deployment

#### Build Docker Images

```bash
# Development build with debugging tools
docker build --target development -t flask-tutorial:dev .

# Production build optimized for deployment
docker build --target production -t flask-tutorial:prod .
```

#### Run Docker Containers

```bash
# Run development container with volume mounting
docker run -p 5000:5000 -v $(pwd)/src/backend:/usr/src/app flask-tutorial:dev

# Run production container with Gunicorn
docker run -p 5000:5000 flask-tutorial:prod

# Run with custom port
docker run -p 8080:5000 -e PORT=5000 flask-tutorial:prod
```

#### Docker Compose (Optional)

```yaml
# docker-compose.yml
version: '3.8'
services:
  flask-tutorial:
    build:
      context: .
      target: production
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
    restart: unless-stopped
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

# Set Python buildpack
heroku buildpacks:set heroku/python

# Deploy application
git push heroku main

# Open deployed application
heroku open
```

**Required Heroku Files:**
- `runtime.txt`: `python-3.12.0`
- `Procfile`: `web: gunicorn wsgi:app`

#### Azure Web Apps Deployment

1. Create Azure Web App with Python 3.12 runtime
2. Configure deployment settings:
   - **Runtime**: Python 3.12
   - **Startup Command**: `gunicorn wsgi:app`
   - **App Settings**: Configure environment variables

```bash
# Azure CLI deployment
az webapp create --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name python-flask-tutorial \
  --runtime "PYTHON|3.12"

# Deploy from local git
az webapp deployment source config-local-git \
  --name python-flask-tutorial \
  --resource-group myResourceGroup
```

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

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure app settings:
   - **Framework**: Python (Flask)
   - **Build Command**: `pip install -r requirements.txt`
   - **Run Command**: `gunicorn wsgi:app`
   - **Port**: 5000

### Environment Configuration

**Required Environment Variables for Deployment:**

| Variable | Default | Purpose | Platform Notes |
|----------|---------|---------|----------------|
| `PORT` | 5000 | Server port | Heroku/Azure set automatically |
| `FLASK_ENV` | development | Environment mode | Set to 'production' for deployment |
| `HOST` | localhost | Host binding | Use '0.0.0.0' for containerized deployment |
| `WORKERS` | 1 | Gunicorn worker processes | Increase for production traffic |

**Platform-Specific Configuration:**

```python
# wsgi.py - Dynamic configuration
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    app.run(host=host, port=port)
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
ImportError: Flask requires Python 3.8 or higher
```

**Solutions:**
```bash
# Check current Python version
python --version

# Update Python to 3.12+
# Download from https://python.org/

# Using pyenv (recommended)
pyenv install 3.12.0
pyenv global 3.12.0
pyenv rehash
```

#### Virtual Environment Issues

**Error:**
```
ModuleNotFoundError: No module named 'flask'
```

**Solutions:**
```bash
# Ensure virtual environment is activated
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# Verify activation
which python  # Should show .venv path

# Reinstall dependencies
pip install -r requirements.txt

# Create new virtual environment if corrupted
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Dependencies Installation Failed

**Error:**
```
ERROR: Could not find a version that satisfies the requirement Flask>=3.1.1
```

**Solutions:**
```bash
# Update pip to latest version
pip install --upgrade pip

# Clear pip cache
pip cache purge

# Install with verbose output for debugging
pip install -r requirements.txt -v

# Install specific Flask version
pip install Flask==3.1.1
```

### Debugging Tips

#### Verbose Logging

```bash
# Enable Flask debug mode
FLASK_DEBUG=True python -m flask run

# Enhanced logging level
FLASK_ENV=development python -m flask run

# Gunicorn debug mode
gunicorn --log-level debug wsgi:app
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
docker run -it flask-tutorial:dev sh

# View container logs
docker logs <container-id>

# Inspect running container
docker exec -it <container-id> sh
```

### Performance Issues

#### Slow Startup

**Potential Causes:**
- Python version compatibility
- Virtual environment configuration issues
- System resource constraints

**Solutions:**
```bash
# Verify system resources
free -h  # Linux/macOS memory check
top      # Process monitoring

# Optimize pip install
pip install --no-cache-dir -r requirements.txt

# Check Python performance
python -X dev app.py
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
- **Response Time**: < 50ms for /hello endpoint (warm requests)
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
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# Make changes and test
pytest
pytest --cov=. --cov-report=html
```

#### 3. Submit Changes

```bash
# Ensure code quality
black .
flake8 .
isort .

# Add and commit changes
git add .
git commit -m "Add: clear description of changes"

# Push to your fork
git push origin feature/your-feature-name

# Submit pull request on GitHub
```

### Code Standards

#### Python Style Guidelines

- **PEP 8 Compliance**: Follow Python style guide conventions
- **Type Hints**: Use type annotations for improved code documentation
- **Docstrings**: Include comprehensive docstrings for all functions and classes
- **Black Formatting**: Use Black for consistent code formatting

#### Testing Requirements

- **100% Test Coverage**: Maintain complete test coverage using pytest-cov
- **pytest Fixtures**: Use pytest-flask fixtures for Flask application testing
- **Test Documentation**: Clear test descriptions and assertions
- **Error Case Testing**: Include negative test scenarios

#### Commit Message Format

```bash
# Format: Type: Description
git commit -m "Add: new /health endpoint for monitoring"
git commit -m "Fix: resolve WSGI binding error on containers"
git commit -m "Update: improve Flask error handling documentation"
git commit -m "Test: add integration tests for Docker deployment"
```

### Educational Focus

#### Contribution Guidelines

- **Maintain Simplicity**: Preserve educational clarity and Flask best practices
- **Comprehensive Documentation**: Ensure all changes are well-documented
- **Learning Examples**: Provide clear examples and usage patterns
- **Progressive Learning**: Support progressive Flask learning objectives

**Educational Standards:**
- Clear explanations for Flask-specific patterns
- Maintain beginner-friendly documentation
- Include educational comments in Python code
- Provide troubleshooting guidance for Python environments

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
- **Flask Guide**: [https://flask.palletsprojects.com/en/3.0.x/](https://flask.palletsprojects.com/en/3.0.x/)
- **pytest Documentation**: [https://docs.pytest.org/en/stable/](https://docs.pytest.org/en/stable/)
- **WSGI Protocol Fundamentals**: [PEP 3333 - Python Web Server Gateway Interface](https://peps.python.org/pep-3333/)

### Community Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/tutorial/python-flask-tutorial/issues)
- **Stack Overflow**: Tag questions with `python`, `flask`, `tutorial`
- **Python Community**: [https://www.python.org/community/](https://www.python.org/community/)
- **Flask Community**: [https://flask.palletsprojects.com/en/3.0.x/community/](https://flask.palletsprojects.com/en/3.0.x/community/)

### Version History

- **v2.0.0** - Migration to Python 3.12+ and Flask 3.1.1 from Node.js/Express.js
- Features: Single /hello endpoint, comprehensive pytest testing, Docker support with python:3.12-alpine
- Educational focus: Python WSGI fundamentals and Flask application patterns

---

**🐍 Happy Learning!** This tutorial provides a solid foundation for understanding Python web development and Flask fundamentals. Build upon these concepts to create more complex Flask applications and advance your Python web development skills.