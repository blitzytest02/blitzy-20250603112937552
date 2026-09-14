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

Two Ways This Module Is Loaded:
- Executed directly (``python wsgi.py``): this module owns the process.  It binds a
  real listening socket, serves requests, and on SIGTERM/SIGINT stops the server,
  releases the socket and exits with status 0.
- Imported by a WSGI server (``gunicorn wsgi:application``): the hosting server owns
  the process and its own signal handling.  This module only exposes ``application``
  and hands any signal it observes back to the handler the host installed.
"""

import os
import sys
import errno
import signal
import socket
import logging
import threading
import time
from typing import Optional, Dict, Any
from datetime import datetime

# Third-party imports for WSGI deployment and monitoring
try:
    from flask import Flask
    from dotenv import load_dotenv
    import psutil

    # Werkzeug is installed with Flask and provides the WSGI server used when this
    # module is executed directly.  make_server() returns the server object itself —
    # which Flask's app.run() does not — and that object is what makes a
    # deterministic, testable graceful shutdown possible (see run_http_server and
    # stop_http_server below).  select_address_family/get_sockaddr are reused so the
    # socket this module binds uses exactly the address family make_server expects.
    from werkzeug.serving import (
        BaseWSGIServer,
        get_sockaddr,
        make_server,
        select_address_family,
    )
except ImportError as e:
    print(f"❌ Critical Import Error: {e}")
    print("🔧 Please ensure all production dependencies are installed:")
    print("   pip install Flask>=3.1.1 python-dotenv>=1.0.1 psutil>=5.9.0")
    print("🎓 Educational Note: WSGI deployment requires Flask and monitoring dependencies")
    sys.exit(1)

# Import Flask application factory from local app module
# Replaces Node.js require('./app.js') with Python import statement
#
# This module is loaded three different ways — `python wsgi.py` and
# `gunicorn wsgi:application` from this directory, and `import src.backend.wsgi`
# from the repository root (pytest, or `gunicorn src.backend.wsgi:application`) —
# and only the first two put this directory on sys.path automatically.  Appending
# it here makes `app` resolve in all three cases.  It is appended rather than
# inserted so it cannot shadow an installed distribution of the same name.
MODULE_DIRECTORY = os.path.dirname(os.path.abspath(__file__))
if MODULE_DIRECTORY not in sys.path:
    sys.path.append(MODULE_DIRECTORY)

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

# The HTTP server this module runs when it is executed directly.  It stays None when
# a WSGI server such as Gunicorn imported the module, because the socket then belongs
# to that server.  Replaces the Node.js `server` variable held by server.js.
http_server: Optional[BaseWSGIServer] = None

# True only when this module is the process entry point (`python wsgi.py`).  It is the
# difference between "shut down and exit" and "shut down and let the hosting WSGI
# server decide when the process ends", and it is set by the __main__ block below.
owns_process_lifecycle = False

# Signal dispositions captured before this module installed its own handlers, so a
# host's handler (Gunicorn's, for instance) can still run after ours.  Replacing a
# host's SIGTERM handler without delegating makes its workers ignore a graceful stop.
previous_signal_handlers: Dict[int, Any] = {}

# Watchdog that force-exits if a cooperative shutdown cannot finish.  Guarantees a
# received signal is never merely logged and then ignored.
forced_exit_timer: Optional[threading.Timer] = None

# Bind retry policy.  A port inside the kernel's ephemeral range can be held for an
# instant by an unrelated outbound connection, which makes a bind fail even though
# the port is unused a moment later; werkzeug treats any bind error as fatal, so the
# retry lives here.  Three attempts spaced half a second apart cost at most one
# second before a genuine conflict is reported.
BIND_RETRY_ATTEMPTS = 3
BIND_RETRY_DELAY_SECONDS = 0.5

# How long the graceful shutdown path is given before termination is forced.
GRACEFUL_SHUTDOWN_TIMEOUT_SECONDS = 10.0

# Fallback ephemeral range (IANA dynamic range) used when the kernel's configured
# range cannot be read, as on non-Linux platforms.
DEFAULT_EPHEMERAL_PORT_RANGE = (49152, 65535)

# Path exposing the kernel's configured ephemeral port range on Linux.
LINUX_EPHEMERAL_RANGE_PATH = '/proc/sys/net/ipv4/ip_local_port_range'

# Signals that mean "stop serving".  These drive the graceful shutdown path, which
# ends the process when this module owns it.
TERMINATION_SIGNALS = (signal.SIGTERM, signal.SIGINT)

# Signals kept for observability only.  They report process state and keep serving:
# SIGUSR1/SIGUSR2 conventionally mean "reopen logs" or "re-exec" to a process
# supervisor, so terminating on them would stop a server that was only being poked.
DIAGNOSTIC_SIGNALS = tuple(
    getattr(signal, name)
    for name in ('SIGUSR1', 'SIGUSR2')
    if hasattr(signal, name)
)


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

    SIGTERM and SIGINT drive the graceful shutdown path; SIGUSR1 and SIGUSR2 report
    process state without stopping the server.  The disposition each signal had before
    this module installed its own is remembered so a hosting WSGI server's handler can
    still run — see delegate_signal_to_host().
    """
    def signal_handler(signum: int, frame) -> None:
        """
        Python signal handler function for graceful shutdown coordination.
        Replaces Node.js process.on() signal handlers with Python equivalent.
        
        Args:
            signum: Signal number received (SIGTERM=15, SIGINT=2)
            frame: Current stack frame (passed on when delegating to a host handler)
        """
        global signal_received
        signal_received = True
        
        signal_name = describe_signal(signum)
        
        # Observability signals report and return: the service keeps serving.
        if signum not in TERMINATION_SIGNALS:
            logger.info(f"📨 {signal_name} signal received: reporting process state")
            log_memory_usage(f"Signal Handler ({signal_name})")
            logger.info("🎓 Educational Note: user-defined signals need not stop a service")
            return
        
        # Log signal reception for educational visibility
        logger.info(f"🛑 {signal_name} signal received: Initiating graceful shutdown...")
        logger.info("🎓 Educational Note: Signal handlers enable clean container shutdown")
        
        # Set shutdown event to coordinate graceful termination
        shutdown_event.set()
        
        # Log memory usage before shutdown for educational purposes
        log_memory_usage(f"Signal Handler ({signal_name})")
        
        # Perform graceful shutdown procedures.  When this module owns the process this
        # call stops the HTTP server (or exits directly if none is running), so control
        # only returns here when a hosting WSGI server owns termination instead.
        perform_graceful_shutdown(signal_name)
        
        if not owns_process_lifecycle:
            delegate_signal_to_host(signum, frame)
    
    # Register signal handlers for container orchestration
    # Replaces Node.js process.on('SIGTERM') with Python signal.signal()
    registered = []
    try:
        for signum in TERMINATION_SIGNALS + DIAGNOSTIC_SIGNALS:
            # Remember the current disposition before replacing it, so the handler a
            # host installed (Gunicorn's worker handler, for example) can be invoked
            # after ours rather than being silently discarded.
            previous_signal_handlers[signum] = signal.getsignal(signum)
            signal.signal(signum, signal_handler)
            registered.append(describe_signal(signum))
        
        logger.info("📡 Python signal handlers registered successfully")
        logger.info(f"🎯 Signals handled: {', '.join(registered)}")
        logger.info("🎓 Educational Note: Signal handlers replace Node.js process.on() patterns")
        
    except (OSError, ValueError) as e:
        # Handle signal registration errors: platform-specific limitations (OSError)
        # and registration attempted from a thread other than the main one (ValueError,
        # which is the only thread Python delivers signals to).
        logger.warning(f"⚠️  Signal handler registration warning: {e}")
        logger.warning("🎓 Educational Note: Some signals may not be available on all platforms")


def describe_signal(signum: int) -> str:
    """
    Returns a readable name for a signal number for log output.
    Replaces the Node.js practice of logging the signal string passed to process.on().
    
    Args:
        signum: Signal number as delivered to a signal handler
        
    Returns:
        str: Signal name such as 'SIGTERM', or 'Signal-<n>' if the number is unknown
    """
    try:
        return signal.Signals(signum).name
    except ValueError:
        return f'Signal-{signum}'


def delegate_signal_to_host(signum: int, frame: Any) -> bool:
    """
    Hands a signal to the handler that was installed before this module's own.
    
    A WSGI server such as Gunicorn installs SIGTERM/SIGINT handlers in every worker
    before it imports the application, so replacing them without delegating leaves the
    host unaware that it was asked to stop — the worker keeps serving until the
    arbiter's force-kill timeout expires.  Only a real callable is invoked: SIG_DFL and
    SIG_IGN are deliberately not emulated, because performing the default action here
    would terminate a process whose lifecycle this module does not own.
    
    Args:
        signum: Signal number received
        frame: Stack frame the signal interrupted, passed through unchanged
        
    Returns:
        bool: True when a host handler was invoked, False when there was none to invoke
    """
    previous = previous_signal_handlers.get(signum)
    
    if not callable(previous):
        logger.info("🤝 No host signal handler to delegate to; the host owns termination")
        return False
    
    logger.info(f"🤝 Delegating {describe_signal(signum)} to the hosting server's handler")
    previous(signum, frame)
    return True


def perform_graceful_shutdown(signal_name: str) -> None:
    """
    Performs graceful shutdown procedures for WSGI application termination.
    Replaces Node.js server.close() with Python WSGI shutdown coordination.
    
    Cleanup alone is not a shutdown: this function also ends the serving process it
    owns.  It stops the HTTP server started by run_http_server() — which releases the
    listening socket and lets the process exit with status 0 — and when there is no
    such server but this module is still the process entry point, it exits directly.
    Under a hosting WSGI server it performs cleanup only, because that server owns
    process termination (the caller then delegates the signal to it).
    
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
        
        # Stop serving.  When a server is running, in-flight responses finish and the
        # listening socket is released as serve_forever() unwinds in the main thread.
        server_stopping = stop_http_server()
        
        # Log shutdown completion with educational notes
        logger.info("🏁 Graceful shutdown procedures completed successfully")
        logger.info("🎓 Educational Note: Clean shutdown enables reliable container orchestration")
        
        if server_stopping:
            # run_http_server() logs the goodbye once the socket is actually released,
            # so this path deliberately does not claim the shutdown is finished yet.
            logger.info("⏳ Awaiting listening socket release before process exit...")
            return
        
        logger.info("👋 WSGI application shutdown complete. Thank you for learning Python and Flask!")
        
        if owns_process_lifecycle:
            # No server to unwind (a signal arrived before or after serving), but this
            # process is ours to end, so end it rather than returning to the caller and
            # leaving a "shutdown complete" message that nothing acts on.
            sys.exit(0)
        
        logger.info("🤝 Hosted by a WSGI server: it owns process termination from here")
        
    except Exception as e:
        # Handle shutdown errors with comprehensive logging
        logger.error(f"❌ Error during graceful shutdown: {e}")
        logger.error("🎓 Educational Note: Shutdown errors should be handled gracefully")


def stop_http_server(timeout: float = GRACEFUL_SHUTDOWN_TIMEOUT_SECONDS) -> bool:
    """
    Asks the HTTP server started by run_http_server() to stop accepting connections.
    Replaces Node.js server.close() with the werkzeug server's cooperative shutdown.
    
    The request is issued from a short-lived helper thread on purpose.
    BaseServer.shutdown() blocks until serve_forever() has returned, and serve_forever()
    runs on the main thread — the only thread Python delivers signals to — so calling
    shutdown() directly from a signal handler would wait for a loop that cannot run
    until the handler returns: a deadlock.  Issuing it from another thread lets the main
    thread leave the handler, observe the stop request, exit the loop and close the
    listening socket.
    
    Args:
        timeout: Seconds allowed for the cooperative shutdown before it is forced
        
    Returns:
        bool: True when a running server was asked to stop, False when none is running
              (the process is hosted by a WSGI server, or is not serving at all)
    """
    server = http_server
    
    if server is None:
        return False
    
    logger.info("🔌 Asking the HTTP server to stop accepting new connections...")
    logger.info("🎓 Educational Note: shutdown() ends the accept loop; in-flight replies finish")
    
    stop_request = threading.Thread(
        target=server.shutdown,
        name='wsgi-shutdown-request',
        daemon=True,
    )
    stop_request.start()
    
    # Never let a received signal end in nothing but log output.
    arm_forced_exit(timeout)
    
    return True


def arm_forced_exit(delay: float) -> Optional[threading.Timer]:
    """
    Arms a watchdog that terminates the process if the graceful path cannot finish.
    Replaces the Node.js habit of a shutdown timer guarding server.close().
    
    A cooperative shutdown depends on serve_forever() returning.  If something prevents
    that — a wedged worker thread, a stalled connection — the process must still exit,
    because a service that logs a shutdown and then keeps holding its port is exactly
    the failure this guards against.  The timer is a daemon, so it never keeps an
    otherwise-finished process alive.
    
    Args:
        delay: Seconds to wait for the graceful path before forcing termination
        
    Returns:
        Optional[threading.Timer]: The armed timer, or the already-armed one
    """
    global forced_exit_timer
    
    if forced_exit_timer is not None:
        return forced_exit_timer
    
    def force_exit() -> None:
        logger.error(f"⏱️  Graceful shutdown exceeded {delay:g}s: forcing process exit")
        logger.error("🎓 Educational Note: a shutdown deadline keeps a stop from hanging")
        
        # Flush handlers explicitly: os._exit() bypasses interpreter cleanup, which is
        # what makes it able to end a process whose threads will not cooperate.
        logging.shutdown()
        os._exit(0)
    
    timer = threading.Timer(delay, force_exit)
    timer.name = 'wsgi-forced-exit'
    timer.daemon = True
    timer.start()
    
    forced_exit_timer = timer
    return timer


def cancel_forced_exit() -> None:
    """
    Cancels the forced-exit watchdog after a graceful shutdown completed in time.
    Keeps the successful path free of a pending hard exit.
    """
    global forced_exit_timer
    
    if forced_exit_timer is None:
        return
    
    forced_exit_timer.cancel()
    forced_exit_timer = None


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
        
        # Warn about the kernel's ephemeral range.  A port there is also handed out to
        # outbound connections, so an unrelated connection can hold it for an instant
        # and make a bind fail on a port that is unused a moment later.
        ephemeral_low, ephemeral_high = ephemeral_port_range()
        if ephemeral_low <= port_number <= ephemeral_high:
            logger.warning(
                f"⚠️  Port {port_number} is inside the ephemeral range "
                f"({ephemeral_low}-{ephemeral_high}) used for outbound connections"
            )
            logger.warning("🔧 Prefer a port below the ephemeral range for a listening service")
            logger.warning("🎓 Educational Note: binds there can fail transiently; startup retries")
        
        return port_number
        
    except ValueError as e:
        logger.error(f"❌ Invalid port number: {port}")
        logger.error("🔧 Troubleshooting: Use PORT environment variable with valid number")
        logger.error("🎓 Educational Note: Port validation prevents runtime errors")
        raise ValueError(f"Invalid port configuration: {e}") from e


def ephemeral_port_range() -> tuple:
    """
    Reads the kernel's ephemeral (dynamic) port range used for outbound connections.
    
    On Linux the range is published at /proc/sys/net/ipv4/ip_local_port_range as two
    integers; where it cannot be read — a non-Linux platform, or a restricted /proc —
    the IANA dynamic range is reported instead so callers always get a usable answer.
    
    Returns:
        tuple: (lowest_port, highest_port) of the ephemeral range
    """
    try:
        with open(LINUX_EPHEMERAL_RANGE_PATH, 'r', encoding='utf-8') as range_file:
            low, high = range_file.read().split()[:2]
        return int(low), int(high)
    except (OSError, ValueError):
        # Not fatal: the range is advisory, used only to warn about a risky PORT value.
        return DEFAULT_EPHEMERAL_PORT_RANGE


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
    logger.info("🌶️  Flask framework: Production WSGI application")
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


def create_listening_socket(
    host: str,
    port: int,
    max_attempts: int = BIND_RETRY_ATTEMPTS,
    retry_delay: float = BIND_RETRY_DELAY_SECONDS,
) -> socket.socket:
    """
    Binds a listening socket for the HTTP server, retrying a transient address clash.
    Replaces the Node.js server.listen() bind with an explicit, retrying Python bind.
    
    Why this module binds its own socket instead of letting werkzeug do it: werkzeug
    treats every bind error as fatal (it prints the reason and exits the process), so a
    port that is momentarily held — which is routine for a port inside the kernel's
    ephemeral range, where outbound connections are also allocated from — kills startup
    even though the port is free a moment later.  Binding here makes the error
    observable, so EADDRINUSE can be retried while any other error still fails fast.
    The address family and socket address come from werkzeug's own helpers so the
    descriptor handed to make_server() matches what it expects.
    
    Args:
        host: Host address to bind (hostname, IP address, or 0.0.0.0 for all interfaces)
        port: Validated TCP port number to bind
        max_attempts: Total bind attempts, including the first
        retry_delay: Seconds to wait between attempts
        
    Returns:
        socket.socket: A bound, listening socket owned by the caller
        
    Raises:
        OSError: If the port is genuinely unavailable, or any non-EADDRINUSE bind error
    """
    address_family = select_address_family(host, port)
    server_address = get_sockaddr(host, port, address_family)
    
    for attempt in range(1, max_attempts + 1):
        listening_socket = socket.socket(address_family, socket.SOCK_STREAM)
        
        # SO_REUSEADDR lets a restart rebind a port still in TIME_WAIT from the
        # previous run; it does not allow stealing a port from a live listener.
        listening_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        try:
            listening_socket.bind(server_address)
            listening_socket.listen(socket.SOMAXCONN)
            
            if attempt > 1:
                logger.info(f"✅ Bound {host}:{port} on attempt {attempt}/{max_attempts}")
            
            return listening_socket
            
        except OSError as bind_error:
            listening_socket.close()
            
            retryable = bind_error.errno == errno.EADDRINUSE and attempt < max_attempts
            
            if not retryable:
                logger.error(f"❌ Cannot bind {host}:{port}: {bind_error.strerror}")
                if bind_error.errno == errno.EADDRINUSE:
                    logger.error(f"🔧 Port {port} is in use: stop that process or set PORT")
                logger.error("🎓 Educational Note: a listening service needs an unused port")
                raise
            
            logger.warning(
                f"⚠️  Port {port} busy on attempt {attempt}/{max_attempts} "
                f"({bind_error.strerror}); retrying in {retry_delay:.1f}s"
            )
            logger.warning("🎓 Educational Note: ephemeral-range ports can clash for an instant")
            time.sleep(retry_delay)
    
    # Unreachable: the loop either returns a socket or raises on its final attempt.
    raise OSError(errno.EADDRINUSE, f"Could not bind {host}:{port}")


def run_http_server(app: Flask, host: str, port: int) -> int:
    """
    Serves the WSGI application over HTTP until a termination signal is received.
    Replaces the Node.js server.listen() + server.close() lifecycle held by server.js.
    
    This is what makes `python wsgi.py` a running server rather than a process that
    initializes an application and exits.  The werkzeug server object is kept in the
    module-level `http_server` so the signal path can stop it; werkzeug's
    serve_forever() closes the listening socket as it unwinds, so the port is released
    before this function returns.
    
    Args:
        app: Flask application (WSGI callable) to serve
        host: Host address to bind
        port: Validated TCP port number to bind
        
    Returns:
        int: Process exit status — 0 after a clean shutdown
        
    Raises:
        OSError: If the listening socket cannot be bound
    """
    global http_server
    
    if shutdown_event.is_set():
        # A termination signal arrived while the application was still being built.
        logger.info("🛑 Shutdown requested before startup completed: not binding a socket")
        return 0
    
    listening_socket = create_listening_socket(host, port)
    
    try:
        # make_server() duplicates the descriptor it is given (socket.fromfd), so this
        # module's own handle is closed immediately afterwards; the server owns the
        # socket from here on.  threaded=True matches Flask's development server, so a
        # slow request cannot block the next one.
        server = make_server(host, port, app, threaded=True, fd=listening_socket.fileno())
    finally:
        listening_socket.close()
    
    http_server = server
    bound_port = server.server_address[1] if len(server.server_address) > 1 else port
    
    try:
        log_server_started(host, bound_port)
        
        # Blocks until stop_http_server() ends the accept loop.  serve_forever() closes
        # the listening socket in its own finally clause as it returns.
        server.serve_forever()
        
    finally:
        http_server = None
        cancel_forced_exit()
    
    logger.info("✅ Listening socket released; port is free for the next process")
    logger.info("👋 WSGI application shutdown complete. Thank you for learning Python and Flask!")
    
    return 0


def log_server_started(host: str, port: int) -> None:
    """
    Logs the startup banner for a server that is listening and reachable.
    Replaces the Node.js 'Server listening on ...' banner printed by server.js.
    
    The port reported is the one the socket is actually bound to, read back from the
    server rather than from the requested configuration, so the banner cannot advertise
    an address that nothing is listening on.
    
    Args:
        host: Host address the server was asked to bind
        port: Port the socket is actually bound to
    """
    timestamp = datetime.now().isoformat()
    
    logger.info("\n🚀 WSGI Application Successfully Initialized!")
    logger.info("=" * 70)
    logger.info(f"⏰ Startup time: {timestamp}")
    logger.info(f"🌐 Application available at: http://{host}:{port}")
    logger.info(f"📡 Host: {host}")
    logger.info(f"🔌 Port: {port}")
    logger.info(f"📋 Process ID: {os.getpid()}")
    
    logger.info("\n🎯 Available Endpoints:")
    logger.info(f"   GET  http://{host}:{port}/hello  →  Returns JSON 'Hello world'")
    logger.info(f"   GET  http://{host}:{port}/health →  Application health check")
    
    logger.info("\n🛑 Stopping the server:")
    logger.info("   Ctrl+C (SIGINT), or: kill -TERM " + str(os.getpid()))
    logger.info("   The listening socket is released and the process exits with status 0")
    
    logger.info("=" * 70)
    logger.info("✨ Server is listening. Requests are being served.\n")


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
    # This process belongs to this module, so the signal path stops the server and
    # ends the process rather than deferring termination to a hosting WSGI server.
    owns_process_lifecycle = True
    
    # Configure uncaught exception handling for production visibility
    handle_uncaught_exceptions()
    
    # Set up signal handlers for graceful shutdown
    setup_signal_handlers()
    
    # Create WSGI application instance
    application = create_wsgi_application()
    
    # Log educational information about WSGI deployment
    logger.info("🎓 Educational Tutorial: Python WSGI with Flask")
    logger.info("📖 Learning Objectives: WSGI deployment, signal handling, memory monitoring")
    
    # Running this file IS the request to serve, so a socket is always bound here.
    # FLASK_ENV selects which application configuration is loaded; it is not a switch
    # between serving and not serving.  A deployment fronts the same `application`
    # object with Gunicorn, which imports this module and never reaches this block.
    flask_environment = os.getenv('FLASK_ENV', 'production')
    
    if flask_environment == 'development':
        logger.info("🧪 Development mode: Starting Flask development server...")
    else:
        logger.info(f"🏭 {flask_environment} configuration served by the built-in server")
        logger.info("🔧 For production use: gunicorn --bind 0.0.0.0:8000 wsgi:application")
    
    logger.info("⚠️  Warning: Development server not suitable for production")
    logger.info("🎓 Educational Note: Use Gunicorn for production deployment")
    
    try:
        # Extract host and port for the built-in server
        host = os.getenv('HOST', 'localhost')
        port = validate_port_number(os.getenv('PORT', '8000'))
        
        # Serve until SIGTERM/SIGINT; returns 0 once the socket has been released
        exit_status = run_http_server(application, host, port)
    except Exception as e:
        logger.error(f"❌ Development server error: {e}")
        logger.error("🎓 Educational Note: a server that cannot bind must fail loudly")
        sys.exit(1)
    
    # Exit explicitly so the status is the shutdown's outcome, not an accident of
    # falling off the end of the module.
    sys.exit(exit_status)

# WSGI application object for Gunicorn deployment
# This is the main entry point for WSGI servers
# Replaces Node.js module.exports with Python WSGI application object
else:
    # Configure signal handling for WSGI server deployment.  `owns_process_lifecycle`
    # stays False here: the hosting server (Gunicorn) created this process and owns its
    # termination, so the handlers registered below log and clean up, then hand the
    # signal back to the host's own handler instead of exiting underneath it.
    setup_signal_handlers()
    
    # Create WSGI application for production deployment
    application = create_wsgi_application()
    
    # Log WSGI application readiness
    logger.info("🔗 WSGI application object created for server deployment")
    logger.info("🎓 Educational Note: 'application' object provides WSGI interface")

# Export application object for WSGI server integration
# This replaces Node.js module.exports with Python module-level variable
__all__ = ['application']
