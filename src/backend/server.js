// Main entry point for the Node.js tutorial HTTP server
// Demonstrates fundamental server lifecycle management, port configuration, and graceful shutdown
// Using Node.js v22.16.0 LTS and Express.js v5.1.0 for educational purposes

const app = require('./app.js'); // Import configured Express.js application instance with routes and middleware

// Global configuration variables with environment variable support and secure defaults
const PORT = process.env.PORT || 3000; // Server port configuration with environment variable support
const HOST = process.env.HOST || 'localhost'; // Server host address configuration
let server = null; // HTTP server instance created by app.listen() for lifecycle management

/**
 * Initializes and starts the HTTP server with the Express.js application,
 * handling port binding, startup logging, and error management for educational demonstration
 * 
 * @returns {http.Server} Node.js HTTP server instance for lifecycle management
 */
function startServer() {
    try {
        // Extract PORT from environment variables with default fallback to 3000
        const serverPort = validatePortNumber(PORT);
        
        // Extract HOST from environment variables with default fallback to 'localhost'
        const serverHost = validateHostAddress(HOST);
        
        // Call app.listen(PORT, HOST, callback) to start HTTP server
        server = app.listen(serverPort, serverHost, () => {
            // Log server startup success with port and host information
            logServerStatus(serverPort, serverHost);
            
            // Log educational message about accessing /hello endpoint
            console.log('🎓 Educational Tutorial: Try accessing the /hello endpoint');
            console.log(`📖 Learning Objective: Understanding HTTP server fundamentals with Node.js v22.16.0 LTS`);
            console.log(`🔧 Framework: Express.js v5.1.0 with enhanced security features`);
        });
        
        // Handle port binding errors with educational error messages
        server.on('error', (error) => {
            handleServerError(error);
        });
        
        // Setup graceful shutdown handlers for SIGTERM and SIGINT signals
        setupGracefulShutdown(server);
        
        // Return server instance for graceful shutdown management
        return server;
        
    } catch (error) {
        // Handle startup errors with educational error messages
        handleServerError(error);
        process.exit(1);
    }
}

/**
 * Configures graceful shutdown handlers for SIGTERM and SIGINT signals to ensure clean server termination
 * and resource cleanup for educational process management demonstration
 * 
 * @param {http.Server} serverInstance - HTTP server instance for lifecycle management
 * @returns {void} Sets up signal handlers for graceful shutdown
 */
function setupGracefulShutdown(serverInstance) {
    // Register SIGTERM signal handler for graceful shutdown
    process.on('SIGTERM', () => {
        console.log('\n🛑 SIGTERM signal received: Starting graceful shutdown process...');
        performGracefulShutdown(serverInstance, 'SIGTERM');
    });
    
    // Register SIGINT signal handler for Ctrl+C termination
    process.on('SIGINT', () => {
        console.log('\n🛑 SIGINT signal received (Ctrl+C): Starting graceful shutdown process...');
        performGracefulShutdown(serverInstance, 'SIGINT');
    });
    
    // Handle uncaught exceptions for educational error visibility
    process.on('uncaughtException', (error) => {
        console.error('💥 Uncaught Exception detected:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('🎓 Educational Note: Always handle errors properly in production applications');
        performGracefulShutdown(serverInstance, 'UNCAUGHT_EXCEPTION');
    });
    
    // Handle unhandled promise rejections for educational awareness
    process.on('unhandledRejection', (reason, promise) => {
        console.error('💥 Unhandled Promise Rejection detected:');
        console.error('Rejection reason:', reason);
        console.error('Promise:', promise);
        console.error('🎓 Educational Note: Express.js v5.1.0 provides automatic promise rejection handling');
        performGracefulShutdown(serverInstance, 'UNHANDLED_REJECTION');
    });
}

/**
 * Performs the actual graceful shutdown process with timeout management
 * 
 * @param {http.Server} serverInstance - HTTP server instance to shutdown
 * @param {string} signal - Signal that triggered the shutdown
 * @returns {void} Executes graceful shutdown sequence
 */
function performGracefulShutdown(serverInstance, signal) {
    // Log shutdown initiation message for educational visibility
    console.log(`📋 Graceful shutdown initiated by ${signal}`);
    console.log('⏱️  Shutdown timeout: 10 seconds maximum');
    
    // Set shutdown timeout to prevent hanging
    const shutdownTimeout = setTimeout(() => {
        console.error('⚠️  Graceful shutdown timeout exceeded (10 seconds)');
        console.error('🔧 Forcing process termination for educational demonstration');
        process.exit(1);
    }, 10000);
    
    if (serverInstance) {
        // Call server.close() to stop accepting new connections
        serverInstance.close((error) => {
            clearTimeout(shutdownTimeout);
            
            if (error) {
                // Handle shutdown errors with appropriate logging
                console.error('❌ Error during server shutdown:', error.message);
                console.error('🎓 Educational Note: Proper error handling is crucial for server lifecycle management');
                process.exit(1);
            } else {
                // Log shutdown completion message
                console.log('✅ HTTP server closed successfully');
                console.log('🧹 Existing connections completed gracefully');
                console.log('📚 Educational Note: Clean shutdown preserves data integrity');
                
                // Exit process with code 0 for successful termination
                console.log('👋 Server shutdown complete. Thank you for learning Node.js and Express.js!');
                process.exit(0);
            }
        });
        
        // Wait for existing connections to complete with timeout
        console.log('🔄 Waiting for existing connections to complete...');
        console.log('🎓 Educational Note: Graceful shutdown allows pending requests to finish');
    } else {
        clearTimeout(shutdownTimeout);
        console.log('ℹ️  No active server instance to shutdown');
        process.exit(0);
    }
}

/**
 * Error handler for server startup failures including port binding errors, permission issues,
 * and other server initialization problems with educational error messages
 * 
 * @param {Error} error - Error object containing startup failure information
 * @returns {void} Logs error and exits process
 */
function handleServerError(error) {
    console.error('\n💥 Server Error Detected:');
    console.error('='.repeat(50));
    
    // Check error code for specific error types (EADDRINUSE, EACCES, etc.)
    switch (error.code) {
        case 'EADDRINUSE':
            // Log educational error message for port already in use
            console.error(`❌ Port ${PORT} is already in use`);
            console.error('🔧 Troubleshooting suggestions:');
            console.error('   • Stop other applications using this port');
            console.error('   • Try a different port: PORT=3001 node server.js');
            console.error('   • Check running processes: lsof -i :3000 (macOS/Linux) or netstat -ano | findstr :3000 (Windows)');
            console.error('🎓 Educational Note: EADDRINUSE means the port is already bound to another process');
            break;
            
        case 'EACCES':
            // Log educational error message for permission denied
            console.error(`❌ Permission denied to bind to port ${PORT}`);
            console.error('🔧 Troubleshooting suggestions:');
            console.error('   • Use a port number above 1024 (non-privileged ports)');
            console.error('   • Run with elevated privileges (not recommended for development)');
            console.error('   • Try PORT=3000 node server.js for development');
            console.error('🎓 Educational Note: Ports below 1024 require administrator privileges');
            break;
            
        case 'ENOTFOUND':
            // Log educational error message for host not found
            console.error(`❌ Host '${HOST}' not found`);
            console.error('🔧 Troubleshooting suggestions:');
            console.error('   • Use HOST=localhost for local development');
            console.error('   • Verify host address is correct');
            console.error('   • Check network connectivity');
            console.error('🎓 Educational Note: ENOTFOUND indicates DNS resolution failure');
            break;
            
        default:
            // Log generic error with comprehensive information
            console.error(`❌ Server startup error: ${error.message}`);
            console.error('🔧 General troubleshooting suggestions:');
            console.error('   • Verify Node.js v22.16.0 LTS is installed');
            console.error('   • Ensure Express.js v5.1.0 is installed: npm install express@^5.1.0');
            console.error('   • Check for typos in environment variables');
            console.error('   • Review server configuration');
            break;
    }
    
    // Log full error details for debugging purposes
    console.error('\n🐛 Detailed Error Information:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code || 'N/A');
    console.error('Error stack trace:');
    console.error(error.stack);
    
    // Provide educational context
    console.error('\n📚 Educational Context:');
    console.error('• This error occurred during HTTP server initialization');
    console.error('• Proper error handling prevents silent failures');
    console.error('• Always validate configuration before starting servers');
    console.error('• Use environment variables for flexible configuration');
    
    // Exit process with error code 1
    console.error('\n🚪 Exiting process with error code 1');
    console.error('='.repeat(50));
}

/**
 * Logs server status information including startup success, port binding, and access instructions
 * for educational transparency and user guidance
 * 
 * @param {number} port - Port number the server is listening on
 * @param {string} host - Host address the server is bound to
 * @returns {void} Outputs educational logging information
 */
function logServerStatus(port, host) {
    const timestamp = new Date().toISOString();
    
    // Log server startup success message with timestamp
    console.log('\n🚀 Server Successfully Started!');
    console.log('='.repeat(60));
    console.log(`⏰ Startup time: ${timestamp}`);
    console.log(`🌐 Server listening on: http://${host}:${port}`);
    console.log(`📡 Host: ${host}`);
    console.log(`🔌 Port: ${port}`);
    
    // Include Node.js and Express.js version information
    console.log('\n📋 Runtime Information:');
    console.log(`   Node.js version: ${process.version}`);
    console.log(`   Express.js version: 5.1.0 (Latest)`);
    console.log(`   Process ID: ${process.pid}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    
    // Log educational instructions for accessing /hello endpoint
    console.log('\n🎯 Available Endpoints:');
    console.log(`   GET  http://${host}:${port}/hello  →  Returns "Hello world"`);
    
    // Log curl command example for testing
    console.log('\n🔧 Testing Commands:');
    console.log(`   curl http://${host}:${port}/hello`);
    console.log(`   curl -i http://${host}:${port}/hello  # Include response headers`);
    
    // Log browser URL for direct access
    console.log('\n🌐 Browser Access:');
    console.log(`   Open: http://${host}:${port}/hello`);
    
    // Provide shutdown instructions (Ctrl+C)
    console.log('\n⚡ Server Management:');
    console.log('   Press Ctrl+C to gracefully shutdown the server');
    console.log('   SIGTERM and SIGINT signals are handled for clean termination');
    
    // Educational notes about server architecture
    console.log('\n📚 Educational Notes:');
    console.log('   • This server demonstrates HTTP/1.1 protocol fundamentals');
    console.log('   • Express.js v5.1.0 provides enhanced security and promise handling');
    console.log('   • The server operates in a single Node.js process');
    console.log('   • Graceful shutdown ensures clean resource cleanup');
    console.log('   • Environment variables enable flexible configuration');
    
    console.log('='.repeat(60));
    console.log('✨ Happy learning! Server is ready to handle requests.\n');
}

/**
 * Validates port number is within valid range and returns parsed integer
 * 
 * @param {string|number} port - Port number to validate
 * @returns {number} Validated port number
 */
function validatePortNumber(port) {
    const portNumber = parseInt(port, 10);
    
    // Validate port number is within valid range (1024-65535)
    if (isNaN(portNumber)) {
        throw new Error(`Invalid port number: ${port}. Port must be a number.`);
    }
    
    if (portNumber < 1024 || portNumber > 65535) {
        console.warn(`⚠️  Port ${portNumber} is outside recommended range (1024-65535)`);
        if (portNumber < 1024) {
            console.warn('🎓 Educational Note: Ports below 1024 require administrator privileges');
        }
    }
    
    return portNumber;
}

/**
 * Validates host address format and returns sanitized host string
 * 
 * @param {string} host - Host address to validate
 * @returns {string} Validated host address
 */
function validateHostAddress(host) {
    if (typeof host !== 'string' || host.trim().length === 0) {
        throw new Error(`Invalid host address: ${host}. Host must be a non-empty string.`);
    }
    
    const sanitizedHost = host.trim();
    
    // Log educational information about host binding
    if (sanitizedHost === '0.0.0.0') {
        console.log('🌐 Educational Note: Binding to 0.0.0.0 makes server accessible from any network interface');
    } else if (sanitizedHost === 'localhost' || sanitizedHost === '127.0.0.1') {
        console.log('🏠 Educational Note: Binding to localhost/127.0.0.1 restricts access to local machine only');
    }
    
    return sanitizedHost;
}

/**
 * Logs current memory usage for educational resource awareness
 * 
 * @returns {void} Outputs memory usage information
 */
function logMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    console.log('\n💾 Memory Usage Status:');
    console.log(`   Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    console.log(`   Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`);
    console.log(`   External: ${Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100} MB`);
    console.log(`   RSS: ${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`);
    console.log('🎓 Educational Note: Monitor memory usage to prevent leaks in production applications');
}

// Enhanced error handling for educational visibility
process.on('warning', (warning) => {
    console.warn('⚠️  Node.js Warning:', warning.name);
    console.warn('Warning message:', warning.message);
    console.warn('🎓 Educational Note: Warnings indicate potential issues that should be addressed');
});

// Log initial memory usage for educational baseline
console.log('🎓 Educational Tutorial: Node.js HTTP Server with Express.js');
console.log('📖 Learning Objectives: Server lifecycle, graceful shutdown, error handling');
logMemoryUsage();

// Initialize and start the HTTP server
console.log('\n🔄 Initializing HTTP server...');
const serverInstance = startServer();

// Log memory usage after server startup for educational comparison
setTimeout(() => {
    logMemoryUsage();
}, 1000);

// Export server instance for testing purposes
module.exports = serverInstance;