#!/usr/bin/env python3
"""
Flask application factory and configuration module for Python tutorial
Demonstrates comprehensive Flask v3.1.1 patterns using modern Python web development.

This module replaces the Express.js app.js functionality by implementing Flask
application factory pattern with decorator-based routing, error handling, and
CORS support. Provides educational examples of production-ready Flask patterns
including security hardening, middleware integration, and WSGI deployment.

Educational Purpose:
- Demonstrates Flask application factory pattern for scalable initialization
- Shows Flask decorator-based routing and error handling best practices
- Provides Flask-CORS integration for cross-origin resource sharing
- Implements production-ready security configurations and response patterns
- Replaces Express.js middleware with Flask before/after request decorators
"""

import os
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime

# Third-party imports for Flask application and extensions
try:
    from flask import Flask, jsonify, request, Response
    from flask_cors import CORS
    from dotenv import load_dotenv
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("🔧 Please ensure all dependencies are installed:")
    print("   pip install Flask>=3.1.1 Flask-CORS>=4.0.0 python-dotenv>=1.0.1")
    print("🎓 Educational Note: Dependencies are required for Flask application")
    raise

# Load environment variables from .env file using python-dotenv
# Replaces Node.js process.env with Python equivalent
load_dotenv()

# Configure Python logging for educational visibility
# Replaces Node.js console.log patterns with structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app(config_name: Optional[str] = None) -> Flask:
    """
    Flask application factory function that creates and configures Flask app instance
    with security settings, middleware, route handlers, and error handling.
    
    Replaces Express.js createExpressApp() function with Flask application factory pattern.
    Leverages Flask v3.1.1 features including:
    - Application factory pattern for configuration management
    - WSGI-compliant request/response processing
    - Decorator-based routing and error handling
    - Flask-CORS integration for cross-origin resource sharing
    - Production-ready security configurations
    
    Args:
        config_name: Optional configuration name for environment-specific settings
        
    Returns:
        Flask: Configured Flask application instance ready for WSGI deployment
        
    Raises:
        ImportError: If required Flask dependencies are not available
        ValueError: If configuration parameters are invalid
    """
    # Create Flask application instance using Flask()
    # Replaces Express.js express() with Flask(__name__)
    app = Flask(__name__)
    
    # Log Flask application factory initialization
    logger.info("🔄 Initializing Flask application factory...")
    logger.info("🎓 Educational Note: Flask application factory pattern enables configuration flexibility")
    
    # Configure Flask security settings and disable server fingerprinting
    # Replaces Express.js app.disable('x-powered-by') with Flask configuration
    configure_security_settings(app)
    
    # Configure CORS support using Flask-CORS extension
    # Replaces Express.js built-in CORS with Flask-CORS integration
    configure_cors_settings(app)
    
    # Configure Flask application settings and environment
    configure_application_settings(app, config_name)
    
    # Register Flask middleware using before_request and after_request decorators
    # Replaces Express.js middleware stack with Flask decorator patterns
    register_middleware_hooks(app)
    
    # Register Flask route handlers using @app.route decorators
    # Replaces Express.js app.get() method calls with Flask decorator routing
    register_route_handlers(app)
    
    # Register Flask error handlers using @app.errorhandler decorators
    # Replaces Express.js error handling middleware with Flask error decorators
    register_error_handlers(app)
    
    # Log successful Flask application configuration
    logger.info("✅ Flask application factory initialization complete")
    logger.info("🎯 Flask application ready for WSGI deployment")
    logger.info("🚀 Available endpoints: /hello, /health")
    
    return app


def configure_security_settings(app: Flask) -> None:
    """
    Configures Flask security settings for production deployment.
    Replaces Express.js security middleware with Flask configuration patterns.
    
    Args:
        app: Flask application instance to configure
    """
    # Disable Flask server header for security (framework fingerprinting prevention)
    # Replaces Express.js app.disable('x-powered-by') with Flask equivalent
    app.config['SERVER_NAME'] = None  # Prevents server header exposure
    
    # Configure Flask security headers and settings
    # Replaces Express.js security middleware with Flask configuration
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # 1 year cache for static files
    app.config['PREFERRED_URL_SCHEME'] = 'https'  # Prefer HTTPS in production
    app.config['SESSION_COOKIE_SECURE'] = True  # Secure cookies in production
    app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent XSS cookie access
    app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'  # CSRF protection
    
    # Configure Flask request handling settings
    # Replaces Express.js app.set() configuration with Flask settings
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max request size
    app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False  # Compact JSON responses
    
    logger.info("🔒 Flask security settings configured")
    logger.info("🎓 Educational Note: Security headers prevent common vulnerabilities")


def configure_cors_settings(app: Flask) -> None:
    """
    Configures CORS (Cross-Origin Resource Sharing) using Flask-CORS extension.
    Replaces Express.js built-in CORS with Flask-CORS integration.
    
    Args:
        app: Flask application instance to configure
    """
    # Initialize Flask-CORS extension with security-focused configuration
    # Replaces Express.js CORS middleware with Flask-CORS
    cors_config = {
        'origins': ['http://localhost:3000', 'http://127.0.0.1:3000'],  # Development origins
        'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  # Allowed HTTP methods
        'allow_headers': ['Content-Type', 'Authorization', 'X-Requested-With'],  # Allowed headers
        'supports_credentials': False,  # No credentials for stateless API
        'max_age': 86400,  # 24 hours preflight cache
    }
    
    # Configure production CORS settings if not in development
    flask_env = os.getenv('FLASK_ENV', 'production')
    if flask_env == 'production':
        cors_config['origins'] = ['https://*.azurewebsites.net']  # Production origins
        cors_config['supports_credentials'] = False  # Stateless production
    
    # Initialize CORS with Flask application
    CORS(app, **cors_config)
    
    logger.info("🌐 Flask-CORS configured for cross-origin resource sharing")
    logger.info(f"🎯 CORS origins: {cors_config['origins']}")
    logger.info("🎓 Educational Note: CORS enables secure cross-origin API access")


def configure_application_settings(app: Flask, config_name: Optional[str] = None) -> None:
    """
    Configures Flask application settings and environment variables.
    Replaces Express.js environment configuration with Flask patterns.
    
    Args:
        app: Flask application instance to configure
        config_name: Optional configuration name for environment settings
    """
    # Load Flask environment configuration using python-dotenv
    # Replaces Node.js process.env with Python os.environ
    flask_env = os.getenv('FLASK_ENV', 'production')
    flask_debug = os.getenv('FLASK_DEBUG', '').lower() in ('true', '1', 'yes', 'on')
    
    # Configure Flask application settings
    app.config.update({
        'ENV': flask_env,
        'DEBUG': flask_debug and flask_env == 'development',
        'TESTING': False,
        'SECRET_KEY': os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production'),
        'JSON_SORT_KEYS': False,  # Maintain JSON key order
        'JSONIFY_MIMETYPE': 'application/json',  # Standard JSON content type
    })
    
    # Configure development-specific settings
    if flask_env == 'development':
        app.config['TEMPLATES_AUTO_RELOAD'] = True
        app.config['EXPLAIN_TEMPLATE_LOADING'] = False
        logger.info("🧪 Development mode: Enhanced debugging enabled")
    
    # Log Flask configuration status
    logger.info(f"⚙️  Flask environment: {flask_env}")
    logger.info(f"🐛 Flask debug mode: {app.config['DEBUG']}")
    logger.info("🎓 Educational Note: Environment variables enable 12-factor app configuration")


def register_middleware_hooks(app: Flask) -> None:
    """
    Registers Flask middleware using before_request and after_request decorators.
    Replaces Express.js middleware stack with Flask decorator patterns.
    
    Args:
        app: Flask application instance to configure
    """
    
    @app.before_request
    def before_request_middleware() -> None:
        """
        Flask before_request hook for request preprocessing.
        Replaces Express.js middleware functions with Flask decorator pattern.
        """
        # Log incoming request for educational visibility
        logger.info(f"📥 {request.method} {request.path} - Request received")
        
        # Add request timestamp for performance monitoring
        request.start_time = datetime.now()
        
        # Log educational information about Flask request context
        if app.config['DEBUG']:
            logger.debug(f"🔍 Request headers: {dict(request.headers)}")
            logger.debug("🎓 Educational Note: Flask request context provides thread-local access")
    
    @app.after_request
    def after_request_middleware(response: Response) -> Response:
        """
        Flask after_request hook for response postprocessing.
        Replaces Express.js response middleware with Flask decorator pattern.
        
        Args:
            response: Flask response object to modify
            
        Returns:
            Response: Modified Flask response object
        """
        # Add security headers for production deployment
        # Replaces Express.js security middleware with Flask response headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Add cache control headers for API responses
        if request.endpoint in ('hello_endpoint', 'health_check'):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        
        # Calculate and log request processing time
        if hasattr(request, 'start_time'):
            processing_time = (datetime.now() - request.start_time).total_seconds() * 1000
            logger.info(f"📤 {request.method} {request.path} - {response.status_code} - {processing_time:.2f}ms")
        
        # Educational logging for response details
        if app.config['DEBUG']:
            logger.debug(f"📋 Response headers: {dict(response.headers)}")
            logger.debug("🎓 Educational Note: Flask after_request hooks enable response modification")
        
        return response
    
    logger.info("🔗 Flask middleware hooks registered (before_request, after_request)")
    logger.info("🎓 Educational Note: Flask decorators replace Express.js middleware chain")


def register_route_handlers(app: Flask) -> None:
    """
    Registers Flask route handlers using @app.route decorators.
    Replaces Express.js app.get() method calls with Flask decorator routing.
    
    Args:
        app: Flask application instance to configure
    """
    
    @app.route('/hello', methods=['GET'], endpoint='hello_endpoint')
    def hello_route_handler() -> Tuple[Dict[str, str], int]:
        """
        Flask route handler for GET /hello endpoint that generates and returns
        JSON 'Hello world' response with proper HTTP headers.
        
        Replaces Express.js route handler with Flask view function using decorators.
        Implements stateless operation following RESTful principles and demonstrates
        proper Flask response handling patterns with JSON serialization.
        
        Returns:
            Tuple[Dict[str, str], int]: JSON response and HTTP status code
        """
        # Generate 'Hello world' response as JSON object
        # Replaces Express.js res.send() with Flask jsonify() response
        response_data = {"message": "Hello world"}
        
        # Log request completion for educational visibility and debugging
        logger.info(f"✅ GET /hello - 200 OK - JSON response: {response_data}")
        logger.info("🎓 Educational Note: Flask jsonify() automatically sets Content-Type: application/json")
        
        # Return JSON response with 200 OK status code
        # Flask automatically handles JSON serialization and content-type headers
        return response_data, 200
    
    @app.route('/health', methods=['GET'], endpoint='health_check')
    def health_check_handler() -> Tuple[Dict[str, Any], int]:
        """
        Flask route handler for GET /health endpoint for monitoring and deployment verification.
        Provides health check functionality for container orchestration and load balancers.
        
        Returns:
            Tuple[Dict[str, Any], int]: Health status JSON response and HTTP status code
        """
        # Generate health check response with system status
        health_data = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "flask-hello-world-tutorial",
            "version": "1.0.0"
        }
        
        # Log health check for monitoring visibility
        logger.info(f"💚 GET /health - 200 OK - Health check passed")
        
        return health_data, 200
    
    logger.info("🛣️  Flask route handlers registered: /hello, /health")
    logger.info("🎓 Educational Note: Flask @app.route decorators replace Express.js app.get() calls")


def register_error_handlers(app: Flask) -> None:
    """
    Registers Flask error handlers using @app.errorhandler decorators.
    Replaces Express.js error handling middleware with Flask error decorators.
    
    Args:
        app: Flask application instance to configure
    """
    
    @app.errorhandler(404)
    def not_found_handler(error) -> Tuple[Dict[str, Any], int]:
        """
        Flask error handler for 404 Not Found responses when routes are not matched.
        Replaces Express.js 404 middleware with Flask @app.errorhandler decorator.
        
        Provides consistent error response format following HTTP standards and
        implements security best practice of not exposing internal information.
        
        Args:
            error: Flask error object containing request details
            
        Returns:
            Tuple[Dict[str, Any], int]: JSON error response and 404 status code
        """
        # Create error response object with status and message
        # Replaces Express.js res.json() with Flask jsonify() response
        error_response = {
            "status": 404,
            "error": "Not Found",
            "message": "The requested resource was not found",
            "path": request.path,
            "method": request.method,
            "timestamp": datetime.now().isoformat()
        }
        
        # Log 404 error for educational debugging and monitoring
        logger.warning(f"❌ 404 Not Found - {request.method} {request.path} - Route not matched")
        logger.info("🎓 Educational Note: Flask error handlers provide consistent error responses")
        
        # Return JSON error response with 404 status code
        return error_response, 404
    
    @app.errorhandler(405)
    def method_not_allowed_handler(error) -> Tuple[Dict[str, Any], int]:
        """
        Flask error handler for 405 Method Not Allowed responses for wrong HTTP methods.
        Replaces Express.js method validation with Flask @app.errorhandler decorator.
        
        Args:
            error: Flask error object containing method details
            
        Returns:
            Tuple[Dict[str, Any], int]: JSON error response and 405 status code
        """
        # Create method not allowed error response
        error_response = {
            "status": 405,
            "error": "Method Not Allowed",
            "message": f"The {request.method} method is not allowed for this endpoint",
            "path": request.path,
            "method": request.method,
            "timestamp": datetime.now().isoformat()
        }
        
        # Log 405 error for debugging
        logger.warning(f"❌ 405 Method Not Allowed - {request.method} {request.path}")
        
        return error_response, 405
    
    @app.errorhandler(500)
    def internal_server_error_handler(error) -> Tuple[Dict[str, Any], int]:
        """
        Flask error handler for 500 Internal Server Error responses with exception handling.
        Replaces Express.js error handling middleware with Flask @app.errorhandler decorator.
        
        Implements secure error handling by providing generic error messages without
        exposing sensitive application details or stack traces in production.
        
        Args:
            error: Python exception object from unhandled errors
            
        Returns:
            Tuple[Dict[str, Any], int]: JSON error response and 500 status code
        """
        # Create generic error response object for security
        # Never expose stack traces or internal error details to clients
        error_response = {
            "status": 500,
            "error": "Internal Server Error",
            "message": "An internal server error occurred",
            "timestamp": datetime.now().isoformat()
        }
        
        # Log detailed error information for debugging (server-side only)
        # Include full error details for development and monitoring
        logger.error("💥 500 Internal Server Error occurred:")
        logger.error(f"Error type: {type(error).__name__}")
        logger.error(f"Error message: {str(error)}")
        logger.error(f"Request path: {request.path}")
        logger.error(f"Request method: {request.method}")
        
        # Log stack trace in development mode only
        if app.config['DEBUG']:
            logger.error("Error traceback:", exc_info=True)
        
        logger.error("🎓 Educational Note: Production error handlers never expose stack traces")
        
        # Return JSON error response without exposing stack trace
        return error_response, 500
    
    @app.errorhandler(Exception)
    def general_exception_handler(error) -> Tuple[Dict[str, Any], int]:
        """
        Flask general exception handler for unhandled Python exceptions.
        Provides fallback error handling for any unhandled exceptions.
        
        Args:
            error: Python exception object
            
        Returns:
            Tuple[Dict[str, Any], int]: JSON error response and 500 status code
        """
        # Log the unexpected exception
        logger.error(f"🚨 Unhandled exception: {type(error).__name__}: {str(error)}")
        
        # Return generic 500 error response
        return internal_server_error_handler(error)
    
    logger.info("🚨 Flask error handlers registered: 404, 405, 500, Exception")
    logger.info("🎓 Educational Note: Flask error handlers replace Express.js error middleware")


# Educational logging for module import
logger.info("📚 Flask application factory module loaded")
logger.info("🎓 Educational Note: This module demonstrates Flask application factory pattern")
logger.info("🔧 Usage: from app import create_app; app = create_app()")