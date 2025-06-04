# Node.js Hello World Tutorial

[![Node.js Version](https://img.shields.io/badge/node.js-v22.16.0%20LTS-brightgreen)](https://nodejs.org/)
[![Express.js Version](https://img.shields.io/badge/express.js-v5.1.0-blue)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/tutorial/nodejs-hello-tutorial)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/tutorial/nodejs-hello-tutorial)

A simple Node.js tutorial application demonstrating fundamental HTTP server concepts using Express.js v5.1.0 and Node.js v22.16.0 LTS through hands-on HTTP server implementation with a single `/hello` endpoint returning 'Hello world'.

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

This tutorial application is designed to provide hands-on experience with fundamental Node.js and Express.js concepts:

- **Understanding Node.js HTTP server fundamentals** - Learn how Node.js handles HTTP requests and responses
- **Learning Express.js framework basics and routing** - Master Express.js middleware and route handling patterns
- **Implementing RESTful API endpoints** - Create and test HTTP endpoints following REST principles
- **Understanding request-response cycles** - Comprehend the complete HTTP request-response flow
- **Learning error handling patterns** - Implement robust error handling and status code management
- **Understanding testing with Jest and Supertest** - Write comprehensive tests for HTTP endpoints

### Technology Stack

**Runtime Environment:**
- **Node.js v22.16.0 LTS 'Jod'** - Active LTS support extending until October 2025, providing stability for educational use with V8 engine updates and enhanced performance

**Web Framework:**
- **Express.js v5.1.0** - Latest version with security enhancements including ReDoS protection through path-to-regexp@8.x, automatic promise rejection handling, and framework fingerprinting prevention

**Testing Framework:**
- **Jest v29.7.0** - Zero-configuration testing framework with built-in coverage reporting and snapshot testing capabilities
- **Supertest v7.1.1** - HTTP endpoint testing library providing fluent assertions for API testing

**Containerization (Optional):**
- **Docker** - Multi-stage builds with Alpine Linux for minimal resource usage and deployment learning

### Project Features

- **Single `/hello` endpoint** returning 'Hello world' response demonstrating basic HTTP server functionality
- **Express.js v5 security features** including ReDoS protection and automatic promise handling
- **Comprehensive error handling** with 404 and 500 responses following HTTP standards
- **Educational logging and monitoring patterns** for understanding server behavior
- **Complete test suite with 100% code coverage** demonstrating testing best practices
- **Docker containerization support** for deployment learning and environment consistency

## Prerequisites

### System Requirements

| Component | Minimum Version | Recommended | Purpose |
|-----------|----------------|-------------|---------|
| **Node.js** | v22.16.0 LTS | Latest LTS | JavaScript runtime environment |
| **npm** | v10.0.0 | Latest | Package manager (bundled with Node.js) |
| **Memory** | 100MB RAM | 200MB | Application runtime requirements |
| **Disk Space** | 50MB | 100MB | Dependencies and project files |

### Installation Links

- **Node.js Official**: [https://nodejs.org/en/download/](https://nodejs.org/en/download/) - Official Node.js installers for all platforms
- **Node Version Manager**: [https://github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm) - Manage multiple Node.js versions
- **Docker (Optional)**: [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/) - For containerization learning

### Verification Commands

Verify your development environment meets the requirements:

```bash
# Check Node.js version (should show v22.16.0 or higher)
node --version

# Check npm version (should show v10.0.0 or higher)
npm --version

# Optional: Check Docker version for containerization
docker --version
```

## Installation

### 1. Clone Repository

```bash
# Clone the tutorial repository
git clone https://github.com/tutorial/nodejs-hello-tutorial.git

# Navigate to project directory
cd nodejs-hello-tutorial

# Navigate to backend source directory
cd src/backend
```

### 2. Install Dependencies

```bash
# Install Express.js v5.1.0 and development dependencies
npm install

# Verify installed packages
npm list

# Optional: Run security audit
npm audit
```

**Expected Dependencies:**
- `express@^5.1.0` - Web framework for HTTP server functionality
- `jest@^29.7.0` - Testing framework (development dependency)
- `supertest@^7.1.1` - HTTP testing library (development dependency)

### 3. Environment Setup (Optional)

Create a `.env` file for custom configuration:

```bash
# Optional environment variables
PORT=3000
HOST=localhost
NODE_ENV=development
```

**Default Configuration:**
- **PORT**: 3000 (customizable via environment variable)
- **HOST**: localhost (safe for local development)
- **NODE_ENV**: development (enables enhanced logging)

## Usage

### Development Server

#### Start the Server

```bash
# Start the HTTP server
npm start

# Alternative: Direct Node.js execution
node server.js

# Development mode with enhanced logging
npm run dev
```

**Expected Output:**
```
🚀 Server Successfully Started!
============================================================
⏰ Startup time: 2024-01-15T10:30:00.000Z
🌐 Server listening on: http://localhost:3000
📡 Host: localhost
🔌 Port: 3000

🎯 Available Endpoints:
   GET  http://localhost:3000/hello  →  Returns "Hello world"

🔧 Testing Commands:
   curl http://localhost:3000/hello
   curl -i http://localhost:3000/hello  # Include response headers

🌐 Browser Access:
   Open: http://localhost:3000/hello
```

#### Test the Endpoint

**Browser Access:**
```
http://localhost:3000/hello
```

**Command Line Testing:**
```bash
# Basic request
curl http://localhost:3000/hello

# Include response headers
curl -i http://localhost:3000/hello

# Test error handling
curl http://localhost:3000/invalid
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
PORT=8080 npm start

# Verify custom port
curl http://localhost:8080/hello
```

**Environment-Specific Logging:**
```bash
# Enhanced development logging
NODE_ENV=development npm start

# Production logging mode
NODE_ENV=production npm start
```

## API Documentation

### Endpoints

#### GET /hello

Returns a simple 'Hello world' greeting demonstrating basic HTTP server functionality.

**Request:**
```http
GET /hello HTTP/1.1
Host: localhost:3000
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
- `X-Powered-By`: *Disabled for security*

**cURL Example:**
```bash
curl -i http://localhost:3000/hello
```

**JavaScript Fetch Example:**
```javascript
fetch('http://localhost:3000/hello')
  .then(response => response.text())
  .then(data => console.log(data)); // "Hello world"
```

### Error Responses

#### 404 Not Found

Returned for undefined routes and invalid endpoints.

**Request:**
```bash
curl http://localhost:3000/nonexistent
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
curl -X POST http://localhost:3000/hello
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

**Express.js v5.1.0 Security Enhancements:**
- **X-Powered-By header disabled** - Prevents framework fingerprinting
- **ReDoS protection** - path-to-regexp@8.x prevents regular expression denial of service
- **Automatic promise rejection handling** - Enhanced error management
- **Generic error messages** - Prevents information disclosure

## Testing

### Test Execution

#### Run All Tests

```bash
# Execute complete test suite
npm test

# Run tests in watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# CI/CD optimized testing
npm run test:ci
```

#### Test Structure

**Test Files:**
- `tests/app.test.js` - Express.js application testing with Supertest
- `tests/server.test.js` - HTTP server lifecycle and configuration testing

**Testing Framework Stack:**
- **Jest v29.7.0** - Zero-configuration testing with built-in coverage
- **Supertest v7.1.1** - HTTP endpoint testing with fluent assertions

#### Coverage Reports

**Target Coverage Metrics:**
- **Line Coverage**: 100% (comprehensive code coverage)
- **Function Coverage**: 100% (all functions tested)
- **Branch Coverage**: 100% (all code paths covered)
- **Statement Coverage**: 100% (complete statement testing)

**Coverage Report Example:**
```bash
npm run test:coverage
```

```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files            |     100 |      100 |     100 |     100 |
 server.js           |     100 |      100 |     100 |     100 |
 app.js              |     100 |      100 |     100 |     100 |
----------------------|---------|----------|---------|---------|
```

#### Test Examples

**Endpoint Testing:**
```javascript
// Test /hello endpoint response and headers
describe('GET /hello', () => {
  it('should return "Hello world" with 200 status', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200)
      .expect('Content-Type', /text\/plain/);
    
    expect(response.text).toBe('Hello world');
  });
});
```

**Error Handling Testing:**
```javascript
// Test 404 error handling
describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    await request(app)
      .get('/unknown')
      .expect(404)
      .expect('Content-Type', /application\/json/);
  });
});
```

## Deployment

### Local Deployment

#### Production Mode

```bash
# Run in production mode
NODE_ENV=production npm start

# Custom port for production
PORT=8080 NODE_ENV=production npm start
```

#### Process Management (Optional)

Install and use PM2 for production process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start server.js --name "nodejs-tutorial"

# Monitor application
pm2 list
pm2 logs nodejs-tutorial

# Restart application
pm2 restart nodejs-tutorial

# Stop application
pm2 stop nodejs-tutorial
```

### Docker Deployment

#### Build Docker Images

```bash
# Development build with debugging tools
docker build --target development -t nodejs-tutorial:dev .

# Production build optimized for deployment
docker build --target production -t nodejs-tutorial:prod .
```

#### Run Docker Containers

```bash
# Run development container with volume mounting
docker run -p 3000:3000 -v $(pwd)/src/backend:/usr/src/app nodejs-tutorial:dev

# Run production container
docker run -p 3000:3000 nodejs-tutorial:prod

# Run with custom port
docker run -p 8080:3000 -e PORT=3000 nodejs-tutorial:prod
```

#### Docker Compose (Optional)

```yaml
# docker-compose.yml
version: '3.8'
services:
  nodejs-tutorial:
    build:
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
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
heroku create nodejs-hello-tutorial

# Deploy application
git push heroku main

# Open deployed application
heroku open
```

#### Render Deployment

1. Connect GitHub repository to Render
2. Select Node.js environment
3. Configure build and start commands:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

#### Railway Deployment

Railway automatically detects Node.js applications through `package.json`:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure app settings:
   - **Framework**: Node.js
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **Port**: 3000

### Environment Configuration

**Required Environment Variables for Deployment:**

| Variable | Default | Purpose | Platform Notes |
|----------|---------|---------|----------------|
| `PORT` | 3000 | Server port | Heroku/Render set automatically |
| `NODE_ENV` | development | Environment mode | Set to 'production' for deployment |
| `HOST` | localhost | Host binding | Use '0.0.0.0' for containerized deployment |

**Platform-Specific Configuration:**

```javascript
// server.js - Dynamic port configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## Troubleshooting

### Common Issues

#### Port Already in Use

**Error:**
```
Error: EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Use different port
PORT=8080 npm start

# Kill specific process
kill -9 <process-id>
```

#### Node.js Version Compatibility

**Error:**
```
Error: Express.js v5 requires Node.js v18+
```

**Solutions:**
```bash
# Check current Node.js version
node --version

# Update Node.js to v22.16.0 LTS
# Download from https://nodejs.org/

# Using Node Version Manager (nvm)
nvm install 22.16.0
nvm use 22.16.0
nvm alias default 22.16.0
```

#### Permission Denied

**Error:**
```
Error: EACCES: permission denied, bind to port 80
```

**Solutions:**
```bash
# Use port 3000 or higher (recommended)
PORT=3000 npm start

# Check port permissions
# Ports below 1024 require administrator privileges

# For development, always use ports above 1024
PORT=3000 npm start
```

#### Dependencies Installation Failed

**Error:**
```
npm ERR! peer dep missing: express@^5.1.0
```

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify Node.js and npm versions
node --version  # Should be v22.16.0+
npm --version   # Should be v10.0.0+

# Install specific Express.js version
npm install express@^5.1.0
```

### Debugging Tips

#### Verbose Logging

```bash
# Enable development logging
NODE_ENV=development npm start

# Debug mode with enhanced output
DEBUG=express:* npm start
```

#### Network Testing

```bash
# Test endpoint with verbose output
curl -v http://localhost:3000/hello

# Test with specific headers
curl -H "Accept: text/plain" http://localhost:3000/hello

# Test timeout behavior
curl --max-time 5 http://localhost:3000/hello
```

#### Docker Debugging

```bash
# Debug Docker container
docker run -it nodejs-tutorial:dev sh

# View container logs
docker logs <container-id>

# Inspect running container
docker exec -it <container-id> sh
```

### Performance Issues

#### Slow Startup

**Potential Causes:**
- Node.js version compatibility
- Dependency installation issues
- System resource constraints

**Solutions:**
```bash
# Verify system resources
free -h  # Linux/macOS memory check
top      # Process monitoring

# Optimize npm install
npm ci --only=production

# Check Node.js performance
node --trace-warnings server.js
```

#### Slow Response Times

**Monitoring:**
```bash
# Monitor response times
curl -w "@curl-format.txt" http://localhost:3000/hello

# Create curl-format.txt
echo "Response Time: %{time_total}s\nStatus Code: %{http_code}" > curl-format.txt
```

**Performance Targets:**
- **Response Time**: < 100ms for /hello endpoint
- **Memory Usage**: < 50MB for tutorial application
- **Startup Time**: < 3 seconds for server initialization

## Contributing

### Development Workflow

#### 1. Fork Repository

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/nodejs-hello-tutorial.git
cd nodejs-hello-tutorial
```

#### 2. Create Feature Branch

```bash
# Create feature branch from main
git checkout -b feature/your-feature-name

# Make changes and test
npm test

# Ensure code quality
npm run test:coverage
```

#### 3. Submit Changes

```bash
# Add and commit changes
git add .
git commit -m "Add: clear description of changes"

# Push to your fork
git push origin feature/your-feature-name

# Submit pull request on GitHub
```

### Code Standards

#### JavaScript Style Guidelines

- **ES6+ Syntax**: Use modern JavaScript features
- **Consistent Formatting**: Follow existing code patterns
- **Clear Variable Names**: Use descriptive, meaningful names
- **Function Documentation**: Include JSDoc comments for functions

#### Testing Requirements

- **100% Test Coverage**: Maintain complete test coverage
- **Test Documentation**: Clear test descriptions and expectations
- **Error Case Testing**: Include negative test scenarios
- **Performance Testing**: Verify response time requirements

#### Commit Message Format

```bash
# Format: Type: Description
git commit -m "Add: new /health endpoint for monitoring"
git commit -m "Fix: resolve port binding error on Windows"
git commit -m "Update: improve error handling documentation"
git commit -m "Test: add integration tests for Docker deployment"
```

### Educational Focus

#### Contribution Guidelines

- **Maintain Simplicity**: Preserve educational clarity and simplicity
- **Comprehensive Documentation**: Ensure all changes are well-documented
- **Learning Examples**: Provide clear examples and usage patterns
- **Progressive Learning**: Support progressive learning objectives

**Educational Standards:**
- Clear explanations for code changes
- Maintain beginner-friendly documentation
- Include educational comments in code
- Provide troubleshooting guidance

#### Code Review Criteria

- **Educational Value**: Does the change enhance learning?
- **Simplicity**: Is the implementation clear and understandable?
- **Documentation**: Are changes properly documented?
- **Testing**: Is the change properly tested?
- **Compatibility**: Does it maintain Node.js v22.16.0 LTS compatibility?

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

- **Node.js Official Documentation**: [https://nodejs.org/docs/](https://nodejs.org/docs/)
- **Express.js Guide**: [https://expressjs.com/en/guide/](https://expressjs.com/en/guide/)
- **Jest Testing Framework**: [https://jestjs.io/docs/getting-started](https://jestjs.io/docs/getting-started)
- **HTTP Protocol Fundamentals**: [MDN HTTP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP)

### Community Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/tutorial/nodejs-hello-tutorial/issues)
- **Stack Overflow**: Tag questions with `nodejs`, `express`, `tutorial`
- **Node.js Community**: [https://nodejs.org/en/get-involved/](https://nodejs.org/en/get-involved/)

### Version History

- **v1.0.0** - Initial release with Node.js v22.16.0 LTS and Express.js v5.1.0
- Features: Single /hello endpoint, comprehensive testing, Docker support
- Educational focus: HTTP server fundamentals and Express.js basics

---

**🎓 Happy Learning!** This tutorial provides a solid foundation for understanding Node.js and Express.js fundamentals. Build upon these concepts to create more complex applications and advance your web development skills.