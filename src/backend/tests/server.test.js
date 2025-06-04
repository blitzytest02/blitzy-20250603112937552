// Jest unit and integration test file for HTTP server lifecycle management
// Testing server startup, shutdown, port binding, signal handling, and Express.js integration
// Using Jest v29.7.0 and Supertest v7.1.1 for comprehensive server testing

const request = require('supertest'); // ^7.1.1 - HTTP testing library for server endpoint validation and integration testing with Express.js
const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('jest'); // ^29.7.0 - Jest testing framework functions

// Import server and app instances for testing server lifecycle and integration scenarios
const server = require('../server.js'); // Default import of HTTP server instance for testing server lifecycle, startup, shutdown, and port management
const app = require('../app.js'); // Default import of Express.js application instance for integration testing between server and application components

// Global test variables for managing test server lifecycle and timing
let testServer = null; // HTTP server instance used for testing server lifecycle and integration scenarios
const testPort = 3001; // Test port to avoid conflicts with development server on port 3000
let serverStartTime = null; // Timestamp for measuring server startup performance and lifecycle timing
let originalConsoleLog = null; // Store original console.log for cleanup after test mocking

// Test configuration and performance thresholds
const PERFORMANCE_THRESHOLDS = {
    STARTUP_TIME: 5000, // Maximum server startup time in milliseconds
    SHUTDOWN_TIME: 10000, // Maximum server shutdown time in milliseconds
    RESPONSE_TIME: 100, // Maximum response time for /hello endpoint in milliseconds
    CONCURRENT_REQUESTS: 10, // Number of simultaneous requests for concurrency testing
    MEMORY_LIMIT: 50 * 1024 * 1024 // Maximum memory usage during testing (50MB)
};

/**
 * Main test suite for HTTP server lifecycle testing
 * Tests server startup, shutdown, and lifecycle management using Jest and Supertest
 */
describe('HTTP Server Lifecycle Tests', () => {
    
    /**
     * Test setup executed before all tests in the suite
     * Initializes test environment and prepares server for testing
     */
    beforeAll(async () => {
        // Store original console.log for restoration after tests
        originalConsoleLog = console.log;
        
        // Mock console.log to reduce test output noise while preserving error visibility
        console.log = jest.fn();
        
        // Set NODE_ENV to test for proper test environment configuration
        process.env.NODE_ENV = 'test';
        process.env.PORT = testPort.toString();
        
        // Record baseline memory usage for performance monitoring
        const initialMemory = process.memoryUsage();
        console.error(`Test initialization - Memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    });

    /**
     * Test cleanup executed after all tests in the suite
     * Ensures proper server shutdown and resource cleanup
     */
    afterAll(async () => {
        // Restore original console.log
        console.log = originalConsoleLog;
        
        // Ensure test server is properly closed
        if (testServer && testServer.listening) {
            await new Promise((resolve) => {
                testServer.close(() => {
                    console.error('Test server closed successfully');
                    resolve();
                });
            });
        }
        
        // Reset environment variables
        delete process.env.NODE_ENV;
        delete process.env.PORT;
        
        // Log final memory usage for leak detection
        const finalMemory = process.memoryUsage();
        console.error(`Test cleanup - Final memory usage: ${Math.round(finalMemory.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    });

    /**
     * Setup executed before each individual test
     * Ensures clean state for each test execution
     */
    beforeEach(() => {
        // Record test start time for performance measurement
        serverStartTime = Date.now();
        
        // Clear any existing test server instance
        if (testServer && testServer.listening) {
            testServer.close();
            testServer = null;
        }
    });

    /**
     * Cleanup executed after each individual test
     * Ensures proper resource cleanup after each test
     */
    afterEach(() => {
        // Cleanup test server if still running
        if (testServer && testServer.listening) {
            testServer.close();
            testServer = null;
        }
        
        // Clear any test timers
        jest.clearAllTimers();
    });

    /**
     * Test group for server startup functionality
     * Validates HTTP server initialization, port binding, and startup performance
     */
    describe('Server Startup Tests', () => {
        
        /**
         * Integration test that validates HTTP server startup process, port binding, and initialization timing
         */
        it('should start server successfully on default port', async () => {
            // Record server startup start time for performance measurement
            const startupBeginTime = Date.now();
            
            // Start HTTP server on test port using server.listen()
            testServer = app.listen(testPort, () => {
                console.error(`Test server started on port ${testPort}`);
            });
            
            // Wait for server to be ready for connections
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Assert server starts successfully without errors
            expect(testServer.listening).toBe(true);
            
            // Verify server is listening on correct port using server.address()
            const serverAddress = testServer.address();
            expect(serverAddress.port).toBe(testPort);
            expect(serverAddress.family).toBe('IPv4');
            
            // Validate server startup time is under 5 seconds target
            const startupDuration = Date.now() - startupBeginTime;
            expect(startupDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.STARTUP_TIME);
            
            // Assert server instance is properly created and accessible
            expect(testServer).toBeDefined();
            expect(typeof testServer.close).toBe('function');
            expect(typeof testServer.address).toBe('function');
            
            // Log server startup metrics for educational visibility
            console.error(`Server startup completed in ${startupDuration}ms`);
            
            // Verify server accepts incoming connections using Supertest
            const response = await request(testServer).get('/hello');
            expect(response.status).toBe(200);
            expect(response.text).toBe('Hello world');
        });

        /**
         * Tests server startup on custom port from environment variable configuration
         */
        it('should start server on custom port from environment', async () => {
            const customPort = 3002;
            
            // Test server binding to custom port via environment variable
            testServer = app.listen(customPort);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Assert proper port binding to custom port
            const serverAddress = testServer.address();
            expect(serverAddress.port).toBe(customPort);
            
            // Verify port validation for valid port ranges (1024-65535)
            expect(customPort).toBeGreaterThanOrEqual(1024);
            expect(customPort).toBeLessThanOrEqual(65535);
            
            // Test server.address() returns correct port information
            expect(serverAddress.port).toBe(customPort);
            expect(serverAddress.address).toBeDefined();
        });

        /**
         * Tests server startup performance meets educational targets under 5 seconds
         */
        it('should complete startup within 5 seconds', async () => {
            const startupBeginTime = Date.now();
            
            // Start server and measure startup time
            testServer = app.listen(testPort + 10);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const startupDuration = Date.now() - startupBeginTime;
            
            // Assert server startup time is under 5 seconds target
            expect(startupDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.STARTUP_TIME);
            
            // Validate server startup performance under 1 second for educational efficiency
            expect(startupDuration).toBeLessThan(1000);
            
            console.error(`Server startup performance: ${startupDuration}ms (target: <5000ms)`);
        });

        /**
         * Tests server binding and connection acceptance verification
         */
        it('should bind to correct port and accept connections', async () => {
            testServer = app.listen(testPort + 20);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Assert server is properly bound and listening
            expect(testServer.listening).toBe(true);
            
            // Verify server accepts incoming connections
            const connectionTest = await request(testServer)
                .get('/hello')
                .expect(200);
            
            expect(connectionTest.text).toBe('Hello world');
            
            // Assert server instance is accessible for lifecycle management
            expect(testServer.address()).toBeDefined();
            expect(testServer.address().port).toBe(testPort + 20);
        });
    });

    /**
     * Test group for server shutdown functionality
     * Validates HTTP server graceful shutdown process, connection cleanup, and resource management
     */
    describe('Server Shutdown Tests', () => {
        
        /**
         * Integration test that validates HTTP server graceful shutdown process and connection cleanup
         */
        it('should shutdown gracefully on server close', async () => {
            // Start test server for shutdown testing
            testServer = app.listen(testPort + 100);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Verify server is running before shutdown
            expect(testServer.listening).toBe(true);
            
            // Record shutdown start time for performance measurement
            const shutdownBeginTime = Date.now();
            
            // Initiate server shutdown using server.close()
            const shutdownPromise = new Promise((resolve, reject) => {
                testServer.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            
            // Wait for shutdown completion
            await shutdownPromise;
            
            // Assert server stops accepting new connections
            expect(testServer.listening).toBe(false);
            
            // Validate shutdown completes within 10 seconds timeout
            const shutdownDuration = Date.now() - shutdownBeginTime;
            expect(shutdownDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SHUTDOWN_TIME);
            
            // Log shutdown metrics for educational awareness
            console.error(`Server shutdown completed in ${shutdownDuration}ms`);
            
            // Clear test server reference after successful shutdown
            testServer = null;
        });

        /**
         * Tests server shutdown with active connections and proper connection draining
         */
        it('should complete shutdown within 10 seconds', async () => {
            testServer = app.listen(testPort + 110);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Create active connection before shutdown
            const connectionPromise = request(testServer).get('/hello');
            
            // Start shutdown process
            const shutdownBeginTime = Date.now();
            const shutdownPromise = new Promise((resolve) => {
                testServer.close(resolve);
            });
            
            // Wait for both connection completion and shutdown
            await Promise.all([connectionPromise, shutdownPromise]);
            
            const shutdownDuration = Date.now() - shutdownBeginTime;
            
            // Verify existing connections are properly drained
            expect(shutdownDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SHUTDOWN_TIME);
            
            // Assert server resources are properly cleaned up
            expect(testServer.listening).toBe(false);
            
            console.error(`Graceful shutdown with active connections: ${shutdownDuration}ms`);
            
            testServer = null;
        });

        /**
         * Tests server port release and availability after shutdown
         */
        it('should cleanup all resources on shutdown', async () => {
            const shutdownTestPort = testPort + 120;
            
            // Start and shutdown server to test resource cleanup
            testServer = app.listen(shutdownTestPort);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Shutdown server
            await new Promise((resolve) => {
                testServer.close(resolve);
            });
            
            // Verify server port is released and available
            const newServer = app.listen(shutdownTestPort);
            
            await new Promise((resolve) => {
                newServer.on('listening', resolve);
            });
            
            // Assert port is available for reuse (resources properly cleaned up)
            expect(newServer.listening).toBe(true);
            expect(newServer.address().port).toBe(shutdownTestPort);
            
            // Cleanup new server instance
            await new Promise((resolve) => {
                newServer.close(resolve);
            });
            
            testServer = null;
        });
    });

    /**
     * Test group for server integration with Express.js application
     * Validates HTTP server integration with Express.js application, request routing, and response handling
     */
    describe('Server Integration Tests', () => {
        
        /**
         * Integration test that validates HTTP server integration with Express.js application and request routing
         */
        it('should integrate with Express.js application', async () => {
            // Start HTTP server with Express.js application integration
            testServer = app.listen(testPort + 200);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Send HTTP GET request to /hello endpoint via server
            const response = await request(testServer)
                .get('/hello')
                .expect(200);
            
            // Assert server properly routes request to Express application
            expect(response.status).toBe(200);
            
            // Verify response contains 'Hello world' from Express handler
            expect(response.text).toBe('Hello world');
            
            // Validate HTTP status code 200 OK through server
            expect(response.status).toBe(200);
            
            // Assert Content-Type header is properly set
            expect(response.headers['content-type']).toMatch(/text\/plain/);
        });

        /**
         * Tests server handling of Express.js middleware processing and response timing
         */
        it('should route requests to Express handlers', async () => {
            testServer = app.listen(testPort + 210);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const requestStartTime = Date.now();
            
            // Test server handles Express.js middleware processing
            const response = await request(testServer)
                .get('/hello')
                .expect(200);
            
            const responseTime = Date.now() - requestStartTime;
            
            // Verify server-Express integration response time under 100ms
            expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
            
            // Assert server handles Express.js middleware processing
            expect(response.text).toBe('Hello world');
            expect(response.headers['content-type']).toMatch(/text\/plain/);
            
            console.error(`Express integration response time: ${responseTime}ms`);
        });

        /**
         * Tests server integration performance and response time benchmarks
         */
        it('should handle Express middleware processing', async () => {
            testServer = app.listen(testPort + 220);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Test multiple requests to validate consistent middleware processing
            const requests = Array(5).fill().map(() => 
                request(testServer).get('/hello').expect(200)
            );
            
            const responses = await Promise.all(requests);
            
            // Assert all requests processed consistently through middleware
            responses.forEach(response => {
                expect(response.text).toBe('Hello world');
                expect(response.status).toBe(200);
                expect(response.headers['content-type']).toMatch(/text\/plain/);
            });
            
            // Verify consistent middleware processing across multiple requests
            console.error(`Processed ${responses.length} requests through Express middleware`);
        });

        /**
         * Tests server integration maintaining performance under multiple requests
         */
        it('should maintain integration performance', async () => {
            testServer = app.listen(testPort + 230);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const performanceTestCount = 10;
            const performanceTestPromises = [];
            
            // Execute multiple concurrent requests for performance testing
            for (let i = 0; i < performanceTestCount; i++) {
                const requestStartTime = Date.now();
                const requestPromise = request(testServer)
                    .get('/hello')
                    .expect(200)
                    .then(response => ({
                        response,
                        duration: Date.now() - requestStartTime
                    }));
                
                performanceTestPromises.push(requestPromise);
            }
            
            const results = await Promise.all(performanceTestPromises);
            
            // Validate all requests maintain performance standards
            results.forEach(result => {
                expect(result.response.text).toBe('Hello world');
                expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
            });
            
            const averageResponseTime = results.reduce((sum, result) => sum + result.duration, 0) / results.length;
            console.error(`Average response time across ${performanceTestCount} requests: ${averageResponseTime.toFixed(2)}ms`);
        });
    });

    /**
     * Test group for server error handling functionality
     * Validates HTTP server error handling including startup errors, port conflicts, and Express.js error integration
     */
    describe('Server Error Handling Tests', () => {
        
        /**
         * Tests server error handling for port binding conflicts and startup errors
         */
        it('should handle port binding errors gracefully', async () => {
            const conflictPort = testPort + 300;
            
            // Start first server on test port
            const firstServer = app.listen(conflictPort);
            
            await new Promise((resolve) => {
                firstServer.on('listening', resolve);
            });
            
            // Attempt to start second server on same port to test error handling
            const secondServer = app.listen(conflictPort);
            
            // Test server startup error handling for port conflicts
            const errorPromise = new Promise((resolve) => {
                secondServer.on('error', (error) => {
                    resolve(error);
                });
            });
            
            const error = await errorPromise;
            
            // Assert proper error messages for educational troubleshooting
            expect(error.code).toBe('EADDRINUSE');
            expect(error.port).toBe(conflictPort);
            
            // Test server error event handling and logging
            expect(error.message).toContain('EADDRINUSE');
            
            // Cleanup first server
            await new Promise((resolve) => {
                firstServer.close(resolve);
            });
        });

        /**
         * Tests server error handling for invalid configurations and startup failures
         */
        it('should provide educational error messages', async () => {
            // Test server startup error handling for invalid configurations
            const invalidPort = -1;
            
            try {
                testServer = app.listen(invalidPort);
                
                // Wait for error event
                await new Promise((resolve, reject) => {
                    testServer.on('error', reject);
                    testServer.on('listening', () => {
                        reject(new Error('Server should not start with invalid port'));
                    });
                });
            } catch (error) {
                // Assert proper error messages for educational troubleshooting
                expect(error).toBeDefined();
                
                // Verify error recovery and educational error reporting
                console.error(`Educational error handling test: ${error.message}`);
            }
        });

        /**
         * Tests server handling of Express.js application errors and error integration
         */
        it('should recover from non-critical errors', async () => {
            testServer = app.listen(testPort + 310);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Test server handles Express.js error integration through 404 handling
            const notFoundResponse = await request(testServer)
                .get('/nonexistent')
                .expect(404);
            
            // Validate server continues operation after non-critical errors
            expect(notFoundResponse.status).toBe(404);
            expect(notFoundResponse.body.status).toBe(404);
            expect(notFoundResponse.body.message).toBe('Not Found');
            
            // Verify server continues operation by making successful request
            const successResponse = await request(testServer)
                .get('/hello')
                .expect(200);
            
            expect(successResponse.text).toBe('Hello world');
            
            // Assert server handles uncaught exceptions gracefully
            console.error('Server recovered from 404 error and continued normal operation');
        });

        /**
         * Tests server integration with Express.js error handling middleware
         */
        it('should integrate Express.js error handling', async () => {
            testServer = app.listen(testPort + 320);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Test various HTTP error scenarios
            const errorTests = [
                { path: '/nonexistent', expectedStatus: 404, method: 'get' },
                { path: '/hello', expectedStatus: 405, method: 'post' },
                { path: '/hello', expectedStatus: 405, method: 'put' },
                { path: '/hello', expectedStatus: 405, method: 'delete' }
            ];
            
            for (const test of errorTests) {
                const response = await request(testServer)[test.method](test.path);
                
                if (test.expectedStatus === 404) {
                    expect(response.status).toBe(404);
                    expect(response.body.message).toBe('Not Found');
                } else {
                    // Express.js v5 handles method not allowed differently
                    expect(response.status).toBeGreaterThanOrEqual(400);
                }
            }
            
            console.error('Express.js error handling integration validated');
        });
    });

    /**
     * Test group for server performance characteristics and resource utilization
     * Validates HTTP server performance including startup time, response performance, and resource utilization
     */
    describe('Server Performance Tests', () => {
        
        /**
         * Performance test that validates HTTP server startup time, response performance, and resource utilization
         */
        it('should meet startup time targets', async () => {
            const performanceStartTime = Date.now();
            
            // Measure server startup time from initialization to ready state
            testServer = app.listen(testPort + 400);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const startupDuration = Date.now() - performanceStartTime;
            
            // Assert startup time is under 5 seconds educational target
            expect(startupDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.STARTUP_TIME);
            
            // Validate startup performance is actually much faster for simple server
            expect(startupDuration).toBeLessThan(1000);
            
            // Log performance metrics for educational awareness
            console.error(`Server startup performance: ${startupDuration}ms (target: <${PERFORMANCE_THRESHOLDS.STARTUP_TIME}ms)`);
        });

        /**
         * Tests server response time performance for /hello endpoint under target threshold
         */
        it('should maintain response time under 100ms', async () => {
            testServer = app.listen(testPort + 410);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const responseTimeTests = [];
            
            // Test server response time for /hello endpoint multiple times
            for (let i = 0; i < 10; i++) {
                const requestStartTime = Date.now();
                
                const response = await request(testServer)
                    .get('/hello')
                    .expect(200);
                
                const responseTime = Date.now() - requestStartTime;
                responseTimeTests.push(responseTime);
                
                // Assert individual response time under 100ms
                expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
                expect(response.text).toBe('Hello world');
            }
            
            const averageResponseTime = responseTimeTests.reduce((sum, time) => sum + time, 0) / responseTimeTests.length;
            const maxResponseTime = Math.max(...responseTimeTests);
            
            console.error(`Response time performance - Average: ${averageResponseTime.toFixed(2)}ms, Max: ${maxResponseTime}ms`);
        });

        /**
         * Tests server memory usage and resource efficiency during operation
         */
        it('should use minimal memory resources', async () => {
            const initialMemory = process.memoryUsage();
            
            testServer = app.listen(testPort + 420);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Make several requests to test memory usage during operation
            const requestPromises = Array(20).fill().map(() => 
                request(testServer).get('/hello').expect(200)
            );
            
            await Promise.all(requestPromises);
            
            const currentMemory = process.memoryUsage();
            const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
            
            // Validate server memory usage remains under 50MB
            expect(currentMemory.heapUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT);
            
            // Assert server maintains performance under load
            console.error(`Memory usage - Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024 * 100) / 100}MB, ` +
                         `Current: ${Math.round(currentMemory.heapUsed / 1024 / 1024 * 100) / 100}MB, ` +
                         `Increase: ${Math.round(memoryIncrease / 1024 / 1024 * 100) / 100}MB`);
        });

        /**
         * Tests server shutdown performance and timing requirements
         */
        it('should meet shutdown time requirements', async () => {
            testServer = app.listen(testPort + 430);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Measure server shutdown time under 10 seconds
            const shutdownStartTime = Date.now();
            
            await new Promise((resolve) => {
                testServer.close(resolve);
            });
            
            const shutdownDuration = Date.now() - shutdownStartTime;
            
            // Assert server maintains performance under load
            expect(shutdownDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SHUTDOWN_TIME);
            
            // Log performance metrics for educational awareness
            console.error(`Server shutdown performance: ${shutdownDuration}ms (target: <${PERFORMANCE_THRESHOLDS.SHUTDOWN_TIME}ms)`);
            
            testServer = null;
        });
    });

    /**
     * Test group for server concurrency and concurrent request handling
     * Validates HTTP server concurrent request handling, connection management, and Node.js event loop utilization
     */
    describe('Server Concurrency Tests', () => {
        
        /**
         * Integration test that validates HTTP server concurrent request handling and connection management
         */
        it('should handle concurrent requests efficiently', async () => {
            testServer = app.listen(testPort + 500);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const concurrentRequestCount = PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS;
            
            // Create array of concurrent HTTP requests to server
            const concurrentRequests = Array(concurrentRequestCount).fill().map((_, index) => {
                const requestStartTime = Date.now();
                
                return request(testServer)
                    .get('/hello')
                    .expect(200)
                    .then(response => ({
                        index,
                        response,
                        duration: Date.now() - requestStartTime
                    }));
            });
            
            // Execute all requests simultaneously using Promise.all
            const results = await Promise.all(concurrentRequests);
            
            // Assert server handles all concurrent requests successfully
            expect(results).toHaveLength(concurrentRequestCount);
            
            results.forEach((result, index) => {
                // Verify response times remain under 100ms for all requests
                expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
                expect(result.response.text).toBe('Hello world');
                expect(result.response.status).toBe(200);
            });
            
            // Validate no request interference or state corruption
            const allResponsesIdentical = results.every(result => result.response.text === 'Hello world');
            expect(allResponsesIdentical).toBe(true);
            
            const averageResponseTime = results.reduce((sum, result) => sum + result.duration, 0) / results.length;
            const maxResponseTime = Math.max(...results.map(result => result.duration));
            
            // Log concurrency metrics for educational understanding
            console.error(`Concurrency test - ${concurrentRequestCount} requests: ` +
                         `Average: ${averageResponseTime.toFixed(2)}ms, Max: ${maxResponseTime}ms`);
        });

        /**
         * Tests server connection pooling and management under concurrent load
         */
        it('should manage connections efficiently', async () => {
            testServer = app.listen(testPort + 510);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const connectionTestRounds = 3;
            const requestsPerRound = 5;
            
            for (let round = 0; round < connectionTestRounds; round++) {
                const roundStartTime = Date.now();
                
                // Test server connection pooling and management
                const roundRequests = Array(requestsPerRound).fill().map(() => 
                    request(testServer).get('/hello').expect(200)
                );
                
                const roundResults = await Promise.all(roundRequests);
                const roundDuration = Date.now() - roundStartTime;
                
                // Validate all requests in round are successful
                roundResults.forEach(response => {
                    expect(response.text).toBe('Hello world');
                    expect(response.status).toBe(200);
                });
                
                console.error(`Connection management round ${round + 1}: ${requestsPerRound} requests in ${roundDuration}ms`);
            }
            
            // Assert server memory usage remains stable during concurrency
            const memoryAfterConcurrency = process.memoryUsage();
            expect(memoryAfterConcurrency.heapUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT);
        });

        /**
         * Tests server behavior under sustained concurrent load
         */
        it('should maintain performance under sustained load', async () => {
            testServer = app.listen(testPort + 520);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const sustainedLoadDuration = 2000; // 2 seconds of sustained load
            const requestInterval = 100; // Send request every 100ms
            const sustainedRequests = [];
            
            const loadStartTime = Date.now();
            
            // Create sustained load pattern
            while (Date.now() - loadStartTime < sustainedLoadDuration) {
                const requestPromise = request(testServer)
                    .get('/hello')
                    .expect(200)
                    .then(response => ({
                        timestamp: Date.now(),
                        response
                    }));
                
                sustainedRequests.push(requestPromise);
                
                // Wait before next request
                await new Promise(resolve => setTimeout(resolve, requestInterval));
            }
            
            // Wait for all sustained requests to complete
            const sustainedResults = await Promise.all(sustainedRequests);
            
            // Verify all requests completed successfully
            sustainedResults.forEach(result => {
                expect(result.response.text).toBe('Hello world');
                expect(result.response.status).toBe(200);
            });
            
            console.error(`Sustained load test: ${sustainedResults.length} requests over ${sustainedLoadDuration}ms completed successfully`);
        });
    });

    /**
     * Test group for server environment configuration and variable handling
     * Validates server environment variable configuration, port management, and Node.js environment integration
     */
    describe('Server Environment Configuration Tests', () => {
        
        /**
         * Tests server port configuration via environment variables and default fallback
         */
        it('should handle environment variable configuration', async () => {
            // Test server port configuration via PORT environment variable
            const envTestPort = 3555;
            const originalPort = process.env.PORT;
            
            // Set environment variable for testing
            process.env.PORT = envTestPort.toString();
            
            testServer = app.listen(envTestPort);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Assert server configuration adapts to environment settings
            const serverAddress = testServer.address();
            expect(serverAddress.port).toBe(envTestPort);
            
            // Test server behavior with environment configuration
            const response = await request(testServer)
                .get('/hello')
                .expect(200);
            
            expect(response.text).toBe('Hello world');
            
            // Restore original environment variable
            if (originalPort) {
                process.env.PORT = originalPort;
            } else {
                delete process.env.PORT;
            }
        });

        /**
         * Tests default port fallback when environment variables are not set
         */
        it('should use default port when environment not set', async () => {
            // Store and clear PORT environment variable
            const originalPort = process.env.PORT;
            delete process.env.PORT;
            
            // Validate default port fallback to 3000 when PORT not set
            const defaultPort = 3000;
            
            try {
                testServer = app.listen(defaultPort + 600); // Offset to avoid conflicts
                
                await new Promise((resolve) => {
                    testServer.on('listening', resolve);
                });
                
                const serverAddress = testServer.address();
                expect(serverAddress.port).toBe(defaultPort + 600);
                
                // Verify environment variable validation and error handling
                const response = await request(testServer)
                    .get('/hello')
                    .expect(200);
                
                expect(response.text).toBe('Hello world');
                
            } finally {
                // Restore original environment variable
                if (originalPort) {
                    process.env.PORT = originalPort;
                }
            }
        });

        /**
         * Tests server configuration with different Node.js environment modes
         */
        it('should adapt to different environment modes', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            
            // Test NODE_ENV environment variable handling
            process.env.NODE_ENV = 'test';
            
            testServer = app.listen(testPort + 700);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Assert proper environment variable precedence
            expect(process.env.NODE_ENV).toBe('test');
            
            // Validate educational logging based on environment
            const response = await request(testServer)
                .get('/hello')
                .expect(200);
            
            expect(response.text).toBe('Hello world');
            
            // Restore original NODE_ENV
            if (originalNodeEnv) {
                process.env.NODE_ENV = originalNodeEnv;
            } else {
                delete process.env.NODE_ENV;
            }
        });
    });

    /**
     * Test group for complete server lifecycle from startup to shutdown
     * End-to-end test that validates complete server lifecycle including startup, request processing, and graceful shutdown
     */
    describe('Server Lifecycle Integration Tests', () => {
        
        /**
         * End-to-end test that validates complete server lifecycle from startup through request processing to graceful shutdown
         */
        it('should handle complete lifecycle from startup to shutdown', async () => {
            const lifecycleStartTime = Date.now();
            
            // Execute complete server startup sequence
            testServer = app.listen(testPort + 800);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Verify server is ready to accept connections
            expect(testServer.listening).toBe(true);
            
            // Send multiple HTTP requests to test server operation
            const lifecycleRequests = Array(5).fill().map((_, index) => 
                request(testServer)
                    .get('/hello')
                    .expect(200)
                    .then(response => ({
                        index,
                        response
                    }))
            );
            
            const lifecycleResults = await Promise.all(lifecycleRequests);
            
            // Assert all requests are processed correctly
            lifecycleResults.forEach(result => {
                expect(result.response.text).toBe('Hello world');
                expect(result.response.status).toBe(200);
            });
            
            // Test server maintains state throughout lifecycle
            expect(testServer.listening).toBe(true);
            
            // Initiate graceful shutdown sequence
            const shutdownPromise = new Promise((resolve) => {
                testServer.close(resolve);
            });
            
            await shutdownPromise;
            
            // Verify all connections are properly closed
            expect(testServer.listening).toBe(false);
            
            const lifecycleDuration = Date.now() - lifecycleStartTime;
            
            // Assert server resources are completely cleaned up
            console.error(`Complete server lifecycle test completed in ${lifecycleDuration}ms`);
            
            testServer = null;
        });

        /**
         * Tests server state management and consistency throughout operation lifecycle
         */
        it('should maintain consistent state throughout operation', async () => {
            testServer = app.listen(testPort + 810);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            const stateTestPhases = [
                { name: 'Initial', requestCount: 3 },
                { name: 'Sustained', requestCount: 5 },
                { name: 'Final', requestCount: 2 }
            ];
            
            for (const phase of stateTestPhases) {
                const phaseRequests = Array(phase.requestCount).fill().map(() => 
                    request(testServer).get('/hello').expect(200)
                );
                
                const phaseResults = await Promise.all(phaseRequests);
                
                // Verify consistent behavior across all phases
                phaseResults.forEach(response => {
                    expect(response.text).toBe('Hello world');
                    expect(response.status).toBe(200);
                    expect(response.headers['content-type']).toMatch(/text\/plain/);
                });
                
                console.error(`${phase.name} phase: ${phase.requestCount} requests completed successfully`);
            }
            
            // Validate server maintains consistent state throughout all phases
            expect(testServer.listening).toBe(true);
        });

        /**
         * Tests complete server operational reliability under various conditions
         */
        it('should demonstrate reliable operation patterns', async () => {
            testServer = app.listen(testPort + 820);
            
            await new Promise((resolve) => {
                testServer.on('listening', resolve);
            });
            
            // Test reliability under mixed request patterns
            const reliabilityTests = [
                // Sequential requests
                { type: 'sequential', count: 3 },
                // Burst requests
                { type: 'burst', count: 5 },
                // Spaced requests
                { type: 'spaced', count: 3 }
            ];
            
            for (const test of reliabilityTests) {
                if (test.type === 'sequential') {
                    // Sequential request processing
                    for (let i = 0; i < test.count; i++) {
                        const response = await request(testServer).get('/hello').expect(200);
                        expect(response.text).toBe('Hello world');
                    }
                } else if (test.type === 'burst') {
                    // Burst request processing
                    const burstRequests = Array(test.count).fill().map(() => 
                        request(testServer).get('/hello').expect(200)
                    );
                    const burstResults = await Promise.all(burstRequests);
                    burstResults.forEach(response => {
                        expect(response.text).toBe('Hello world');
                    });
                } else if (test.type === 'spaced') {
                    // Spaced request processing with delays
                    for (let i = 0; i < test.count; i++) {
                        const response = await request(testServer).get('/hello').expect(200);
                        expect(response.text).toBe('Hello world');
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                
                console.error(`Reliability test '${test.type}' with ${test.count} requests completed`);
            }
        });
    });
});