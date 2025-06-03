# Node.js Tutorial Backend - Hello World HTTP Server

## Overview

This educational Node.js tutorial demonstrates fundamental HTTP server concepts using Express.js v5.1.0 and Node.js v22.16.0 LTS with a single `/hello` endpoint returning 'Hello world' response. The application serves as a practical starting point for learning server-side JavaScript development, RESTful API design, and modern web development patterns.

### Project Purpose and Educational Objectives

- **Understanding HTTP request-response cycle**: Learn how web servers process incoming requests and generate responses
- **Express.js framework fundamentals**: Master the de facto standard server framework for Node.js used by major companies including Fox Sports, PayPal, Uber and IBM
- **Node.js runtime environment concepts**: Explore the JavaScript runtime built on Chrome's V8 engine with event-driven, non-blocking I/O model
- **RESTful API endpoint design**: Implement industry-standard API patterns and best practices

### Technology Stack Overview

- **Node.js v22.16.0 LTS 'Jod'**: Active LTS runtime providing stability for educational use with support extending until October 2025
- **Express.js v5.1.0**: Latest web framework with enhanced security features including ReDoS protection and automatic promise rejection handling
- **npm v11.4.1**: Package manager for dependency management and script execution
- **JavaScript ES6+**: Modern syntax including arrow functions, template literals, and async/await patterns

### Learning Outcomes and Skills Developed

Upon completion of this tutorial, you will understand:
- HTTP server creation and lifecycle management
- Express.js middleware and routing patterns  
- Stateless application design principles
- Environment-based configuration management
- Graceful shutdown procedures and error handling
- Security best practices with Express.js v5
- Modern JavaScript features and Node.js patterns

## Prerequisites

### Node.js v22.16.0 LTS Installation

The application requires Node.js v22.16.0 LTS or higher for compatibility with Express.js v5.1.0. Node.js LTS provides critical bug fixes, security updates, and performance improvements with extended support.

**Installation Methods:**
- **Official Installer**: Download from [nodejs.org](https://nodejs.org/) 
- **Node Version Manager (nvm)**: Recommended for managing multiple Node.js versions
  ```bash
  nvm install 22.16.0
  nvm use 22.16.0
  ```

### npm v11.4.1 Package Manager

npm comes bundled with Node.js and provides dependency management capabilities. Verify installation:
```bash
npm --version  # Should show v11.4.1 or higher
```

### Basic JavaScript and HTTP Knowledge

Familiarity with the following concepts enhances learning effectiveness:
- JavaScript ES6+ syntax and features
- HTTP protocol fundamentals (methods, status codes, headers)
- Asynchronous programming with Promises and async/await
- JSON data format and REST architectural principles

### Command Line Interface Familiarity

Basic terminal/command prompt skills are required for:
- Navigating directories with `cd` command
- Installing dependencies with `npm install`
- Starting the server with `npm start`
- Testing endpoints with `curl` or similar tools

## Installation

### Repository Cloning

Clone the tutorial application to your local development environment:
```bash
git clone <repository-url>
cd nodejs-hello-tutorial/src/backend
```

### Dependency Installation with npm install

Install Express.js and all required dependencies:
```bash
npm install
```

This command downloads Express.js v5.1.0 and creates the `node_modules` directory with all dependencies. The `package-lock.json` file ensures exact version consistency across different environments.

### Environment Configuration

The application supports environment-based configuration for deployment flexibility:

**Environment Variables:**
- `PORT`: Server port (default: 3000)
- `HOST`: Host address (default: localhost) 
- `NODE_ENV`: Environment mode (development/production/test)
- `LOG_LEVEL`: Logging verbosity (info/warn/error)

**Example .env file (optional):**
```bash
PORT=3000
HOST=localhost
NODE_ENV=development
LOG_LEVEL=info
```

### Verification Steps

Confirm successful installation:
```bash
# Verify Node.js version
node --version  # Should show v22.16.0 or higher

# Verify npm version  
npm --version   # Should show v11.4.1 or higher

# Verify Express.js installation
npm list express  # Should show ^5.1.0

# Run basic functionality test
npm test  # Execute test suite to verify setup
```

## Usage

### Starting the Server

Launch the HTTP server using npm scripts:
```bash
npm start
```

**Expected Output:**
```
Server listening on port 3000
Environment: development
Express.js v5.1.0 initialized successfully
```

The server typically starts within 3 seconds and consumes less than 50MB of memory during operation.

### Testing the /hello Endpoint

The application exposes a single HTTP GET endpoint at `/hello` that demonstrates basic routing and response generation.

**Browser Access:**
Navigate to `http://localhost:3000/hello` in any web browser to see the "Hello world" response.

**Command Line Testing with curl:**
```bash
curl http://localhost:3000/hello
```

**Expected Response:**
```
Hello world
```

**HTTP Response Details:**
- Status Code: `200 OK`
- Content-Type: `text/plain; charset=utf-8`
- Content-Length: `11`
- Response Time: < 100ms

### Command Line Testing Examples

**Basic GET request:**
```bash
curl -i http://localhost:3000/hello
```

**Output with headers:**
```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
Date: Mon, 01 Jan 2024 12:00:00 GMT

Hello world
```

**Testing invalid routes:**
```bash
curl -i http://localhost:3000/invalid
# Returns 404 Not Found
```

## API Documentation

### GET /hello Endpoint Specification

The core educational endpoint demonstrating fundamental HTTP server functionality.

**Endpoint Details:**
- **URL**: `/hello`
- **Method**: `GET`
- **Description**: Returns a simple 'Hello world' greeting to demonstrate basic HTTP request-response cycle
- **Authentication**: None required
- **Parameters**: None

### Request Format and Headers

**HTTP Request Example:**
```http
GET /hello HTTP/1.1
Host: localhost:3000
User-Agent: curl/7.68.0
Accept: */*
```

**Required Headers:** None
**Optional Headers:** Standard HTTP headers are accepted but not required

### Response Format and Headers

**Successful Response (200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
X-Powered-By: Express (configurable)
Date: Mon, 01 Jan 2024 12:00:00 GMT

Hello world
```

**Response Body:** Plain text string "Hello world"

### Error Handling and Status Codes

The application implements comprehensive error handling following HTTP standards:

**404 Not Found - Route not found:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Not Found",
  "status": 404,
  "message": "The requested route does not exist"
}
```

**405 Method Not Allowed - Invalid HTTP method:**
```http
HTTP/1.1 405 Method Not Allowed
Content-Type: application/json

{
  "error": "Method Not Allowed", 
  "status": 405,
  "message": "POST method not supported for /hello endpoint"
}
```

**500 Internal Server Error:**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Internal Server Error",
  "status": 500,
  "message": "An unexpected error occurred"
}
```

### Example Requests and Responses

**Valid Request Example:**
```bash
curl -X GET http://localhost:3000/hello \
  -H "Accept: text/plain" \
  -v
```

**Invalid Method Example:**
```bash
curl -X POST http://localhost:3000/hello \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -v
```

## Testing

### Jest Testing Framework Setup

The application uses Jest v29.7.0 as the primary testing framework, providing zero-configuration testing with built-in coverage reporting and assertion libraries.

**Jest Benefits:**
- Zero configuration setup - works out of the box
- Built-in code coverage collection without additional tools
- Snapshot testing capabilities for response validation
- Fast parallel test execution
- Extensive community support and documentation

### Running Unit Tests

Execute the complete test suite:
```bash
npm test
```

**Test Categories:**
- **Unit Tests**: Individual component functionality validation
- **Integration Tests**: HTTP endpoint and request-response cycle testing
- **Error Handling Tests**: Exception scenarios and error response validation

### Code Coverage Reports

Generate comprehensive coverage analysis:
```bash
npm run test:coverage
```

**Coverage Targets:**
- Line Coverage: 100% (complete code execution)
- Function Coverage: 100% (all functions tested)
- Branch Coverage: 100% (all conditional paths)
- Statement Coverage: 100% (all code statements)

**Coverage Report Output:**
```
==================== Coverage summary ====================
Statements   : 100% ( 15/15 )
Branches     : 100% ( 4/4 )
Functions    : 100% ( 3/3 )
Lines        : 100% ( 15/15 )
===========================================================
```

### Supertest HTTP Endpoint Testing

Supertest v7.1.1 provides powerful HTTP assertion capabilities for testing Express.js applications:

**Example Test Cases:**
```javascript
// Basic endpoint testing
describe('GET /hello', () => {
  it('should return "Hello world" with 200 status', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200)
      .expect('Content-Type', /text\/plain/);
    
    expect(response.text).toBe('Hello world');
  });
});

// Error handling testing
describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    await request(app)
      .get('/unknown')
      .expect(404);
  });
});
```

**Test Execution Commands:**
- `npm test`: Run all tests once
- `npm run test:watch`: Watch mode for development
- `npm run test:coverage`: Generate coverage report
- `npm run test:ci`: CI-optimized test execution

## Project Structure

### File and Directory Layout

```
src/backend/
├── app.js                 # Express.js application with /hello endpoint
├── server.js              # HTTP server creation and lifecycle management
├── package.json           # NPM package configuration and dependencies
├── package-lock.json      # Dependency version lock file
├── jest.config.js         # Jest testing framework configuration
├── README.md              # This documentation file
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore patterns
└── tests/
    ├── app.test.js        # Express application unit tests
    └── server.test.js     # HTTP server integration tests
```

### Component Responsibilities

**app.js - Express Application Core:**
- Express.js application initialization with v5.1.0 features
- `/hello` endpoint implementation and routing logic
- Middleware configuration for request processing
- Error handling middleware with automatic promise rejection handling

**server.js - HTTP Server Management:**
- HTTP server creation using Node.js built-in modules
- Port configuration and environment variable handling
- Graceful shutdown procedures and signal handling
- Server lifecycle logging and monitoring

**package.json - Project Configuration:**
- Project metadata and dependency declarations
- NPM scripts for development workflow automation
- Node.js engine requirements and version constraints
- Express.js v5.1.0 dependency specification

### Configuration Files

**jest.config.js - Testing Configuration:**
```javascript
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
```

**.env.example - Environment Template:**
```bash
# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# Logging Configuration  
LOG_LEVEL=info

# Application Settings
EXPRESS_TRUST_PROXY=false
```

### Testing Structure

**tests/app.test.js - Application Unit Tests:**
- Express application initialization testing
- Route handler functionality validation
- Middleware execution order verification
- Response format and content validation

**tests/server.test.js - Server Integration Tests:**
- HTTP server startup and shutdown procedures
- Port binding and connection handling
- Environment configuration testing
- Performance and resource usage validation

## Educational Context

### HTTP Server Fundamentals

This tutorial demonstrates core HTTP server concepts essential for web development:

**Request-Response Cycle:**
1. **Client Request**: HTTP client sends GET request to server
2. **Server Processing**: Express.js routes request to appropriate handler
3. **Business Logic**: Handler processes request and generates response
4. **Response Transmission**: Server sends HTTP response back to client

**Key Learning Concepts:**
- HTTP protocol mechanics and message structure
- Status codes and their semantic meanings
- Header management and content type negotiation
- Stateless communication principles

### Express.js Framework Concepts

Express.js v5.1.0 provides robust tooling for HTTP servers with enhanced security and simplified error handling:

**Framework Philosophy:**
- Small, robust tooling for HTTP servers
- Unopinionated and flexible application structure
- Extensive middleware ecosystem for functionality extension
- Production-ready performance and security features

**Express.js v5 Enhancements:**
- **ReDoS Protection**: Updated path-to-regexp@8.x prevents regular expression denial of service attacks
- **Promise Handling**: Automatic forwarding of rejected promises to error-handling middleware
- **Node.js 18+ Support**: Optimized for modern Node.js features and performance improvements

### Node.js Runtime Understanding

Node.js v22.16.0 LTS provides a JavaScript runtime built on Chrome's V8 engine:

**Runtime Characteristics:**
- **Event-Driven Architecture**: Non-blocking I/O operations using event loops
- **Single-Threaded Model**: Main thread handles requests with worker threads for I/O
- **NPM Ecosystem**: Access to world's largest software registry with 3.1 million packages
- **Cross-Platform Compatibility**: Consistent behavior across Windows, macOS, and Linux

### Modern JavaScript Patterns

The application demonstrates contemporary JavaScript development practices:

**ES6+ Features Utilized:**
- **Arrow Functions**: Concise callback syntax for event handlers
- **Template Literals**: String interpolation for dynamic content generation
- **Async/Await**: Promise-based asynchronous operation handling
- **Destructuring Assignment**: Clean parameter extraction from objects
- **Module Imports/Exports**: Modern code organization patterns

## Troubleshooting

### Port Binding Issues

**Problem:** Port 3000 already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. **Kill existing process:**
   ```bash
   # Find process using port 3000
   lsof -ti:3000 | xargs kill
   
   # Or on Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Use alternative port:**
   ```bash
   PORT=3001 npm start
   ```

3. **Check for other applications:**
   Common applications that use port 3000 include other development servers, React applications, and database tools.

### Dependency Installation Problems

**Problem:** npm install fails with permission errors
```
npm ERR! Error: EACCES: permission denied
```

**Solutions:**
1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```

2. **Fix npm permissions (Linux/macOS):**
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

3. **Use npx for one-time execution:**
   ```bash
   npx create-node-app tutorial-app
   ```

### Node.js Version Compatibility

**Problem:** Express.js v5 requires Node.js 18 or higher
```
npm ERR! peer dep missing: node >=18.0.0
```

**Solutions:**
1. **Update Node.js to LTS version:**
   ```bash
   # Using nvm (recommended)
   nvm install 22.16.0
   nvm use 22.16.0
   
   # Verify version
   node --version
   ```

2. **Check project .nvmrc file:**
   ```bash
   # If .nvmrc exists
   nvm use
   ```

### Testing Framework Issues

**Problem:** Jest tests failing with module import errors
```
SyntaxError: Cannot use import statement outside a module
```

**Solutions:**
1. **Verify Jest configuration:**
   ```javascript
   // jest.config.js
   module.exports = {
     testEnvironment: 'node',
     transform: {}
   };
   ```

2. **Check package.json test script:**
   ```json
   {
     "scripts": {
       "test": "jest --no-cache --detectOpenHandles"
     }
   }
   ```

3. **Clear Jest cache:**
   ```bash
   npm test -- --clearCache
   ```

### Common Server Issues

**Problem:** Server starts but endpoint not responding
```
curl: (7) Failed to connect to localhost port 3000
```

**Diagnostic Steps:**
1. **Verify server is listening:**
   ```bash
   netstat -tlnp | grep :3000
   ```

2. **Check application logs:**
   ```bash
   DEBUG=express:* npm start
   ```

3. **Test with verbose curl:**
   ```bash
   curl -v http://localhost:3000/hello
   ```

## Next Steps

### Adding Database Integration

Progress to more advanced tutorials incorporating data persistence:

**Recommended Learning Path:**
1. **MongoDB with Mongoose**: NoSQL database integration for document-based storage
2. **PostgreSQL with Sequelize**: Relational database with ORM for structured data
3. **Redis for Caching**: In-memory data structure store for session management
4. **Database Migration Strategies**: Schema management and version control

**Example Database Integration:**
```javascript
// MongoDB connection example
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/tutorial', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

### Implementing Authentication

Enhance security with user management and access control:

**Authentication Patterns:**
1. **JWT Token Authentication**: Stateless authentication for APIs
2. **Session-Based Authentication**: Server-side session management
3. **OAuth 2.0 Integration**: Third-party authentication providers
4. **Multi-Factor Authentication**: Enhanced security measures

**Libraries and Tools:**
- **Passport.js**: Authentication middleware for Node.js
- **bcrypt**: Password hashing and salting
- **jsonwebtoken**: JWT token generation and validation
- **express-session**: Session management middleware

### Building RESTful APIs

Expand beyond the single endpoint to full CRUD operations:

**REST Architecture Principles:**
1. **Resource-Based URLs**: Logical resource organization
2. **HTTP Method Semantics**: Proper use of GET, POST, PUT, DELETE
3. **Stateless Communication**: No server-side session dependencies
4. **Uniform Interface**: Consistent API design patterns

**Advanced API Features:**
- Request validation and sanitization
- Response pagination and filtering
- Rate limiting and throttling
- API versioning strategies
- OpenAPI/Swagger documentation

### Production Deployment Considerations

Prepare applications for production environments:

**Deployment Platforms:**
1. **Platform-as-a-Service (PaaS)**: Heroku, Render, Railway for simplified deployment
2. **Cloud Providers**: AWS, Google Cloud, Microsoft Azure for scalable infrastructure
3. **Container Orchestration**: Docker and Kubernetes for microservices architecture
4. **Content Delivery Networks**: CloudFlare, AWS CloudFront for global distribution

**Production Optimizations:**
- Environment-specific configuration management
- Process monitoring and automatic restart capabilities
- Load balancing and horizontal scaling strategies
- Security hardening and vulnerability assessment
- Performance monitoring and observability tools

**Recommended Tools:**
- **PM2**: Process manager for Node.js applications
- **nginx**: Reverse proxy and load balancer
- **Docker**: Containerization for consistent deployment
- **Monitoring**: New Relic, DataDog, or Prometheus for application observability

---

## Performance Characteristics

- **Startup Time**: < 3 seconds
- **Memory Usage**: < 50MB during operation
- **Response Time**: < 100ms for /hello endpoint
- **Concurrent Requests**: 100+ supported through Node.js event loop
- **Test Execution**: < 30 seconds for complete test suite

## Security Considerations

### Express.js v5 Security Features
- ReDoS protection through path-to-regexp@8.x upgrade
- Automatic promise rejection handling prevents unhandled promise errors
- X-Powered-By header removal for framework fingerprinting prevention

### Node.js LTS Security Benefits
- Active LTS security patches until October 2025
- Critical bug fixes and vulnerability updates
- Modern JavaScript security features and runtime protections

### Educational Security Practices
- Generic error messages preventing information disclosure
- Secure environment variable handling
- Minimal dependency surface area reduces attack vectors
- Input validation through Express.js routing patterns

## License Information

**License**: MIT License

**Description**: Open source educational project suitable for learning and modification

**Permissions**: Commercial use, modification, distribution, private use

**Limitations**: No liability or warranty provided

## Contribution Guidelines

### Educational Focus
Maintain simplicity and educational clarity in all contributions. The primary goal is learning effectiveness rather than feature completeness.

### Code Standards  
Follow existing patterns with clear comments and comprehensive documentation. All code should be self-explanatory for educational purposes.

### Testing Requirements
Maintain 100% test coverage for educational demonstration. Any new functionality must include corresponding test cases.

### Documentation Updates
Update README.md for any functional changes or additions. Documentation should reflect current implementation accurately.

---

**Happy Learning!** This tutorial provides a solid foundation for understanding Node.js and Express.js fundamentals. Continue exploring the vast ecosystem of Node.js libraries and frameworks to build more complex and feature-rich applications.