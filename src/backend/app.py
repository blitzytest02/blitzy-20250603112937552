#!/usr/bin/env python3
"""
Flask application factory implementing core web application functionality.
Replaces Express.js app.js with Python Flask framework using modern application factory pattern.

This module provides the Flask application factory function that creates and configures
a production-ready Flask application with route handlers, middleware configuration,
error handlers, and CORS support. Demonstrates comprehensive Flask implementation
patterns including decorator-based routing, request lifecycle management, and
enterprise-grade error handling.

Educational Purpose:
- Shows Flask application factory pattern for scalable application architecture
- Demonstrates Flask decorator-based routing replacing Express.js callback patterns
- Provides Flask middleware integration using before_request and after_request hooks
- Implements comprehensive error handling with @app.errorhandler decorators
- Shows Flask-CORS integration for cross-origin resource sharing configuration
- Replaces Express.js middleware stack with Flask request lifecycle management

Technical Features:
- Flask application factory pattern with configurable environments
- RESTful API endpoints using @app.route decorators
- JSON response generation using Flask's jsonify() function
- Flask-CORS integration for secure cross-origin request handling
- Comprehensive error handling for 404, 405, and 500 HTTP status codes
- Environment variable management using python-dotenv configuration
- Request logging and monitoring for educational visibility
- Production-ready security configurations and headers
"""

import os
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, Union
from functools import wraps

# Third-party imports for Flask web framework and extensions
try:
    from flask import Flask, request, jsonify, Response
    from flask_cors import CORS
    from dotenv import load_dotenv
except ImportError as e:
    print(f"❌ Critical Import Error: {e}")
    print("🔧 Please ensure all Flask dependencies are installed:")
    print("   pip install Flask>=3.1.1 Flask-CORS>=4.0.0 python-dotenv>=1.0.1")
    print("🎓 Educational Note: Flask application requires framework and CORS dependencies")
    raise ImportError(f"Flask application dependencies missing: {e}") from e

# Load environment variables from .env file using python-dotenv
# Replaces Node.js automatic process.env loading with explicit configuration
load_dotenv()

# Configure structured logging for Flask application
# Replaces Node.js console.log patterns with Python logging framework
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app(config_name: str = 'production') -> Flask:
    """
    Flask application factory function that creates and configures Flask application instance.
    Replaces Express.js createExpressApp() function with Flask application factory pattern.
    
    This function implements the Flask application factory pattern, providing a scalable
    approach to Flask application creation with environment-specific configurations,
    comprehensive middleware integration, and production-ready security settings.
    Demonstrates modern Flask development practices for educational purposes.
    
    Args:
        config_name: Environment configuration name (development, production, testing)
                    Defaults to 'production' for secure deployment practices
    
    Returns:
        Flask: Configured Flask application instance ready for WSGI deployment
        
    Raises:
        ImportError: If required Flask extensions are not available
        ValueError: If configuration parameters are invalid
        RuntimeError: If application initialization fails
    """
    try:
        # Log Flask application factory initialization
        logger.info("🔄 Initializing Flask application using factory pattern...")
        logger.info(f"🌍 Environment configuration: {config_name}")
        logger.info("🎓 Educational Note: Application factory pattern enables scalable Flask architecture")
        
        # Create Flask application instance using Flask constructor
        # Replaces Express.js express() with Flask(__name__)
        app = Flask(__name__)
        
        # Configure Flask application settings based on environment
        # Replaces Express.js app.set() configuration with Flask config dictionary
        configure_flask_settings(app, config_name)
        
        # Configure Flask security settings for production deployment
        # Replaces Express.js security middleware with Flask configuration
        configure_security_settings(app)
        
        # Initialize Flask-CORS for cross-origin resource sharing
        # Replaces Express.js CORS middleware with Flask-CORS extension
        configure_cors_middleware(app)
        
        # Register Flask middleware hooks for request lifecycle management
        # Replaces Express.js middleware stack with Flask before/after request decorators
        register_middleware_hooks(app)
        
        # Register Flask route handlers using decorator-based routing
        # Replaces Express.js app.get() method calls with Flask @app.route decorators
        register_route_handlers(app)
        
        # Register Flask error handlers for comprehensive error management
        # Replaces Express.js error handling middleware with Flask @app.errorhandler decorators
        register_error_handlers(app)
        
        # Log Flask application factory completion
        logger.info("✅ Flask application factory completed successfully")
        logger.info("🎯 Flask application ready for WSGI deployment")
        logger.info("🎓 Educational Note: Factory pattern provides testable and configurable applications")
        
        return app
        
    except Exception as e:
        # Handle Flask application factory errors with comprehensive logging
        logger.error("💥 Flask application factory initialization failed:")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error("🎓 Educational Note: Application factory errors prevent Flask startup")
        
        # Log troubleshooting information for educational purposes
        logger.error("🔧 Troubleshooting suggestions:")
        logger.error("   • Verify all Flask dependencies are installed with correct versions")
        logger.error("   • Check environment variables are properly configured")
        logger.error("   • Ensure Flask-CORS extension is available and compatible")
        logger.error("   • Review configuration parameters for validity")
        
        # Re-raise exception to prevent silent failures
        raise RuntimeError(f"Flask application factory failed: {e}") from e


def configure_flask_settings(app: Flask, environment: str) -> None:
    """
    Configures Flask application settings based on deployment environment.
    Replaces Express.js app.set() configuration with Flask config dictionary management.
    
    Args:
        app: Flask application instance to configure
        environment: Environment name for configuration selection
    """
    # Extract environment variables using python-dotenv and os.environ
    # Replaces Node.js process.env with Python environment variable access
    flask_env = os.getenv('FLASK_ENV', environment)
    debug_mode = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    # Base Flask configuration settings for all environments
    base_config = {
        'ENV': flask_env,
        'SECRET_KEY': os.getenv('SECRET_KEY', 'dev-key-change-in-production'),
        'JSON_SORT_KEYS': False,  # Preserve JSON key order for consistent responses
        'JSONIFY_PRETTYPRINT_REGULAR': True,  # Pretty-print JSON in development
        'MAX_CONTENT_LENGTH': 16 * 1024 * 1024,  # 16MB max request size
        'APPLICATION_ROOT': '/',  # Root path for URL generation
    }
    
    # Environment-specific configuration settings
    if environment == 'production':
        production_config = {
            'DEBUG': False,
            'TESTING': False,
            'PROPAGATE_EXCEPTIONS': True,
            'PREFERRED_URL_SCHEME': 'https',
            'SESSION_COOKIE_SECURE': True,
            'SESSION_COOKIE_HTTPONLY': True,
            'SESSION_COOKIE_SAMESITE': 'Lax',
            'PERMANENT_SESSION_LIFETIME': 3600,  # 1 hour session timeout
        }
        base_config.update(production_config)
        logger.info("🔒 Production Flask configuration applied")
        
    elif environment == 'development':
        development_config = {
            'DEBUG': debug_mode,
            'TESTING': False,
            'EXPLAIN_TEMPLATE_LOADING': True,
            'SESSION_COOKIE_SECURE': False,  # Allow HTTP in development
            'SESSION_COOKIE_HTTPONLY': True,
            'PERMANENT_SESSION_LIFETIME': 86400,  # 24 hour session in development
        }
        base_config.update(development_config)
        logger.info("🧪 Development Flask configuration applied")
        
    elif environment == 'testing':
        testing_config = {
            'DEBUG': False,
            'TESTING': True,
            'WTF_CSRF_ENABLED': False,  # Disable CSRF for testing
            'SESSION_COOKIE_SECURE': False,
            'SESSION_COOKIE_HTTPONLY': False,
        }
        base_config.update(testing_config)
        logger.info("🔬 Testing Flask configuration applied")
    
    # Apply configuration to Flask application
    app.config.update(base_config)
    
    logger.info("⚙️  Flask application configuration completed")
    logger.info(f"🌍 Environment: {flask_env}")
    logger.info(f"🐞 Debug mode: {app.config.get('DEBUG', False)}")
    logger.info("🎓 Educational Note: Flask configuration enables environment-specific behavior")


def configure_security_settings(app: Flask) -> None:
    """
    Configures Flask security settings for production deployment.
    Replaces Express.js security middleware with Flask configuration and headers.
    """
    # Disable Flask's X-Powered-By equivalent headers for security
    # Replaces Express.js app.disable('x-powered-by') with Flask configuration
    
    @app.after_request
    def add_security_headers(response: Response) -> Response:
        """
        Adds security headers to all Flask responses.
        Replaces Express.js security middleware with Flask after_request decorator.
        
        Args:
            response: Flask response object to modify
            
        Returns:
            Response: Modified response with security headers
        """
        # Remove server identification headers for security
        # Replaces Express.js x-powered-by disabling with header removal
        response.headers.pop('Server', None)
        
        # Add comprehensive security headers for production deployment
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'",
            'X-Permitted-Cross-Domain-Policies': 'none',
        }
        
        # Apply security headers to response
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response
    
    logger.info("🔒 Flask security headers configured")
    logger.info("🎓 Educational Note: Security headers protect against common web vulnerabilities")


def configure_cors_middleware(app: Flask) -> None:
    """
    Configures Flask-CORS for cross-origin resource sharing.
    Replaces Express.js CORS middleware with Flask-CORS extension integration.
    
    Args:
        app: Flask application instance to configure CORS
    """
    try:
        # Configure Flask-CORS with secure default settings
        # Replaces Express.js CORS middleware with Flask-CORS extension
        cors_config = {
            'origins': ['http://localhost:3000', 'http://localhost:8000'],  # Development origins
            'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'allow_headers': ['Content-Type', 'Authorization', 'X-Requested-With'],
            'supports_credentials': False,  # Secure default for stateless API
            'max_age': 86400,  # 24 hour preflight cache
        }
        
        # Initialize Flask-CORS with configuration
        CORS(app, **cors_config)
        
        logger.info("🌐 Flask-CORS configured successfully")
        logger.info("🎯 CORS origins: Development localhost allowed")
        logger.info("🎓 Educational Note: CORS enables secure cross-origin API access")
        
    except Exception as e:
        logger.error(f"❌ Flask-CORS configuration error: {e}")
        logger.error("🎓 Educational Note: CORS configuration is essential for web API development")
        raise RuntimeError(f"CORS configuration failed: {e}") from e


def register_middleware_hooks(app: Flask) -> None:
    """
    Registers Flask middleware hooks for request lifecycle management.
    Replaces Express.js middleware stack with Flask before_request and after_request decorators.
    
    Args:
        app: Flask application instance to register middleware hooks
    """
    @app.before_request
    def before_request_middleware() -> Optional[Response]:
        """
        Flask before_request middleware for request preprocessing.
        Replaces Express.js middleware functions with Flask decorator pattern.
        
        Returns:
            Optional[Response]: None to continue processing, Response to short-circuit
        """
        # Record request start time for performance monitoring
        # Replaces Express.js middleware timing with Flask request context
        request.start_time = time.time()
        
        # Log incoming request for educational visibility
        logger.info(f"📥 Incoming request: {request.method} {request.path}")
        
        # Add request ID for tracing (educational demonstration)
        request.id = f"req_{int(time.time() * 1000)}"
        
        # Validate request content type for POST/PUT requests
        if request.method in ['POST', 'PUT'] and request.content_length:
            if not request.is_json and 'application/json' not in request.content_type:
                logger.warning(f"⚠️  Non-JSON request detected: {request.content_type}")
        
        # Continue request processing (return None)
        return None
    
    @app.after_request
    def after_request_middleware(response: Response) -> Response:
        """
        Flask after_request middleware for response postprocessing.
        Replaces Express.js response middleware with Flask decorator pattern.
        
        Args:
            response: Flask response object to modify
            
        Returns:
            Response: Modified response object
        """
        # Calculate request processing time for performance monitoring
        # Replaces Express.js response time logging with Flask timing
        if hasattr(request, 'start_time'):
            processing_time = (time.time() - request.start_time) * 1000
            response.headers['X-Response-Time'] = f"{processing_time:.2f}ms"
            
            # Log request completion with timing information
            logger.info(f"📤 Request completed: {request.method} {request.path} - "
                       f"{response.status_code} - {processing_time:.2f}ms")
        
        # Add request ID to response headers for tracing
        if hasattr(request, 'id'):
            response.headers['X-Request-ID'] = request.id
        
        return response
    
    logger.info("🔄 Flask middleware hooks registered successfully")
    logger.info("🎓 Educational Note: Flask middleware enables request/response processing")


def register_route_handlers(app: Flask) -> None:
    """
    Registers Flask route handlers using decorator-based routing.
    Replaces Express.js route definitions with Flask @app.route decorators.
    
    Args:
        app: Flask application instance to register routes
    """
    
    @app.route('/hello', methods=['GET'])
    def hello_route_handler() -> Response:
        """
        Flask route handler for GET /hello endpoint that generates and returns
        'Hello world' response with proper HTTP headers and JSON formatting.
        Replaces Express.js helloRouteHandler function with Flask decorator pattern.
        
        Implements stateless operation following RESTful principles and demonstrates
        proper Flask response handling patterns with comprehensive logging for
        educational visibility and debugging purposes.
        
        Returns:
            Response: Flask response object with 'Hello world' message
        """
        try:
            # Log route handler execution for educational visibility
            logger.info("🌍 Processing GET /hello request")
            
            # Generate response body as specified in requirements
            # Replaces Express.js res.send() with Flask response generation
            response_body = 'Hello world'
            
            # Create JSON response using Flask's jsonify() function
            # Replaces Express.js res.json() with Flask JSON response helper
            response_data = {
                'message': response_body,
                'timestamp': datetime.now().isoformat(),
                'status': 'success'
            }
            
            # Generate Flask response with proper status code and content type
            # Replaces Express.js res.status().json() with Flask jsonify()
            response = jsonify(response_data)
            response.status_code = 200
            
            # Add custom headers for educational demonstration
            response.headers['Content-Type'] = 'application/json'
            response.headers['X-API-Version'] = '1.0'
            
            # Log successful response generation for educational purposes
            logger.info(f"✅ GET /hello - 200 OK - Response sent: \"{response_body}\"")
            logger.info("🎓 Educational Note: Flask jsonify() provides secure JSON responses")
            
            return response
            
        except Exception as e:
            # Handle route handler errors with comprehensive logging
            logger.error(f"❌ Error in /hello route handler: {e}")
            logger.error("🎓 Educational Note: Route handler errors should be caught and logged")
            
            # Return error response using Flask error handling
            error_response = jsonify({
                'status': 'error',
                'message': 'Internal server error in hello endpoint',
                'timestamp': datetime.now().isoformat()
            })
            error_response.status_code = 500
            return error_response
    
    @app.route('/health', methods=['GET'])
    def health_check_handler() -> Response:
        """
        Flask route handler for GET /health endpoint providing application health status.
        Enables monitoring and deployment verification with comprehensive status reporting.
        
        Returns:
            Response: Flask JSON response with health status information
        """
        try:
            # Generate health check response data
            health_data = {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'uptime': time.time(),
                'version': '1.0.0',
                'environment': app.config.get('ENV', 'unknown'),
                'debug': app.config.get('DEBUG', False)
            }
            
            # Create JSON response for health check
            response = jsonify(health_data)
            response.status_code = 200
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            
            logger.info("💚 Health check completed successfully")
            return response
            
        except Exception as e:
            # Handle health check errors
            logger.error(f"❌ Health check error: {e}")
            error_response = jsonify({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
            error_response.status_code = 503
            return error_response
    
    logger.info("🛣️  Flask route handlers registered successfully")
    logger.info("🎯 Available endpoints: GET /hello, GET /health")
    logger.info("🎓 Educational Note: Flask decorators provide clean routing syntax")


def register_error_handlers(app: Flask) -> None:
    """
    Registers Flask error handlers for comprehensive error management.
    Replaces Express.js error handling middleware with Flask @app.errorhandler decorators.
    
    Args:
        app: Flask application instance to register error handlers
    """
    
    @app.errorhandler(404)
    def not_found_handler(error) -> Response:
        """
        Flask error handler for 404 Not Found responses when routes are not matched.
        Replaces Express.js notFoundHandler middleware with Flask decorator pattern.
        
        Provides consistent error response format following HTTP standards and implements
        security best practice of not exposing internal application information.
        
        Args:
            error: Flask error object (unused but required by Flask)
            
        Returns:
            Response: Flask JSON response with 404 error information
        """
        # Log 404 error for educational debugging and monitoring
        # Replaces Express.js console.warn with Python logging
        logger.warning(f"🔍 404 Not Found - {request.method} {request.path} - Route not matched")
        logger.warning("🎓 Educational Note: 404 errors indicate missing route definitions")
        
        # Create error response object with status and message
        # Replaces Express.js res.status(404).json() with Flask error response
        error_response = {
            'status': 404,
            'error': 'Not Found',
            'message': 'The requested resource was not found on this server',
            'path': request.path,
            'method': request.method,
            'timestamp': datetime.now().isoformat()
        }
        
        # Generate Flask JSON response using jsonify()
        # Replaces Express.js res.json() with Flask response generation
        response = jsonify(error_response)
        response.status_code = 404
        response.headers['Content-Type'] = 'application/json'
        
        return response
    
    @app.errorhandler(405)
    def method_not_allowed_handler(error) -> Response:
        """
        Flask error handler for 405 Method Not Allowed responses.
        Handles cases where route exists but HTTP method is not supported.
        
        Args:
            error: Flask error object containing method information
            
        Returns:
            Response: Flask JSON response with 405 error information
        """
        # Log 405 error for educational visibility
        logger.warning(f"🚫 405 Method Not Allowed - {request.method} {request.path}")
        logger.warning("🎓 Educational Note: 405 errors indicate unsupported HTTP methods")
        
        # Create method not allowed error response
        error_response = {
            'status': 405,
            'error': 'Method Not Allowed',
            'message': f'The {request.method} method is not allowed for this resource',
            'path': request.path,
            'method': request.method,
            'allowed_methods': getattr(error, 'valid_methods', []),
            'timestamp': datetime.now().isoformat()
        }
        
        # Generate Flask JSON response
        response = jsonify(error_response)
        response.status_code = 405
        response.headers['Content-Type'] = 'application/json'
        
        # Add Allow header with supported methods
        if hasattr(error, 'valid_methods') and error.valid_methods:
            response.headers['Allow'] = ', '.join(error.valid_methods)
        
        return response
    
    @app.errorhandler(500)
    def internal_server_error_handler(error) -> Response:
        """
        Flask error handler for 500 Internal Server Error responses.
        Replaces Express.js serverErrorHandler middleware with Flask decorator pattern.
        
        Implements secure error handling by providing generic error messages without
        exposing sensitive application details or stack traces to clients.
        
        Args:
            error: Flask error object from exceptions or application errors
            
        Returns:
            Response: Flask JSON response with 500 error information
        """
        # Log detailed error information for debugging (server-side only)
        # Replaces Express.js console.error with Python structured logging
        logger.error("💥 500 Internal Server Error occurred:")
        logger.error(f"Error type: {type(error).__name__}")
        logger.error(f"Error message: {str(error)}")
        logger.error(f"Request path: {request.path}")
        logger.error(f"Request method: {request.method}")
        logger.error("🎓 Educational Note: 500 errors indicate application-level problems")
        
        # Log full stack trace in development mode only
        if app.config.get('DEBUG'):
            logger.error(f"Error details: {error}", exc_info=True)
        
        # Create generic error response object for security
        # Replaces Express.js error response with Flask error handling
        error_response = {
            'status': 500,
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred while processing your request',
            'timestamp': datetime.now().isoformat(),
            'request_id': getattr(request, 'id', 'unknown')
        }
        
        # Generate Flask JSON response without exposing stack trace
        # Replaces Express.js res.status(500).json() with Flask response
        response = jsonify(error_response)
        response.status_code = 500
        response.headers['Content-Type'] = 'application/json'
        
        return response
    
    @app.errorhandler(Exception)
    def generic_exception_handler(error) -> Response:
        """
        Flask error handler for all unhandled exceptions.
        Provides comprehensive error handling for unexpected application errors.
        
        Args:
            error: Python exception object
            
        Returns:
            Response: Flask JSON response with error information
        """
        # Log unexpected exception with full details
        logger.error(f"💥 Unhandled exception: {type(error).__name__}: {str(error)}")
        logger.error("🎓 Educational Note: Generic exception handlers catch all unhandled errors")
        
        # Log stack trace in development mode
        if app.config.get('DEBUG'):
            logger.error("Exception details:", exc_info=True)
        
        # Create generic error response
        error_response = {
            'status': 500,
            'error': 'Unexpected Error',
            'message': 'An unexpected error occurred',
            'timestamp': datetime.now().isoformat()
        }
        
        response = jsonify(error_response)
        response.status_code = 500
        return response
    
    logger.info("🚨 Flask error handlers registered successfully")
    logger.info("🎯 Error handling: 404, 405, 500, and generic exceptions")
    logger.info("🎓 Educational Note: Error handlers provide consistent error responses")


# Flask application configuration mappings for different environments
# Replaces Express.js configuration patterns with Flask application contexts
FLASK_CONFIGS = {
    'development': {
        'DEBUG': True,
        'TESTING': False,
        'LOG_LEVEL': 'DEBUG'
    },
    'production': {
        'DEBUG': False,
        'TESTING': False,
        'LOG_LEVEL': 'INFO'
    },
    'testing': {
        'DEBUG': False,
        'TESTING': True,
        'LOG_LEVEL': 'WARNING'
    }
}


def create_production_app() -> Flask:
    """
    Creates Flask application instance optimized for production deployment.
    Convenience function for production WSGI server integration.
    
    Returns:
        Flask: Production-configured Flask application instance
    """
    return create_app('production')


def create_development_app() -> Flask:
    """
    Creates Flask application instance optimized for development workflow.
    Convenience function for development server and debugging.
    
    Returns:
        Flask: Development-configured Flask application instance
    """
    return create_app('development')


def create_testing_app() -> Flask:
    """
    Creates Flask application instance optimized for automated testing.
    Convenience function for pytest test suite execution.
    
    Returns:
        Flask: Testing-configured Flask application instance
    """
    return create_app('testing')


# Export Flask application factory functions for external usage
# Replaces Node.js module.exports with Python module-level exports
__all__ = [
    'create_app',
    'create_production_app', 
    'create_development_app',
    'create_testing_app'
]


# Development server execution for educational purposes
# This section is equivalent to Node.js standalone server execution
if __name__ == '__main__':
    # Configure development environment logging
    logging.basicConfig(level=logging.DEBUG)
    
    # Log educational information about Flask development server
    logger.info("🎓 Educational Tutorial: Flask Application Development Server")
    logger.info("📖 Learning Objectives: Flask routing, middleware, error handling")
    logger.warning("⚠️  Development server is not suitable for production deployment")
    logger.info("🔧 Production deployment: Use Gunicorn WSGI server with wsgi.py")
    
    try:
        # Create Flask application for development
        app = create_development_app()
        
        # Extract host and port from environment variables
        # Replaces Node.js process.env with Python os.environ access
        host = os.getenv('HOST', 'localhost')
        port = int(os.getenv('PORT', '8000'))
        
        # Log development server startup information
        logger.info("\n🚀 Starting Flask Development Server!")
        logger.info("=" * 50)
        logger.info(f"🌍 Host: {host}")
        logger.info(f"🔌 Port: {port}")
        logger.info(f"🎯 URL: http://{host}:{port}")
        logger.info("🌐 Endpoints:")
        logger.info(f"   GET  http://{host}:{port}/hello")
        logger.info(f"   GET  http://{host}:{port}/health")
        logger.info("=" * 50)
        
        # Start Flask development server
        # Replaces Node.js server.listen() with Flask app.run()
        app.run(
            host=host,
            port=port,
            debug=True,
            use_reloader=False  # Disable reloader to prevent import issues
        )
        
    except Exception as e:
        # Handle development server startup errors
        logger.error(f"❌ Flask development server startup failed: {e}")
        logger.error("🔧 Troubleshooting suggestions:")
        logger.error("   • Check if port is already in use")
        logger.error("   • Verify environment variables are set correctly")
        logger.error("   • Ensure Flask application factory is working")
        raise SystemExit(1) from e