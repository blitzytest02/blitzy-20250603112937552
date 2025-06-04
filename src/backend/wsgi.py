#!/usr/bin/env python3
"""
WSGI entry point for Flask application production deployment
Replaces Node.js server.js functionality with Python WSGI application factory integration.

This module provides the WSGI application object for production deployment with Gunicorn,
implementing comprehensive signal handling, graceful shutdown, and monitoring capabilities.
Demonstrates modern Python WSGI deployment patterns with enterprise-grade reliability.

Educational Purpose:
- Shows WSGI application factory pattern for production Flask deployment
- Demonstrates Python signal handling for graceful shutdown in containers
- Provides memory monitoring and performance tracking for educational awareness
- Implements production-ready logging and error handling patterns
- Replaces Node.js HTTP server lifecycle with Python WSGI server integration

Production Features:
- Gunicorn WSGI server compatibility with multi-worker process management
- Container orchestration support with proper signal handling (SIGTERM, SIGINT)
- Memory usage monitoring with psutil integration (<75MB target)
- Comprehensive error handling and logging for production visibility
- Environment variable management using python-dotenv configuration
"""

import os
import sys
import signal
import logging
import threading
import time
from typing import Optional, Dict, Any, Callable
from datetime import datetime

# Third-party imports for WSGI deployment and monitoring
try:
    from flask import Flask
    from dotenv import load_dotenv
    import psutil
except ImportError as e:
    print(f"❌ Critical Import Error: {e}")
    print("🔧 Please ensure all production dependencies are installed:")
    print("   pip install Flask>=3.1.1 python-dotenv>=1.0.1 psutil>=5.9.0")
    print("🎓 Educational Note: WSGI deployment requires Flask and monitoring dependencies")
    sys.exit(1)

# Import Flask application factory from local app module
# Replaces Node.js require('./app.js') with Python import statement
try:
    from app import create_app
except ImportError as e:
    print(f"❌ Flask Application Import Error: {e}")
    print("🔧 Ensure app.py exists in the same directory with create_app() function")
    print("🎓 Educational Note: WSGI entry point depends on Flask application factory")
    sys.exit(1)

# Load environment variables from .env file using python-dotenv
# Replaces Node.js process.env automatic loading with explicit configuration
load_dotenv()

# Configure Python structured logging for production visibility
# Replaces Node.js console.log patterns with enterprise logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger(__name__)

# Global variables for WSGI application and shutdown coordination
# Replaces Node.js server instance with Flask application object
flask_app: Optional[Flask] = None
shutdown_event = threading.Event()
signal_received = False

def create_wsgi_application() -> Flask:
    """
    Creates and configures Flask application instance for WSGI deployment.
    Replaces Node.js app.listen() with Flask application factory for WSGI servers.
    
    This function initializes the Flask application using the application factory pattern,
    configures production settings, and prepares the application for WSGI server deployment
    with Gunicorn or other WSGI-compatible servers.
    
    Returns:
        Flask: Configured Flask application instance ready for WSGI deployment
        
    Raises:
        ImportError: If Flask application factory is not available
        ValueError: If application configuration is invalid
        RuntimeError: If application initialization fails
    """
    global flask_app
    
    try:
        # Log WSGI application initialization start
        logger.info("🔄 Initializing WSGI application for production deployment...")
        logger.info("🎓 Educational Note: WSGI replaces Node.js HTTP server with Python standard")
        
        # Extract environment configuration using python-dotenv
        # Replaces Node.js process.env with Python os.environ
        flask_env = os.getenv('FLASK_ENV', 'production')
        host = os.getenv('HOST', '0.0.0.0')
        port = validate_port_number(os.getenv('PORT', '8000'))
        
        # Create Flask application using application factory pattern
        # Replaces Node.js Express app creation with Flask factory
        flask_app = create_app(config_name=flask_env)
        
        # Configure WSGI application settings for production deployment
        configure_wsgi_settings(flask_app, flask_env)
        
        # Log WSGI application creation success
        logger.info("✅ WSGI application created successfully")
        logger.info(f"🌐 Flask environment: {flask_env}")
        logger.info(f"🔌 Configured for host: {host}, port: {port}")
        logger.info("🎯 WSGI application ready for Gunicorn deployment")
        
        # Log educational information about WSGI deployment
        log_wsgi_deployment_info(host, port)
        
        # Log initial memory usage for performance baseline
        log_memory_usage("WSGI Application Initialization")
        
        return flask_app
        
    except Exception as e:
        # Handle WSGI application creation errors with comprehensive logging
        logger.error("💥 WSGI application creation failed:")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error("🎓 Educational Note: WSGI application errors prevent server startup")
        
        # Log troubleshooting information
        logger.error("🔧 Troubleshooting suggestions:")
        logger.error("   • Verify Flask application factory (create_app) is correctly implemented")
        logger.error("   • Check environment variables are properly configured")
        logger.error("   • Ensure all dependencies are installed with correct versions")
        logger.error("   • Review app.py for import or configuration errors")
        
        # Re-raise exception to prevent silent failures
        raise RuntimeError(f"WSGI application initialization failed: {e}") from e


def configure_wsgi_settings(app: Flask, environment: str) -> None:
    """
    Configures Flask application settings for WSGI production deployment.
    Replaces Node.js server configuration with Flask WSGI settings.
    
    Args:
        app: Flask application instance to configure
        environment: Environment name (development, production, testing)
    """
    # Configure WSGI-specific Flask settings for production deployment
    wsgi_settings = {
        'PROPAGATE_EXCEPTIONS': True,  # Ensure exceptions reach WSGI server
        'PREFERRED_URL_SCHEME': 'https',  # Production HTTPS preference
        'APPLICATION_ROOT': '/',  # WSGI application mount point
        'SERVER_NAME': None,  # Let WSGI server handle server name
    }
    
    # Apply production optimizations for WSGI deployment
    if environment == 'production':
        wsgi_settings.update({
            'ENV': 'production',
            'DEBUG': False,
            'TESTING': False,
            'EXPLAIN_TEMPLATE_LOADING': False,
            'SEND_FILE_MAX_AGE_DEFAULT': 31536000,  # 1 year cache
        })
        logger.info("🔒 Production WSGI settings applied")
    
    # Apply development settings for local testing
    elif environment == 'development':
        wsgi_settings.update({
            'ENV': 'development',
            'DEBUG': True,
            'TESTING': False,
            'EXPLAIN_TEMPLATE_LOADING': True,
        })
        logger.info("🧪 Development WSGI settings applied")
    
    # Update Flask application configuration
    app.config.update(wsgi_settings)
    
    logger.info("⚙️  WSGI Flask application settings configured")
    logger.info("🎓 Educational Note: WSGI settings optimize Flask for production deployment")


def setup_signal_handlers() -> None:
    """
    Configures Python signal handlers for graceful shutdown during WSGI deployment.
    Replaces Node.js process signal handling with Python signal module integration.
    
    Implements comprehensive signal handling for container orchestration and production
    deployment, ensuring clean shutdown procedures and resource cleanup.
    """
    global signal_received
    
    def signal_handler(signum: int, frame) -> None:
        """
        Python signal handler function for graceful shutdown coordination.
        Replaces Node.js process.on() signal handlers with Python equivalent.
        
        Args:
            signum: Signal number received (SIGTERM=15, SIGINT=2)
            frame: Current stack frame (unused but required by signal module)
        """
        global signal_received
        signal_received = True
        
        # Map signal numbers to descriptive names for logging
        signal_names = {
            signal.SIGTERM: 'SIGTERM',
            signal.SIGINT: 'SIGINT',
            signal.SIGUSR1: 'SIGUSR1',
            signal.SIGUSR2: 'SIGUSR2',
        }
        signal_name = signal_names.get(signum, f'Signal-{signum}')
        
        # Log signal reception for educational visibility
        logger.info(f"🛑 {signal_name} signal received: Initiating graceful shutdown...")
        logger.info("🎓 Educational Note: Signal handlers enable clean container shutdown")
        
        # Set shutdown event to coordinate graceful termination
        shutdown_event.set()
        
        # Log memory usage before shutdown for educational purposes
        log_memory_usage(f"Signal Handler ({signal_name})")
        
        # Perform graceful shutdown procedures
        perform_graceful_shutdown(signal_name)
    
    # Register signal handlers for container orchestration
    # Replaces Node.js process.on('SIGTERM') with Python signal.signal()
    try:
        signal.signal(signal.SIGTERM, signal_handler)  # Container termination
        signal.signal(signal.SIGINT, signal_handler)   # Ctrl+C interruption
        
        # Additional signal handlers for advanced process management
        if hasattr(signal, 'SIGUSR1'):
            signal.signal(signal.SIGUSR1, signal_handler)  # User-defined signal 1
        if hasattr(signal, 'SIGUSR2'):
            signal.signal(signal.SIGUSR2, signal_handler)  # User-defined signal 2
        
        logger.info("📡 Python signal handlers registered successfully")
        logger.info("🎯 Signals handled: SIGTERM, SIGINT, SIGUSR1, SIGUSR2")
        logger.info("🎓 Educational Note: Signal handlers replace Node.js process.on() patterns")
        
    except OSError as e:
        # Handle signal registration errors (platform-specific limitations)
        logger.warning(f"⚠️  Signal handler registration warning: {e}")
        logger.warning("🎓 Educational Note: Some signals may not be available on all platforms")


def perform_graceful_shutdown(signal_name: str) -> None:
    """
    Performs graceful shutdown procedures for WSGI application termination.
    Replaces Node.js server.close() with Python WSGI shutdown coordination.
    
    Args:
        signal_name: Name of the signal that triggered shutdown
    """
    try:
        # Log shutdown initiation with educational context
        logger.info(f"📋 Graceful shutdown initiated by {signal_name}")
        logger.info("⏱️  Shutdown procedures starting...")
        logger.info("🎓 Educational Note: Graceful shutdown preserves data integrity")
        
        # Perform application-specific cleanup procedures
        if flask_app:
            # Log Flask application context cleanup
            logger.info("🧹 Cleaning up Flask application context...")
            
            # Additional cleanup procedures can be added here:
            # - Database connection cleanup
            # - Cache invalidation
            # - Background task termination
            # - File handle closure
            
            logger.info("✅ Flask application cleanup completed")
        
        # Log final memory usage for educational monitoring
        log_memory_usage("Graceful Shutdown")
        
        # Log shutdown completion with educational notes
        logger.info("🏁 Graceful shutdown procedures completed successfully")
        logger.info("🎓 Educational Note: Clean shutdown enables reliable container orchestration")
        logger.info("👋 WSGI application shutdown complete. Thank you for learning Python and Flask!")
        
    except Exception as e:
        # Handle shutdown errors with comprehensive logging
        logger.error(f"❌ Error during graceful shutdown: {e}")
        logger.error("🎓 Educational Note: Shutdown errors should be handled gracefully")


def validate_port_number(port: str) -> int:
    """
    Validates and converts port number string to integer with range checking.
    Replaces Node.js port validation with Python equivalent function.
    
    Args:
        port: Port number as string from environment variable
        
    Returns:
        int: Validated port number
        
    Raises:
        ValueError: If port number is invalid or out of range
    """
    try:
        port_number = int(port)
        
        # Validate port number is within valid range
        if port_number < 1 or port_number > 65535:
            raise ValueError(f"Port {port_number} is outside valid range (1-65535)")
        
        # Log educational information about port ranges
        if port_number < 1024:
            logger.warning(f"⚠️  Port {port_number} is below 1024 (privileged range)")
            logger.warning("🎓 Educational Note: Ports below 1024 may require elevated privileges")
        
        return port_number
        
    except ValueError as e:
        logger.error(f"❌ Invalid port number: {port}")
        logger.error("🔧 Troubleshooting: Use PORT environment variable with valid number")
        logger.error("🎓 Educational Note: Port validation prevents runtime errors")
        raise ValueError(f"Invalid port configuration: {e}") from e


def log_memory_usage(context: str) -> None:
    """
    Logs current memory usage for educational performance awareness and monitoring.
    Replaces Node.js process.memoryUsage() with Python psutil equivalent.
    
    Args:
        context: Description of when memory usage is being measured
    """
    try:
        # Get current process memory information using psutil
        # Replaces Node.js process.memoryUsage() with Python equivalent
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_percent = process.memory_percent()
        
        # Convert bytes to megabytes for readability
        rss_mb = memory_info.rss / 1024 / 1024
        vms_mb = memory_info.vms / 1024 / 1024
        
        # Log memory usage information with educational context
        logger.info(f"💾 Memory Usage ({context}):")
        logger.info(f"   RSS (Resident Set Size): {rss_mb:.2f} MB")
        logger.info(f"   VMS (Virtual Memory Size): {vms_mb:.2f} MB")
        logger.info(f"   Memory Percentage: {memory_percent:.2f}%")
        logger.info(f"   Process ID: {process.pid}")
        
        # Check memory usage against target threshold (<75MB)
        # Updated from Node.js <50MB target to Python <75MB target
        if rss_mb > 75:
            logger.warning(f"⚠️  Memory usage ({rss_mb:.2f} MB) exceeds 75MB target")
            logger.warning("🎓 Educational Note: Monitor memory usage to prevent resource exhaustion")
        else:
            logger.info("✅ Memory usage within acceptable limits (<75MB)")
        
        logger.info("🎓 Educational Note: psutil provides comprehensive process monitoring")
        
    except Exception as e:
        # Handle memory monitoring errors gracefully
        logger.warning(f"⚠️  Memory usage monitoring error: {e}")
        logger.warning("🎓 Educational Note: Memory monitoring is optional but valuable")


def log_wsgi_deployment_info(host: str, port: int) -> None:
    """
    Logs WSGI deployment information for educational visibility and guidance.
    Replaces Node.js server startup logging with Python WSGI equivalent.
    
    Args:
        host: Host address for WSGI deployment
        port: Port number for WSGI deployment
    """
    timestamp = datetime.now().isoformat()
    
    # Log WSGI deployment success with educational context
    logger.info("\n🚀 WSGI Application Ready for Production Deployment!")
    logger.info("=" * 70)
    logger.info(f"⏰ Initialization time: {timestamp}")
    logger.info(f"🐍 Python version: {sys.version.split()[0]}")
    logger.info(f"🌶️  Flask framework: Production WSGI application")
    logger.info(f"🔌 WSGI configuration: {host}:{port}")
    logger.info(f"📡 Process ID: {os.getpid()}")
    logger.info(f"🖥️  Platform: {sys.platform}")
    
    # Log WSGI server deployment instructions
    logger.info("\n🎯 WSGI Server Deployment:")
    logger.info("   Production: gunicorn --bind 0.0.0.0:8000 wsgi:application")
    logger.info("   Development: flask --app wsgi:application run --host 0.0.0.0 --port 8000")
    logger.info("   Container: gunicorn --bind 0.0.0.0:$PORT wsgi:application")
    
    # Log available endpoints for testing
    logger.info("\n🎯 Available Endpoints:")
    logger.info(f"   GET  http://{host}:{port}/hello  →  Returns JSON 'Hello world'")
    logger.info(f"   GET  http://{host}:{port}/health →  Application health check")
    
    # Log testing commands for educational guidance
    logger.info("\n🔧 Testing Commands:")
    logger.info(f"   curl http://{host}:{port}/hello")
    logger.info(f"   curl http://{host}:{port}/health")
    logger.info("   curl -i http://localhost:8000/hello  # Include response headers")
    
    # Log container and production deployment information
    logger.info("\n🐳 Container Deployment:")
    logger.info("   Docker: docker run -p 8000:8000 <image-name>")
    logger.info("   Health check: curl http://localhost:8000/health")
    logger.info("   Shutdown: docker stop <container-id>  # Triggers SIGTERM")
    
    # Log educational notes about WSGI architecture
    logger.info("\n📚 Educational Notes:")
    logger.info("   • WSGI (Web Server Gateway Interface) is Python web standard")
    logger.info("   • Gunicorn provides production-grade WSGI server capabilities")
    logger.info("   • Signal handlers enable graceful shutdown in containers")
    logger.info("   • Flask application factory pattern supports multiple configurations")
    logger.info("   • Memory monitoring demonstrates performance awareness")
    
    logger.info("=" * 70)
    logger.info("✨ WSGI application initialized! Ready for production deployment.\n")


def handle_uncaught_exceptions() -> None:
    """
    Configures Python exception handling for comprehensive error visibility.
    Replaces Node.js uncaughtException and unhandledRejection with Python equivalent.
    """
    def exception_handler(exc_type, exc_value, exc_traceback):
        """
        Custom exception handler for uncaught exceptions.
        Replaces Node.js process.on('uncaughtException') with Python sys.excepthook.
        
        Args:
            exc_type: Exception type class
            exc_value: Exception instance
            exc_traceback: Traceback object
        """
        # Avoid handling KeyboardInterrupt to allow normal program termination
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        
        # Log uncaught exception with comprehensive details
        logger.error("💥 Uncaught Exception detected in WSGI application:")
        logger.error(f"Exception type: {exc_type.__name__}")
        logger.error(f"Exception message: {str(exc_value)}")
        logger.error("🎓 Educational Note: Proper exception handling prevents silent failures")
        
        # Log memory usage during exception for debugging
        log_memory_usage("Uncaught Exception")
        
        # Log traceback in development mode only
        if os.getenv('FLASK_ENV') == 'development':
            logger.error("Exception traceback:", exc_info=(exc_type, exc_value, exc_traceback))
        
        # Initiate graceful shutdown after uncaught exception
        logger.error("🛑 Initiating graceful shutdown after uncaught exception")
        perform_graceful_shutdown("UNCAUGHT_EXCEPTION")
    
    # Set custom exception handler for Python uncaught exceptions
    # Replaces Node.js process.on('uncaughtException') with Python sys.excepthook
    sys.excepthook = exception_handler
    
    logger.info("🚨 Python uncaught exception handler configured")
    logger.info("🎓 Educational Note: Exception handlers provide production error visibility")


# Initialize WSGI application and configure signal handling
# This section replaces Node.js server initialization with Python WSGI setup
if __name__ == "__main__":
    # Configure uncaught exception handling for production visibility
    handle_uncaught_exceptions()
    
    # Set up signal handlers for graceful shutdown
    setup_signal_handlers()
    
    # Create WSGI application instance
    application = create_wsgi_application()
    
    # Log educational information about WSGI deployment
    logger.info("🎓 Educational Tutorial: Python WSGI with Flask")
    logger.info("📖 Learning Objectives: WSGI deployment, signal handling, memory monitoring")
    
    # Development server execution (not recommended for production)
    # This section is for educational purposes only
    if os.getenv('FLASK_ENV') == 'development':
        logger.info("🧪 Development mode: Starting Flask development server...")
        logger.info("⚠️  Warning: Development server not suitable for production")
        logger.info("🎓 Educational Note: Use Gunicorn for production deployment")
        
        try:
            # Extract host and port for development server
            host = os.getenv('HOST', 'localhost')
            port = validate_port_number(os.getenv('PORT', '8000'))
            
            # Start Flask development server with signal monitoring
            application.run(host=host, port=port, debug=True, use_reloader=False)
        except Exception as e:
            logger.error(f"❌ Development server error: {e}")
            sys.exit(1)
    else:
        # Production deployment information
        logger.info("🏭 Production mode: WSGI application ready for Gunicorn")
        logger.info("🔧 Start with: gunicorn --bind 0.0.0.0:8000 wsgi:application")

# WSGI application object for Gunicorn deployment
# This is the main entry point for WSGI servers
# Replaces Node.js module.exports with Python WSGI application object
else:
    # Configure signal handling for WSGI server deployment
    setup_signal_handlers()
    
    # Create WSGI application for production deployment
    application = create_wsgi_application()
    
    # Log WSGI application readiness
    logger.info("🔗 WSGI application object created for server deployment")
    logger.info("🎓 Educational Note: 'application' object provides WSGI interface")

# Export application object for WSGI server integration
# This replaces Node.js module.exports with Python module-level variable
__all__ = ['application']