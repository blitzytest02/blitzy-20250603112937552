#!/usr/bin/env python3
"""
WSGI entry point for production Flask deployment
Replaces Node.js server.js functionality with Python signal handlers for graceful shutdown.

This module provides the WSGI application object for Gunicorn server integration and 
implements comprehensive production deployment patterns including signal handling,
graceful shutdown, memory monitoring, and educational logging.

Educational Purpose:
- Demonstrates Flask application factory integration with WSGI servers
- Shows Python signal handling for containerized deployments
- Provides production-ready patterns for Flask applications
- Replaces Node.js HTTP server patterns with Python equivalents
"""

import os
import sys
import signal
import logging
import threading
import time
from typing import Optional, Any

# Third-party imports for Flask application and environment management
try:
    from dotenv import load_dotenv
    import psutil
    from app import create_app
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("🔧 Please ensure all dependencies are installed:")
    print("   pip install Flask>=3.1.1 python-dotenv>=1.0.1 psutil>=5.9.0")
    print("🎓 Educational Note: Dependencies are required for WSGI deployment")
    sys.exit(1)

# Global variables for WSGI server lifecycle management
application: Optional[Any] = None
shutdown_event = threading.Event()
startup_time: float = time.time()

# Load environment variables from .env file using python-dotenv
# Replaces Node.js process.env with Python equivalent
load_dotenv()

# Global configuration with environment variable support and secure defaults
# Mirrors Node.js PORT and HOST configuration patterns
PORT = int(os.getenv('PORT', 3000))
HOST = os.getenv('HOST', 'localhost')
FLASK_ENV = os.getenv('FLASK_ENV', 'production')
FLASK_DEBUG = os.getenv('FLASK_DEBUG', '').lower() in ('true', '1', 'yes', 'on')

# Configure Python logging for educational visibility
# Replaces Node.js console.log patterns with structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)


def validate_port_number(port: int) -> int:
    """
    Validates port number is within valid range and returns validated integer.
    Replaces Node.js validatePortNumber function with Python implementation.
    
    Args:
        port: Port number to validate
        
    Returns:
        Validated port number
        
    Raises:
        ValueError: If port number is invalid
    """
    if not isinstance(port, int) or port < 1 or port > 65535:
        raise ValueError(f"Invalid port number: {port}. Port must be between 1-65535.")
    
    if port < 1024:
        logger.warning(f"⚠️  Port {port} is below 1024 (requires elevated privileges)")
        logger.warning("🎓 Educational Note: Ports below 1024 require administrator privileges")
    
    return port


def validate_host_address(host: str) -> str:
    """
    Validates host address format and returns sanitized host string.
    Replaces Node.js validateHostAddress function with Python implementation.
    
    Args:
        host: Host address to validate
        
    Returns:
        Validated host address
        
    Raises:
        ValueError: If host address is invalid
    """
    if not isinstance(host, str) or not host.strip():
        raise ValueError(f"Invalid host address: {host}. Host must be a non-empty string.")
    
    sanitized_host = host.strip()
    
    # Log educational information about host binding
    if sanitized_host == '0.0.0.0':
        logger.info("🌐 Educational Note: Binding to 0.0.0.0 makes server accessible from any network interface")
    elif sanitized_host in ('localhost', '127.0.0.1'):
        logger.info("🏠 Educational Note: Binding to localhost/127.0.0.1 restricts access to local machine only")
    
    return sanitized_host


def log_memory_usage() -> None:
    """
    Logs current memory usage for educational resource awareness.
    Replaces Node.js process.memoryUsage() with Python psutil monitoring.
    """
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_percent = process.memory_percent()
        
        logger.info("\n💾 Memory Usage Status:")
        logger.info(f"   RSS Memory: {memory_info.rss / 1024 / 1024:.2f} MB")
        logger.info(f"   VMS Memory: {memory_info.vms / 1024 / 1024:.2f} MB")
        logger.info(f"   Memory Percent: {memory_percent:.2f}%")
        logger.info("🎓 Educational Note: Monitor memory usage to prevent leaks in production applications")
    except Exception as e:
        logger.warning(f"⚠️  Could not retrieve memory usage: {e}")


def log_server_status(port: int, host: str) -> None:
    """
    Logs server status information for educational transparency and user guidance.
    Replaces Node.js logServerStatus function with Python implementation.
    
    Args:
        port: Port number the server is listening on
        host: Host address the server is bound to
    """
    from datetime import datetime
    import platform
    
    timestamp = datetime.now().isoformat()
    
    logger.info("\n🚀 WSGI Application Successfully Initialized!")
    logger.info("=" * 60)
    logger.info(f"⏰ Startup time: {timestamp}")
    logger.info(f"🌐 Application available at: http://{host}:{port}")
    logger.info(f"📡 Host: {host}")
    logger.info(f"🔌 Port: {port}")
    
    # Include Python and Flask version information
    logger.info("\n📋 Runtime Information:")
    logger.info(f"   Python version: {sys.version}")
    logger.info(f"   Flask environment: {FLASK_ENV}")
    logger.info(f"   Flask debug mode: {FLASK_DEBUG}")
    logger.info(f"   Process ID: {os.getpid()}")
    logger.info(f"   Platform: {platform.system()} {platform.release()}")
    logger.info(f"   Architecture: {platform.machine()}")
    
    # Log educational instructions for accessing /hello endpoint
    logger.info("\n🎯 Available Endpoints:")
    logger.info(f"   GET  http://{host}:{port}/hello  →  Returns 'Hello world'")
    logger.info(f"   GET  http://{host}:{port}/health →  Health check endpoint")
    
    # Log curl command examples for testing
    logger.info("\n🔧 Testing Commands:")
    logger.info(f"   curl http://{host}:{port}/hello")
    logger.info(f"   curl -i http://{host}:{port}/hello  # Include response headers")
    logger.info(f"   curl http://{host}:{port}/health   # Health check")
    
    # Log browser URL for direct access
    logger.info("\n🌐 Browser Access:")
    logger.info(f"   Open: http://{host}:{port}/hello")
    
    # Educational notes about WSGI architecture
    logger.info("\n📚 Educational Notes:")
    logger.info("   • This WSGI application integrates with Gunicorn for production deployment")
    logger.info("   • Flask application factory pattern enables configuration flexibility")
    logger.info("   • Python signal handlers ensure graceful shutdown in containers")
    logger.info("   • Environment variables provide 12-factor app configuration")
    logger.info("   • WSGI standard enables compatibility with multiple Python web servers")
    
    logger.info("=" * 60)
    logger.info("✨ Happy learning! WSGI application is ready for deployment.\n")


def setup_signal_handlers() -> None:
    """
    Configures graceful shutdown handlers for SIGTERM and SIGINT signals.
    Replaces Node.js signal handling with Python signal module implementation.
    
    Essential for container orchestration and production deployment where
    graceful shutdown is required for proper resource cleanup.
    """
    def signal_handler(signum: int, frame) -> None:
        """Handle shutdown signals gracefully."""
        signal_name = signal.Signals(signum).name
        logger.info(f"\n🛑 {signal_name} signal received: Starting graceful shutdown process...")
        perform_graceful_shutdown(signal_name)
    
    # Register SIGTERM signal handler for graceful shutdown (Docker, Kubernetes)
    signal.signal(signal.SIGTERM, signal_handler)
    logger.info("✅ SIGTERM signal handler registered for graceful shutdown")
    
    # Register SIGINT signal handler for Ctrl+C termination (development)
    signal.signal(signal.SIGINT, signal_handler)
    logger.info("✅ SIGINT signal handler registered for graceful shutdown")
    
    logger.info("🎓 Educational Note: Signal handlers enable graceful shutdown in containerized environments")


def perform_graceful_shutdown(signal_name: str) -> None:
    """
    Performs graceful shutdown process with timeout management.
    Replaces Node.js performGracefulShutdown function with Python implementation.
    
    Args:
        signal_name: Name of the signal that triggered shutdown
    """
    logger.info(f"📋 Graceful shutdown initiated by {signal_name}")
    logger.info("⏱️  Shutdown timeout: 10 seconds maximum")
    
    # Set shutdown event to signal other components
    shutdown_event.set()
    
    # Log final memory usage for educational comparison
    log_memory_usage()
    
    # Calculate uptime for educational metrics
    uptime = time.time() - startup_time
    logger.info(f"⏱️  Application uptime: {uptime:.2f} seconds")
    
    # Log shutdown completion message
    logger.info("✅ WSGI application shutdown initiated")
    logger.info("🧹 Cleanup completed gracefully")
    logger.info("📚 Educational Note: Graceful shutdown preserves data integrity")
    
    # Provide final educational message
    logger.info("👋 WSGI application shutdown complete. Thank you for learning Flask and Python!")
    
    # Exit process with code 0 for successful termination
    sys.exit(0)


def handle_startup_error(error: Exception) -> None:
    """
    Error handler for application startup failures.
    Replaces Node.js handleServerError function with Python implementation.
    
    Args:
        error: Exception object containing startup failure information
    """
    logger.error("\n💥 WSGI Application Startup Error:")
    logger.error("=" * 50)
    
    # Check for specific error types
    if isinstance(error, ImportError):
        logger.error(f"❌ Import Error: {error}")
        logger.error("🔧 Troubleshooting suggestions:")
        logger.error("   • Install missing dependencies: pip install -r requirements.txt")
        logger.error("   • Verify virtual environment is activated")
        logger.error("   • Check Python path configuration")
        logger.error("🎓 Educational Note: ImportError indicates missing Python packages")
    elif isinstance(error, ValueError):
        logger.error(f"❌ Configuration Error: {error}")
        logger.error("🔧 Troubleshooting suggestions:")
        logger.error("   • Check environment variable values")
        logger.error("   • Verify .env file configuration")
        logger.error("   • Validate PORT and HOST settings")
        logger.error("🎓 Educational Note: Configuration errors prevent proper application startup")
    else:
        logger.error(f"❌ Application startup error: {error}")
        logger.error("🔧 General troubleshooting suggestions:")
        logger.error("   • Verify Python 3.12+ is installed")
        logger.error("   • Ensure Flask>=3.1.1 is installed")
        logger.error("   • Check application factory function")
        logger.error("   • Review Flask configuration")
    
    # Log full error details for debugging
    logger.error("\n🐛 Detailed Error Information:")
    logger.error(f"Error type: {type(error).__name__}")
    logger.error(f"Error message: {str(error)}")
    logger.error("Error traceback:", exc_info=True)
    
    # Provide educational context
    logger.error("\n📚 Educational Context:")
    logger.error("• This error occurred during WSGI application initialization")
    logger.error("• Proper error handling prevents silent failures")
    logger.error("• Always validate configuration before starting applications")
    logger.error("• Use environment variables for flexible deployment")
    
    # Exit process with error code 1
    logger.error("\n🚪 Exiting process with error code 1")
    logger.error("=" * 50)
    sys.exit(1)


def create_wsgi_application() -> Any:
    """
    Creates and configures Flask application instance for WSGI deployment.
    Replaces Node.js createExpressApp and server.listen() patterns.
    
    Returns:
        Flask application instance configured for WSGI server integration
    """
    try:
        # Validate configuration before creating application
        validated_port = validate_port_number(PORT)
        validated_host = validate_host_address(HOST)
        
        logger.info("🎓 Educational Tutorial: Flask WSGI Application with Python")
        logger.info("📖 Learning Objectives: WSGI deployment, signal handling, graceful shutdown")
        
        # Log initial memory usage for educational baseline
        log_memory_usage()
        
        # Setup signal handlers for graceful shutdown
        setup_signal_handlers()
        
        logger.info("\n🔄 Initializing Flask application...")
        
        # Create Flask application using application factory pattern
        # This imports from app.py which should contain create_app() function
        app = create_app()
        
        # Configure Flask application for WSGI deployment
        app.config.update({
            'ENV': FLASK_ENV,
            'DEBUG': FLASK_DEBUG,
            'HOST': validated_host,
            'PORT': validated_port,
        })
        
        # Log server status information for educational transparency
        log_server_status(validated_port, validated_host)
        
        # Log memory usage after application initialization
        log_memory_usage()
        
        logger.info("🎯 WSGI application ready for Gunicorn deployment")
        logger.info("🚀 Use: gunicorn wsgi:application --bind 0.0.0.0:3000")
        
        return app
        
    except Exception as error:
        handle_startup_error(error)


# Create WSGI application instance for production deployment
# This is the entry point that Gunicorn will import and serve
try:
    logger.info("🔄 Creating WSGI application instance...")
    application = create_wsgi_application()
    logger.info("✅ WSGI application instance created successfully")
except Exception as e:
    logger.error(f"💥 Failed to create WSGI application: {e}")
    handle_startup_error(e)


# Development server execution for local testing
# This section runs only when the file is executed directly (not imported by Gunicorn)
if __name__ == '__main__':
    logger.info("\n🧪 Development Mode: Running Flask development server")
    logger.info("🎓 Educational Note: Use Gunicorn for production deployment")
    logger.info("⚠️  Development server is not suitable for production use")
    
    try:
        if application is None:
            raise RuntimeError("WSGI application was not created successfully")
        
        # Run Flask development server for local testing
        # This mimics Node.js server.listen() behavior for development
        application.run(
            host=HOST,
            port=PORT,
            debug=FLASK_DEBUG,
            use_reloader=False,  # Disable reloader to prevent signal handler conflicts
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("\n🛑 KeyboardInterrupt received (Ctrl+C)")
        perform_graceful_shutdown("SIGINT")
    except Exception as e:
        logger.error(f"💥 Development server error: {e}")
        handle_startup_error(e)