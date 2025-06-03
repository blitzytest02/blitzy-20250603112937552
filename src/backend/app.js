// Express.js application configuration file for Node.js tutorial
// Demonstrates fundamental HTTP server concepts using Express.js v5.1.0
// with modern security features and educational best practices

const express = require('express'); // ^5.1.0 - Fast, unopinionated, minimalist web framework for Node.js with v5 security enhancements and automatic promise handling

/**
 * Factory function that creates and configures Express.js application instance
 * with security settings, middleware, and route handlers
 * 
 * Leverages Express.js v5.1.0 features including:
 * - Automatic promise rejection handling
 * - ReDoS protection through path-to-regexp@8.x
 * - Framework fingerprinting prevention
 * - Enhanced error management
 * 
 * @returns {Express.Application} Configured Express application instance ready for HTTP server creation
 */
function createExpressApp() {
    // Create Express application instance using express()
    const app = express();
    
    // Disable X-Powered-By header for security (framework fingerprinting prevention)
    // Prevents attackers from identifying Express.js framework usage
    app.disable('x-powered-by');
    
    // Configure Express.js v5 security settings and middleware
    // Set trust proxy to false for educational single-server setup
    app.set('trust proxy', false);
    
    // Configure case sensitive routing for consistent behavior
    app.set('case sensitive routing', false);
    
    // Configure strict routing for trailing slash handling
    app.set('strict routing', false);
    
    // Register /hello route handler with GET method
    // Demonstrates basic Express.js routing and response generation
    app.get('/hello', helloRouteHandler);
    
    // Setup 404 Not Found error handling middleware
    // Must be placed after all route definitions to catch unmatched routes
    app.use(notFoundHandler);
    
    // Setup 500 Internal Server Error handling middleware
    // Must be defined last in middleware stack with 4 parameters for error handling
    // Leverages Express.js v5 automatic promise rejection handling
    app.use(serverErrorHandler);
    
    // Return configured Express application instance
    return app;
}

/**
 * Route handler function for GET /hello endpoint that generates and returns
 * 'Hello world' response with proper HTTP headers
 * 
 * Implements stateless operation following RESTful principles
 * Demonstrates proper Express.js response handling patterns
 * 
 * @param {Express.Request} req - Express request object containing HTTP request data
 * @param {Express.Response} res - Express response object for sending HTTP response
 * @returns {void} Sends HTTP response directly through Express response object
 */
function helloRouteHandler(req, res) {
    // Set response Content-Type header to 'text/plain' for proper MIME type handling
    res.set('Content-Type', 'text/plain');
    
    // Set response status code to 200 OK indicating successful request processing
    res.status(200);
    
    // Generate 'Hello world' response body as specified in requirements
    const responseBody = 'Hello world';
    
    // Send response using res.send() method with static content
    res.send(responseBody);
    
    // Log request completion for educational visibility and debugging
    console.log(`GET /hello - 200 OK - Response sent: "${responseBody}"`);
}

/**
 * Error handling middleware function for 404 Not Found responses
 * when routes are not matched by any defined route handlers
 * 
 * Provides consistent error response format following HTTP standards
 * Implements security best practice of not exposing internal information
 * 
 * @param {Express.Request} req - Express request object
 * @param {Express.Response} res - Express response object
 * @param {Express.NextFunction} next - Express next function for middleware chaining
 * @returns {void} Sends 404 error response
 */
function notFoundHandler(req, res, next) {
    // Set response status code to 404 Not Found
    res.status(404);
    
    // Set response Content-Type to 'application/json' for structured error response
    res.set('Content-Type', 'application/json');
    
    // Create error response object with status and message
    // Avoid exposing sensitive server information in error messages
    const errorResponse = {
        status: 404,
        message: 'Not Found',
        path: req.path,
        method: req.method
    };
    
    // Send JSON error response without sensitive information
    res.json(errorResponse);
    
    // Log 404 error for educational debugging and monitoring
    console.warn(`404 Not Found - ${req.method} ${req.path} - Route not matched`);
}

/**
 * Express.js v5 error handling middleware for 500 Internal Server Error responses
 * with automatic promise rejection handling capabilities
 * 
 * Implements secure error handling by providing generic error messages
 * without exposing sensitive application details or stack traces
 * 
 * @param {Error} err - Error object from rejected promises or thrown exceptions
 * @param {Express.Request} req - Express request object
 * @param {Express.Response} res - Express response object
 * @param {Express.NextFunction} next - Express next function for error propagation
 * @returns {void} Sends 500 error response
 */
function serverErrorHandler(err, req, res, next) {
    // Check if response headers have already been sent to prevent multiple responses
    if (res.headersSent) {
        // If headers already sent, delegate to default Express error handler
        return next(err);
    }
    
    // Set response status code to 500 Internal Server Error
    res.status(500);
    
    // Set response Content-Type to 'application/json' for structured error response
    res.set('Content-Type', 'application/json');
    
    // Create generic error response object for security
    // Never expose stack traces or internal error details to clients
    const errorResponse = {
        status: 500,
        message: 'Internal Server Error',
        timestamp: new Date().toISOString()
    };
    
    // Log detailed error information for debugging (server-side only)
    // Include full error details for development and monitoring
    console.error('500 Internal Server Error occurred:');
    console.error('Error message:', err.message);
    console.error('Request path:', req.path);
    console.error('Request method:', req.method);
    console.error('Error stack:', err.stack);
    
    // Send JSON error response without exposing stack trace
    // Maintains security while providing client feedback
    res.json(errorResponse);
    
    // Leverage Express.js v5 automatic promise rejection forwarding
    // Rejected promises are automatically caught and forwarded to this middleware
}

// Create configured Express application instance
const app = createExpressApp();

// Export configured Express.js application instance for HTTP server creation and testing
// Exposes Express application methods: listen, get, use, set, disable
module.exports = app;