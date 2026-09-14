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

- **Single `/hello` endpoint** returning a JSON envelope whose `message` field is 'Hello world', demonstrating basic Flask WSGI server functionality
- **Flask v3.1.1 security features** including automatic JSON serialization and modern security defaults
- **Comprehensive error handling** with 404 and 500 responses following HTTP standards using Flask decorators
- **Educational logging and monitoring patterns** for understanding Python web server behavior
- **Complete test suite with 100% code coverage** demonstrating pytest best practices and Flask testing patterns
- **Docker containerization support** for deployment learning and environment consistency with Python runtime

### Related Projects

This repository is a migration exemplar, and it holds **two sibling tutorials
under one source root**. They are siblings rather than alternatives: neither
replaces the other, and neither project reads the other's code.

- **Python Flask tutorial** — the project this README documents, with its
  source at `src/backend/`. Its `GET /hello` returns an `application/json`
  envelope in which `Hello world` is the value of a `message` field
  [src/backend/app.py:367-411].
- **Node.js tutorial** — documented at
  [`src/nodejs-tutorial/README.md`](src/nodejs-tutorial/README.md). Its
  `GET /hello` returns an 11-byte `text/plain; charset=utf-8` body whose
  bytes are exactly `Hello world`.

Node.js and Express are the runtime this tutorial migrated *from*, and that
predecessor now exists in the tree as a runnable project rather than as
leftover documentation. Each contract has exactly one authority, so the two
are never conflated: the Flask contract is documented in this README and in
[`src/backend/README.md`](src/backend/README.md), and the Node.js contract in
[the Node.js API reference](src/nodejs-tutorial/docs/api-reference.md).

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

Create a `.env` file for custom configuration. The application loads it at
import time with `load_dotenv()` [src/backend/app.py:52], so every value
below takes effect on the next start:

```bash
# Optional environment variables
FLASK_APP=app.py
FLASK_ENV=development
PORT=3000
HOST=localhost
```

**Default Configuration:**

- **PORT**: `8000` with no environment variable set — that is the
  application's own fallback [src/backend/app.py:722]. The template above
  and `src/backend/.env.example` both supply `3000`
  [src/backend/.env.example:38], the same port the container image
  configures [infrastructure/docker/Dockerfile:54]. The code default and the
  template value are different things, so every command in this README uses
  the one its own startup path establishes: `8000` when the server is started
  with no `.env` present, `3000` in the container and after this template is
  copied into place.
- **HOST**: `localhost`, which is both the code fallback
  [src/backend/app.py:721] and the template value
  [src/backend/.env.example:52], and is safe for local development
- **FLASK_ENV**: development (enables enhanced debugging)

## Usage

### Development Server

#### Start the Flask Server

```bash
# Activate virtual environment first
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate  # Windows

# Start the Flask development server on its own default host and port
python app.py

# Alternative: Start with Gunicorn for production testing
gunicorn wsgi:app

# Custom port development mode
python -m flask run --port=8080

# Development mode with debug enabled
FLASK_DEBUG=True python app.py
```

**Expected Output:**

Started as above with neither `PORT` nor `HOST` exported and no `.env` in
place, the server binds the code defaults `localhost` and `8000`
[src/backend/app.py:721-722] and logs the startup banner below
[src/backend/app.py:725-732]. Every line arrives prefixed by the logging
timestamp, logger name and level — the format configured at
[src/backend/app.py:56-58] — which is elided here for readability:

```text
🚀 Starting Flask Development Server!
==================================================
🌍 Host: localhost
🔌 Port: 8000
🎯 URL: http://localhost:8000
🌐 Endpoints:
   GET  http://localhost:8000/hello
   GET  http://localhost:8000/health
==================================================
```

#### Test the Endpoint

**Browser Access:**

```text
http://localhost:8000/hello
```

**Command Line Testing:**

```bash
# Basic request
curl http://localhost:8000/hello

# Include response headers
curl -i http://localhost:8000/hello

# Test error handling
curl http://localhost:8000/invalid

# Confirm the JSON media type the endpoint already returns
curl -H "Accept: application/json" http://localhost:8000/hello
```

**Expected Responses:**

Both responses below come from the development server started above with
`python app.py`. That path calls `app.run(..., debug=True)`
[src/backend/app.py:737-742], and Flask's JSON provider indents its output
while debug is on, so each envelope is pretty-printed here. Through the
application factory — the path Gunicorn and the pytest suite take — the same
envelopes are compact: 86 bytes for the success response rather than 99. The
[API Documentation](#api-documentation) section documents that compact form
and the complete response header set; the header lines below are abridged to
the media type, the length and the API version. The `timestamp` field changes
on every request, and every byte count quoted in this README assumes its
26-character `datetime.now().isoformat()` rendering
[src/backend/app.py:393].

✅ **Successful Request:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 99
X-API-Version: 1.0

{
  "message": "Hello world",
  "status": "success",
  "timestamp": "2026-09-14T18:01:26.253618"
}
```

❌ **Error Response:**

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
Content-Length: 198

{
  "error": "Not Found",
  "message": "The requested resource was not found on this server",
  "method": "GET",
  "path": "/invalid",
  "status": 404,
  "timestamp": "2026-09-14T18:01:26.253618"
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

Returns a JSON envelope whose `message` field carries the string
`Hello world`, demonstrating basic Flask WSGI server functionality and
Flask's `jsonify()` response helper [src/backend/app.py:367-411].

**Request:**

```http
GET /hello HTTP/1.1
Host: localhost:8000
Origin: http://localhost:3000
```

The `Origin` header is optional. It is shown because it is what makes the two
CORS headers appear in the response below.

**Response:**

Captured through the application factory — `create_app(...)`, the path
Gunicorn and the pytest suite take — where the envelope is compact and
measures 86 bytes including its trailing newline. The handler builds the
dictionary in the source order `message`, `timestamp`, `status` and hands it
to `jsonify()`, which sorts the keys, so the order below is the wire order
rather than the source order [src/backend/app.py:391-395]:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 86
X-API-Version: 1.0
X-Response-Time: 0.15ms
X-Request-ID: req_1789409191034
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
X-Permitted-Cross-Domain-Policies: none

{"message":"Hello world","status":"success","timestamp":"2026-09-14T18:06:31.034989"}
```

**Response Headers:**

Every header the application sets on a successful `/hello` response, in the
order it emits them:

- `Content-Type`: `application/json`, set explicitly by the route handler
  [src/backend/app.py:403]
- `Content-Length`: `86` through the application factory, `99` under direct
  `python app.py` execution, where debug pretty-printing indents the envelope
- `X-API-Version`: `1.0`, added by the route handler
  [src/backend/app.py:404]
- `X-Response-Time`: processing time in milliseconds, formatted to two
  decimal places by the after-request middleware [src/backend/app.py:342]
- `X-Request-ID`: per-request trace identifier of the form
  `req_<epoch-milliseconds>`, assigned by the before-request middleware
  [src/backend/app.py:317] and copied onto the response
  [src/backend/app.py:350]
- `Access-Control-Allow-Origin` and `Vary: Origin`: emitted by Flask-CORS
  **only when the request carries a matching `Origin`**. The permitted
  development origins are `http://localhost:3000` and
  `http://localhost:8000` [src/backend/app.py:271]
- `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`,
  `Referrer-Policy`, `Content-Security-Policy` and
  `X-Permitted-Cross-Domain-Policies`: the security header set applied to
  every response, with the values shown in the transcript above
  [src/backend/app.py:239-247]
- `Server`: **not sent.** The security callback pops this header from every
  response [src/backend/app.py:237], so neither the Werkzeug nor the Python
  version is disclosed

**cURL Example:**

```bash
curl -i http://localhost:8000/hello
```

**Python Requests Example:**

```python
import requests

response = requests.get('http://localhost:8000/hello')
print(response.json()['message'])  # "Hello world"
print(response.status_code)  # 200
```

**JavaScript Fetch Example:**

```javascript
fetch('http://localhost:8000/hello')
  .then(response => response.json())
  .then(data => console.log(data.message)); // "Hello world"
```

### Error Responses

Both transcripts below are the compact factory form, matching the success
response above — the form produced whenever the application is built through
`create_app(...)`, which is the path a WSGI server and the pytest suite take.
Started instead with `python app.py`, the same envelopes arrive
pretty-printed, as the [Usage](#usage) section shows.

#### 404 Not Found

Returned for undefined routes and invalid endpoints using Flask error
handlers [src/backend/app.py:501-513].

**Request:**

```bash
curl -i http://localhost:8000/nonexistent
```

**Response:**

Six fields, shown in the sorted wire order `jsonify()` produces. `path` and
`method` echo the request that was refused:

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
Content-Length: 177

{"error":"Not Found","message":"The requested resource was not found on this server","method":"GET","path":"/nonexistent","status":404,"timestamp":"2026-09-14T18:06:31.034989"}
```

#### 405 Method Not Allowed

Returned for unsupported HTTP methods on existing endpoints
[src/backend/app.py:535-552].

**Request:**

```bash
curl -i -X POST http://localhost:8000/hello
```

**Response:**

Seven fields, again in sorted wire order, and an `Allow` header built from
Werkzeug's `error.valid_methods` [src/backend/app.py:551-552]. That header
carries the method set `GET`, `HEAD` and `OPTIONS`; **its order is not
stable**, and neither is the order of the matching `allowed_methods` array,
so assert the set rather than the sequence. The byte count is unaffected,
because the same three method names are always present:

```http
HTTP/1.1 405 Method Not Allowed
Content-Type: application/json
Content-Length: 221
Allow: OPTIONS, HEAD, GET

{"allowed_methods":["OPTIONS","HEAD","GET"],"error":"Method Not Allowed","message":"The POST method is not allowed for this resource","method":"POST","path":"/hello","status":405,"timestamp":"2026-09-14T18:06:31.034989"}
```

### Security Features

**Flask v3.1.1 Security Enhancements:**

- **Server header removal** - the `Server` header is popped from every
  response, so neither the Werkzeug nor the Python version is disclosed
  [src/backend/app.py:237]
- **Security headers on every response** - `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Content-Security-Policy: default-src 'self'` and
  `X-Permitted-Cross-Domain-Policies: none` [src/backend/app.py:239-247]
- **Automatic JSON serialization** - Built-in JSON response handling with
  security defaults through Flask's `jsonify()` helper
- **CORS integration** - Flask-CORS extension for secure cross-origin
  request handling, restricted to the development origins
  `http://localhost:3000` and `http://localhost:8000`
  [src/backend/app.py:271]
- **Generic error messages** - Prevents information disclosure in production
  environments

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

The endpoint returns a JSON envelope, so the greeting is compared as a field
value rather than as the whole response body [src/backend/app.py:391-404]:

```python
# Test /hello endpoint response and headers
def test_hello_endpoint(client):
    """Test Flask /hello endpoint returns the JSON greeting envelope."""
    response = client.get('/hello')

    assert response.status_code == 200
    assert response.content_type == 'application/json'

    json_data = response.get_json()
    assert json_data['message'] == 'Hello world'
    assert json_data['status'] == 'success'
```

**Error Handling Testing:**

The 404 handler puts the reason phrase in `error` and a sentence in
`message`, so each field is asserted against the value the handler actually
sets [src/backend/app.py:501-508]:

```python
# Test 404 error handling with Flask error handlers
def test_404_error_handling(client):
    """Test Flask 404 error handler returns JSON response."""
    response = client.get('/unknown')

    assert response.status_code == 404
    assert response.content_type == 'application/json'

    json_data = response.get_json()
    assert json_data['status'] == 404
    assert json_data['error'] == 'Not Found'
    assert json_data['path'] == '/unknown'
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

Install and use Supervisor for production process management. The bind
address below uses `8000`, the port the application falls back to when no
`PORT` is exported [src/backend/app.py:722]:

```bash
# Install Supervisor
pip install supervisor

# Create configuration file
cat > supervisord.conf << EOF
[program:flask-tutorial]
command=gunicorn --bind 0.0.0.0:8000 wsgi:app
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

The image sets `PORT=3000` [infrastructure/docker/Dockerfile:54] and exposes
that port [infrastructure/docker/Dockerfile:120], so the container side of
every mapping below is 3000:

```bash
# Run development container with volume mounting
docker run -p 3000:3000 -v $(pwd)/src/backend:/usr/src/app flask-tutorial:dev

# Run production container with Gunicorn
docker run -p 3000:3000 flask-tutorial:prod

# Run with custom port
docker run -p 8080:3000 -e PORT=3000 flask-tutorial:prod
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
      - "3000:3000"
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
   - **Port**: 8000

### Environment Configuration

**Required Environment Variables for Deployment:**

| Variable | Default | Purpose | Platform Notes |
|----------|---------|---------|----------------|
| `PORT` | 8000 | Server port | Heroku/Azure set automatically |
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
    port = int(os.getenv('PORT', '8000'))
    host = os.getenv('HOST', '0.0.0.0')
    app.run(host=host, port=port)
```

Those two fallbacks are the ones `src/backend/wsgi.py` uses
[src/backend/wsgi.py:105-106]: `8000` for the port, and `0.0.0.0` for the
host so that a containerized deployment is reachable.

## Troubleshooting

### Common Issues

#### Port Already in Use

**Error:**
```
OSError: [Errno 48] Address already in use
```

**Solutions:**
```bash
# Find process using port 8000
lsof -ti:8000 | xargs kill  # macOS/Linux
netstat -ano | findstr :8000  # Windows

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
curl -v http://localhost:8000/hello

# Test with specific headers
curl -H "Accept: application/json" http://localhost:8000/hello

# Test timeout behavior
curl --max-time 5 http://localhost:8000/hello
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
curl -w "@curl-format.txt" http://localhost:8000/hello

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
