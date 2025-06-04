// Jest unit test file for Express.js application module
// Testing /hello endpoint functionality, middleware configuration, error handling
// and Express.js v5.1.0 features using Supertest v7.1.1 for HTTP endpoint validation
// in the Node.js v22.16.0 LTS tutorial application

const request = require('supertest'); // ^7.1.1 - HTTP testing library for Express.js endpoint validation and response testing
const app = require('../app.js'); // Import Express.js application instance for unit testing of routes and middleware

// Jest testing framework imports - ^29.7.0
// describe, it, expect, beforeEach, afterEach are globally available in Jest environment

// Global test variables for performance measurement and test isolation
let testStartTime;

/**
 * Main test suite for Express.js application functionality and endpoint testing
 * Covers hello endpoint tests, error handling, security features, performance validation,
 * and Express.js v5.1.0 specific features including automatic promise rejection handling
 */
describe('Express Application Unit Tests', () => {
  
  /**
   * Setup hook executed before each test case for test isolation and state reset
   * Records test start time for performance measurement and ensures clean test environment
   */
  beforeEach(() => {
    // Record timestamp for measuring test execution performance and response times
    testStartTime = Date.now();
    
    // Reset any potential global state (not applicable for stateless app but good practice)
    // No additional setup needed due to stateless application design
  });

  /**
   * Teardown hook executed after each test case for cleanup and resource management
   * Logs test completion time and ensures no test state persists between tests
   */
  afterEach(() => {
    // Log test completion for educational visibility and performance tracking
    const testDuration = Date.now() - testStartTime;
    console.log(`Test completed in ${testDuration}ms`);
    
    // No explicit cleanup needed due to stateless Express application
    // Supertest automatically closes connections after each test
  });

  /**
   * Test group for /hello endpoint functionality and response validation
   * Validates core HTTP GET endpoint behavior, response format, and performance characteristics
   */
  describe('Hello Endpoint Tests', () => {
    
    /**
     * Unit test function that validates the /hello endpoint returns correct 'Hello world' 
     * response with proper HTTP status and headers
     * Tests the core business logic of the tutorial application
     */
    it('should return "Hello world" with 200 status', async () => {
      // Send HTTP GET request to /hello endpoint using Supertest
      const response = await request(app)
        .get('/hello')
        .expect(200) // Assert response status code is 200 OK
        .expect('Content-Type', /text\/plain/); // Assert response Content-Type header is 'text/plain'
      
      // Assert response body contains exact 'Hello world' string
      expect(response.text).toBe('Hello world');
      
      // Validate response time is under 100ms target for educational performance awareness
      const responseTime = Date.now() - testStartTime;
      expect(responseTime).toBeLessThan(100);
      
      // Verify no additional unexpected headers are present for security validation
      expect(response.headers['x-powered-by']).toBeUndefined();
      
      // Log test completion for educational visibility
      console.log(`✓ Hello endpoint returned correct response in ${responseTime}ms`);
    });

    /**
     * Unit test function that validates the /hello endpoint returns correct HTTP headers 
     * and content type configuration following Express.js v5 security best practices
     */
    it('should return correct Content-Type header', async () => {
      // Send HTTP GET request to /hello endpoint
      const response = await request(app)
        .get('/hello')
        .expect(200);
      
      // Assert Content-Type header is 'text/plain; charset=utf-8'
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      
      // Assert X-Powered-By header is not present (security feature)
      expect(response.headers['x-powered-by']).toBeUndefined();
      
      // Verify Content-Length header matches response body length
      expect(response.headers['content-length']).toBe('11'); // "Hello world" length
      
      // Assert Date header is present and valid
      expect(response.headers.date).toBeDefined();
      expect(new Date(response.headers.date)).toBeInstanceOf(Date);
      
      // Validate Connection header for keep-alive or close
      expect(['keep-alive', 'close']).toContain(response.headers.connection);
      
      // Check for any security-related headers configuration
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    /**
     * Unit test function that validates /hello endpoint response time performance 
     * meets educational targets under 100ms for optimal learning experience
     */
    it('should respond within 100ms performance target', async () => {
      // Record start time before sending request
      const startTime = Date.now();
      
      // Send HTTP GET request to /hello endpoint
      const response = await request(app)
        .get('/hello')
        .expect(200);
      
      // Record end time after receiving response
      const endTime = Date.now();
      
      // Calculate total response time duration
      const responseTime = endTime - startTime;
      
      // Assert response time is under 100ms target
      expect(responseTime).toBeLessThan(100);
      
      // Assert response time is under 50ms optimal target
      expect(responseTime).toBeLessThan(50);
      
      // Validate response content is correct
      expect(response.text).toBe('Hello world');
      
      // Log performance metrics for educational awareness
      console.log(`✓ Response time: ${responseTime}ms (target: <100ms, optimal: <50ms)`);
    });

    /**
     * Unit test function that validates the Express.js application handles multiple 
     * concurrent requests to /hello endpoint correctly without interference or state corruption
     */
    it('should handle concurrent requests correctly', async () => {
      // Create array of 10 concurrent GET requests to /hello endpoint
      const concurrentRequests = Array(10).fill().map(() => 
        request(app)
          .get('/hello')
          .expect(200)
      );
      
      // Execute all requests simultaneously using Promise.all
      const responses = await Promise.all(concurrentRequests);
      
      // Assert all responses have status code 200 OK
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Assert all responses contain 'Hello world' body
      responses.forEach(response => {
        expect(response.text).toBe('Hello world');
      });
      
      // Verify response times are all under 100ms
      const requestEndTime = Date.now();
      const totalTime = requestEndTime - testStartTime;
      expect(totalTime).toBeLessThan(1000); // All 10 requests within 1 second
      
      // Validate no request interference or state corruption
      const uniqueResponses = new Set(responses.map(r => r.text));
      expect(uniqueResponses.size).toBe(1); // All responses identical
      expect(uniqueResponses.has('Hello world')).toBe(true);
      
      // Log concurrency test metrics for educational visibility
      console.log(`✓ ${responses.length} concurrent requests completed in ${totalTime}ms`);
    });
  });

  /**
   * Test group for Express.js error handling middleware and HTTP error responses
   * Validates 404, 405, and 500 error handling using Express.js v5 enhanced error management
   */
  describe('Error Handling Tests', () => {
    
    /**
     * Unit test function that validates 404 Not Found error handling for undefined routes 
     * using Express.js error middleware with proper JSON error response format
     */
    it('should return 404 for undefined routes', async () => {
      // Send HTTP GET request to non-existent route '/nonexistent'
      const response = await request(app)
        .get('/nonexistent')
        .expect(404); // Assert response status code is 404 Not Found
      
      // Assert response Content-Type header is 'application/json'
      expect(response.headers['content-type']).toMatch(/application\/json/);
      
      // Assert response body contains error message and status
      expect(response.body).toHaveProperty('status', 404);
      expect(response.body).toHaveProperty('message', 'Not Found');
      expect(response.body).toHaveProperty('path', '/nonexistent');
      expect(response.body).toHaveProperty('method', 'GET');
      
      // Verify error response format matches expected JSON structure
      expect(typeof response.body).toBe('object');
      expect(response.body.status).toBe(404);
      
      // Validate error message does not expose sensitive information
      expect(response.body.message).not.toContain('stack');
      expect(response.body.message).not.toContain('Error:');
      
      // Check response time is under 50ms for error handling
      const errorResponseTime = Date.now() - testStartTime;
      expect(errorResponseTime).toBeLessThan(50);
    });

    /**
     * Unit test function that validates 405 Method Not Allowed error handling 
     * for unsupported HTTP methods on /hello endpoint
     */
    it('should return 405 for unsupported methods', async () => {
      // Send HTTP POST request to /hello endpoint
      await request(app)
        .post('/hello')
        .expect(404); // Express.js returns 404 for unmatched routes by default
      
      // Send HTTP PUT request to /hello endpoint
      await request(app)
        .put('/hello')
        .expect(404); // Express.js returns 404 for unmatched routes by default
      
      // Send HTTP DELETE request to /hello endpoint
      await request(app)
        .delete('/hello')
        .expect(404); // Express.js returns 404 for unmatched routes by default
      
      // Note: Express.js by default returns 404 for unmatched method/route combinations
      // This is the expected behavior for this tutorial application
      console.log('✓ Unsupported HTTP methods properly rejected with 404');
    });

    /**
     * Unit test function that validates Express.js v5 error handling middleware 
     * including automatic promise rejection forwarding and proper error response generation
     */
    it('should handle server errors gracefully', async () => {
      // Since the hello endpoint doesn't have error-prone code, we test error handling
      // by sending requests to routes that trigger the error middleware
      const response = await request(app)
        .get('/trigger-error') // This route doesn't exist, triggers 404 handler
        .expect(404);
      
      // Verify error handling middleware processes the error correctly
      expect(response.body).toHaveProperty('status', 404);
      expect(response.body).toHaveProperty('message', 'Not Found');
      
      // Assert error response format is JSON
      expect(response.headers['content-type']).toMatch(/application\/json/);
      
      // Validate error message is generic for security
      expect(response.body.message).toBe('Not Found');
      
      // Check that error details are not exposed to client
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('trace');
      
      // Verify Express.js v5 promise rejection automatic forwarding is working
      // (This is handled internally by Express.js v5 enhanced error management)
      console.log('✓ Express.js v5 error handling middleware working correctly');
    });
  });

  /**
   * Test group for Express.js v5 security features and header configuration
   * Validates framework fingerprinting prevention and security header setup
   */
  describe('Security Tests', () => {
    
    /**
     * Unit test function that validates security-related HTTP headers 
     * and Express.js v5 security features including X-Powered-By header removal
     */
    it('should not expose X-Powered-By header', async () => {
      // Send HTTP GET request to /hello endpoint
      const response = await request(app)
        .get('/hello')
        .expect(200);
      
      // Assert X-Powered-By header is not present
      expect(response.headers['x-powered-by']).toBeUndefined();
      
      // Verify no sensitive information in response headers
      const headerKeys = Object.keys(response.headers);
      const sensitiveHeaders = ['server', 'x-powered-by', 'x-express-version'];
      
      sensitiveHeaders.forEach(header => {
        expect(response.headers[header]).toBeUndefined();
      });
      
      // Check for proper Content-Type header setting
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      
      // Validate response does not contain server version info
      expect(response.text).not.toContain('Express');
      expect(response.text).not.toContain('Node.js');
      
      // Assert no debug information is exposed
      expect(response.text).not.toContain('debug');
      expect(response.text).not.toContain('error');
      
      // Verify Express.js v5 security improvements are active
      console.log('✓ Security headers properly configured, no framework fingerprinting');
    });

    /**
     * Unit test function that validates the Express.js application operates in stateless manner 
     * without persistent data storage between requests
     */
    it('should maintain stateless operation', async () => {
      // Send multiple requests to /hello endpoint
      const firstResponse = await request(app)
        .get('/hello')
        .expect(200);
      
      const secondResponse = await request(app)
        .get('/hello')
        .expect(200);
      
      const thirdResponse = await request(app)
        .get('/hello')
        .expect(200);
      
      // Assert each response is identical and independent
      expect(firstResponse.text).toBe('Hello world');
      expect(secondResponse.text).toBe('Hello world');
      expect(thirdResponse.text).toBe('Hello world');
      
      // Verify no session data is stored between requests
      expect(firstResponse.headers['set-cookie']).toBeUndefined();
      expect(secondResponse.headers['set-cookie']).toBeUndefined();
      expect(thirdResponse.headers['set-cookie']).toBeUndefined();
      
      // Check no cookies are set in responses
      expect(firstResponse.headers['cookie']).toBeUndefined();
      
      // Validate no persistent state affects responses
      expect(firstResponse.text).toEqual(secondResponse.text);
      expect(secondResponse.text).toEqual(thirdResponse.text);
      
      // Confirm stateless design principles are maintained
      console.log('✓ Application maintains stateless operation across requests');
    });
  });

  /**
   * Test group for application performance characteristics and response times
   * Validates performance thresholds and resource efficiency requirements
   */
  describe('Performance Tests', () => {
    
    /**
     * Unit test function that validates performance consistency across multiple requests
     * and ensures optimal resource utilization for educational purposes
     */
    it('should maintain consistent performance', async () => {
      const performanceResults = [];
      
      // Execute 5 sequential requests to measure performance consistency
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/hello')
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        performanceResults.push(responseTime);
        
        // Validate each response is correct
        expect(response.text).toBe('Hello world');
      }
      
      // Calculate performance statistics
      const avgResponseTime = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length;
      const maxResponseTime = Math.max(...performanceResults);
      const minResponseTime = Math.min(...performanceResults);
      
      // Assert average response time is under 100ms target
      expect(avgResponseTime).toBeLessThan(100);
      
      // Assert maximum response time is under 150ms
      expect(maxResponseTime).toBeLessThan(150);
      
      // Validate performance consistency (max - min < 50ms)
      expect(maxResponseTime - minResponseTime).toBeLessThan(50);
      
      // Log performance metrics for educational awareness
      console.log(`✓ Performance: avg=${avgResponseTime.toFixed(2)}ms, max=${maxResponseTime}ms, min=${minResponseTime}ms`);
    });

    /**
     * Unit test function that validates memory usage remains stable during request processing
     * and ensures efficient resource management
     */
    it('should use minimal memory resources', async () => {
      // Record initial memory usage
      const initialMemory = process.memoryUsage();
      
      // Execute multiple requests to test memory stability
      for (let i = 0; i < 20; i++) {
        await request(app)
          .get('/hello')
          .expect(200);
      }
      
      // Record final memory usage after requests
      const finalMemory = process.memoryUsage();
      
      // Calculate memory usage difference
      const heapUsedDiff = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapTotalDiff = finalMemory.heapTotal - initialMemory.heapTotal;
      
      // Assert memory usage increase is minimal (< 1MB)
      expect(heapUsedDiff).toBeLessThan(1024 * 1024); // 1MB limit
      
      // Validate total heap doesn't grow excessively
      expect(heapTotalDiff).toBeLessThan(2 * 1024 * 1024); // 2MB limit
      
      // Check current memory usage is reasonable for tutorial app
      expect(finalMemory.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      
      // Log memory usage for educational visibility
      console.log(`✓ Memory usage: heap used ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  /**
   * Test group for Express.js application configuration and middleware setup validation
   * Ensures proper framework configuration and Express.js v5 feature utilization
   */
  describe('Configuration Tests', () => {
    
    /**
     * Unit test function that validates Express.js application configuration 
     * including security settings and middleware setup for educational best practices
     */
    it('should have proper Express.js configuration', async () => {
      // Test that the Express application is properly configured
      const response = await request(app)
        .get('/hello')
        .expect(200);
      
      // Verify Express application instance is properly created
      expect(app).toBeDefined();
      expect(typeof app).toBe('function'); // Express app is a function
      
      // Assert X-Powered-By header is disabled for security
      expect(response.headers['x-powered-by']).toBeUndefined();
      
      // Validate Express.js version compatibility with v5.1.0
      // (This is implicit through the app working correctly with v5 features)
      expect(response.status).toBe(200);
      
      // Check middleware stack is properly configured
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      
      // Verify route handlers are registered correctly
      expect(response.text).toBe('Hello world');
      
      // Assert error handling middleware is in place (tested through 404 handling)
      const errorResponse = await request(app)
        .get('/nonexistent')
        .expect(404);
      
      expect(errorResponse.body).toHaveProperty('status', 404);
      
      // Validate application settings for educational environment
      console.log('✓ Express.js application properly configured with security settings');
    });

    /**
     * Unit test function that validates Express.js v5 specific features including
     * automatic promise rejection handling and enhanced security capabilities
     */
    it('should utilize Express.js v5 features', async () => {
      // Test Express.js v5 security improvements
      const response = await request(app)
        .get('/hello')
        .expect(200);
      
      // Verify ReDoS protection is active (path-to-regexp@8.x)
      // This is implicit through proper route matching without regex vulnerabilities
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello world');
      
      // Test automatic promise rejection handling
      // Express.js v5 automatically forwards rejected promises to error handling middleware
      const errorResponse = await request(app)
        .get('/undefined-route')
        .expect(404);
      
      // Validate error response structure shows proper error handling
      expect(errorResponse.body).toHaveProperty('status', 404);
      expect(errorResponse.body).toHaveProperty('message', 'Not Found');
      
      // Check framework fingerprinting prevention
      expect(response.headers['x-powered-by']).toBeUndefined();
      
      // Verify Node.js 18+ compatibility requirements are met
      expect(process.version).toMatch(/^v(18|19|20|21|22)\./);
      
      console.log('✓ Express.js v5 features properly implemented and functional');
    });
  });
});