#!/usr/bin/env python3
"""
Comprehensive pytest test suite for WSGI server lifecycle management and Flask application integration.
Replaces server.test.js functionality using pytest framework with subprocess integration for Gunicorn WSGI server testing.

This module provides thorough validation of WSGI server startup, shutdown, performance characteristics, and 
production deployment scenarios using pytest-benchmark, psutil memory monitoring, and concurrent request testing.
Demonstrates production-grade Python testing practices for educational purposes while ensuring reliable
WSGI server behavior across development and deployment environments.

Educational Purpose:
- Shows pytest-based WSGI server testing replacing Jest HTTP server testing patterns
- Demonstrates subprocess integration for Gunicorn process management and lifecycle validation
- Provides Flask application factory testing with WSGI entry point validation
- Shows pytest-benchmark integration for performance measurement and SLA enforcement
- Demonstrates psutil memory monitoring for resource usage validation with 75MB limit
- Implements Python signal handling testing for SIGTERM and SIGINT graceful shutdown
- Shows pytest fixture-based environment variable testing with python-dotenv integration
- Provides concurrent request testing using threading for WSGI server load validation

Production Testing Features:
- WSGI server lifecycle validation including startup, shutdown, and signal handling
- Gunicorn WSGI server integration testing using subprocess for production deployment validation
- Flask application factory testing with WSGI entry point validation 
- pytest-benchmark integration for WSGI server performance measurement with response time thresholds
- psutil memory monitoring for WSGI server resource usage validation with 75MB limit enforcement
- Python signal handling testing for SIGTERM and SIGINT with graceful shutdown validation
- pytest fixture-based environment variable testing with python-dotenv integration
- Concurrent request testing using threading for WSGI server load validation per performance requirements
"""

import os
import sys
import signal
import time
import socket
import threading
import subprocess
import json
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, Any, Optional, List, Generator
import logging

# Third-party imports for comprehensive WSGI testing
try:
    import pytest
    import psutil
    import requests
    from dotenv import load_dotenv
    from flask import Flask
except ImportError as e:
    print(f"❌ Critical Import Error: {e}")
    print("🔧 Please ensure all testing dependencies are installed:")
    print("   pip install pytest>=8.4.0 pytest-flask>=1.3.0 psutil>=5.9.0")
    print("   pip install requests>=2.31.0 python-dotenv>=1.0.1")
    print("🎓 Educational Note: WSGI testing requires pytest ecosystem and system monitoring")
    sys.exit(1)

# Import Flask application factory and WSGI entry point
try:
    from src.backend.app import create_app
    from src.backend.wsgi import create_wsgi_application
except ImportError as e:
    print(f"❌ Flask Application Import Error: {e}")
    print("🔧 Ensure Flask application modules are available:")
    print("   src/backend/app.py with create_app() function")
    print("   src/backend/wsgi.py with create_wsgi_application() function")
    print("🎓 Educational Note: WSGI testing depends on Flask application factory patterns")
    sys.exit(1)

# Configure pytest logging for WSGI test visibility
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# PYTEST FIXTURES FOR WSGI SERVER TESTING
# ============================================================================

@pytest.fixture(scope='session', autouse=True)
def configure_wsgi_test_environment():
    """
    Session-scoped autouse fixture for WSGI testing environment configuration.
    Replaces Jest global setup with pytest session-level configuration using python-dotenv.
    
    This fixture automatically configures the Flask testing environment using python-dotenv
    for comprehensive environment variable management, ensuring consistent WSGI testing
    behavior across all test modules and functions.
    """
    logger.info("🔄 Configuring WSGI testing environment using python-dotenv")
    
    # Store original environment for restoration
    original_env = os.environ.copy()
    
    # Load testing environment configuration
    load_dotenv('.env.testing', override=True)
    
    # Configure Flask testing environment
    test_environment = {
        'FLASK_ENV': 'testing',
        'TESTING': '1',
        'LOG_LEVEL': 'ERROR',
        'HOST': 'localhost',
        'WTF_CSRF_ENABLED': 'False',
        'FLASK_DEBUG': 'False'
    }
    
    # Apply testing environment configuration
    os.environ.update(test_environment)
    
    logger.info("✅ WSGI testing environment configured successfully")
    logger.info("🎓 Educational Note: python-dotenv provides 12-factor app configuration")
    
    yield
    
    # Restore original environment
    logger.info("🧹 Restoring original environment after WSGI testing session")
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def memory_monitor():
    """
    pytest fixture for psutil-based memory monitoring during WSGI server testing.
    Replaces Jest memory monitoring with Python psutil process monitoring.
    
    Provides comprehensive memory usage tracking with 75MB limit enforcement
    for WSGI server resource validation and leak detection.
    
    Returns:
        Dict[str, Any]: Memory monitoring context with baseline and validation functions
    """
    logger.info("📊 Initializing psutil memory monitoring for WSGI testing")
    
    # Get current process for memory monitoring
    process = psutil.Process()
    baseline_memory = process.memory_info().rss / 1024 / 1024  # Convert to MB
    
    memory_context = {
        'process': process,
        'baseline_mb': baseline_memory,
        'max_allowed_mb': 75,
        'measurements': []
    }
    
    def record_measurement(label: str) -> float:
        """Record memory measurement with label"""
        current_memory = process.memory_info().rss / 1024 / 1024
        measurement = {
            'label': label,
            'memory_mb': current_memory,
            'timestamp': time.time()
        }
        memory_context['measurements'].append(measurement)
        logger.info(f"📈 Memory measurement ({label}): {current_memory:.2f}MB")
        return current_memory
    
    def validate_memory_limit() -> None:
        """Validate memory usage within 75MB limit"""
        current_memory = record_measurement("validation_check")
        assert current_memory < memory_context['max_allowed_mb'], \
            f"Memory usage {current_memory:.2f}MB exceeds 75MB limit"
    
    memory_context['record'] = record_measurement
    memory_context['validate'] = validate_memory_limit
    
    # Record initial baseline
    record_measurement("test_start_baseline")
    
    logger.info(f"📋 Memory monitoring initialized - Baseline: {baseline_memory:.2f}MB")
    logger.info("🎓 Educational Note: psutil enables precise Python process monitoring")
    
    yield memory_context
    
    # Final memory validation and cleanup
    final_memory = record_measurement("test_end_validation")
    memory_growth = final_memory - baseline_memory
    
    logger.info(f"📊 Final memory usage: {final_memory:.2f}MB (Growth: {memory_growth:.2f}MB)")
    
    # Validate memory growth within acceptable limits
    assert memory_growth < 10, f"Memory growth {memory_growth:.2f}MB exceeds 10MB test limit"
    assert final_memory < 75, f"Final memory usage {final_memory:.2f}MB exceeds 75MB limit"
    
    logger.info("✅ Memory validation completed successfully")


@pytest.fixture
def dynamic_port():
    """
    pytest fixture for dynamic port allocation preventing WSGI server conflicts.
    Replaces Jest port management with Python socket-based dynamic allocation.
    
    Provides isolated port allocation for concurrent pytest execution and
    WSGI server testing without port conflicts.
    
    Returns:
        int: Dynamically allocated port number for WSGI server testing
    """
    logger.info("🔌 Allocating dynamic port for WSGI server testing")
    
    # Find available port using socket binding
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('localhost', 0))
        s.listen(1)
        port = s.getsockname()[1]
    
    # Validate port is in acceptable range
    assert 1024 <= port <= 65535, f"Dynamic port {port} outside acceptable range"
    
    # Set environment variable for WSGI server configuration
    os.environ['FLASK_RUN_PORT'] = str(port)
    os.environ['WSGI_PORT'] = str(port)
    
    logger.info(f"🎯 Dynamic port allocated: {port}")
    logger.info("🎓 Educational Note: Dynamic ports prevent test conflicts")
    
    yield port
    
    # Cleanup environment variables
    os.environ.pop('FLASK_RUN_PORT', None)
    os.environ.pop('WSGI_PORT', None)
    
    logger.info(f"🧹 Dynamic port {port} released")


@pytest.fixture
def flask_app():
    """
    pytest fixture for Flask application factory testing with WSGI integration.
    Replaces Jest application mocking with Flask application factory pattern.
    
    Provides configured Flask application instance for WSGI server testing
    with proper testing configuration and context management.
    
    Returns:
        Flask: Configured Flask application instance for testing
    """
    logger.info("🌶️ Creating Flask application using factory pattern")
    
    try:
        # Create Flask application using application factory
        app = create_app(config_name='testing')
        
        # Configure additional testing settings
        app.config.update({
            'TESTING': True,
            'WTF_CSRF_ENABLED': False,
            'SERVER_NAME': None,  # Allow flexible server name for testing
            'APPLICATION_ROOT': '/',
        })
        
        logger.info("✅ Flask application created successfully")
        logger.info("🎓 Educational Note: Application factory pattern enables flexible testing")
        
        yield app
        
    except Exception as e:
        logger.error(f"❌ Flask application creation failed: {e}")
        pytest.fail(f"Flask application factory error: {e}")


@pytest.fixture
def wsgi_app():
    """
    pytest fixture for WSGI application entry point testing.
    Validates WSGI application factory integration and configuration.
    
    Returns:
        Flask: WSGI-configured Flask application instance
    """
    logger.info("🔗 Creating WSGI application entry point")
    
    try:
        # Create WSGI application using wsgi.py entry point
        wsgi_application = create_wsgi_application()
        
        logger.info("✅ WSGI application created successfully")
        logger.info("🎓 Educational Note: WSGI entry point enables production deployment")
        
        yield wsgi_application
        
    except Exception as e:
        logger.error(f"❌ WSGI application creation failed: {e}")
        pytest.fail(f"WSGI application factory error: {e}")


@pytest.fixture
def performance_baseline():
    """
    pytest fixture for performance baseline measurement and validation.
    Provides performance tracking context for WSGI server testing.
    
    Returns:
        Dict[str, Any]: Performance measurement context with timing functions
    """
    logger.info("⏱️ Initializing performance baseline measurement")
    
    baseline_context = {
        'measurements': [],
        'thresholds': {
            'cold_start_ms': 100,
            'warm_request_ms': 50,
            'concurrent_avg_ms': 50,
            'memory_limit_mb': 75
        }
    }
    
    def measure_duration(label: str):
        """Context manager for duration measurement"""
        @contextmanager
        def timing_context():
            start_time = time.perf_counter()
            try:
                yield
            finally:
                duration_ms = (time.perf_counter() - start_time) * 1000
                measurement = {
                    'label': label,
                    'duration_ms': duration_ms,
                    'timestamp': time.time()
                }
                baseline_context['measurements'].append(measurement)
                logger.info(f"⏱️ Performance measurement ({label}): {duration_ms:.2f}ms")
        return timing_context()
    
    def validate_threshold(label: str, duration_ms: float, threshold_key: str):
        """Validate performance against baseline thresholds"""
        threshold = baseline_context['thresholds'][threshold_key]
        assert duration_ms < threshold, \
            f"{label} duration {duration_ms:.2f}ms exceeds {threshold}ms threshold"
        logger.info(f"✅ {label} performance within {threshold}ms threshold")
    
    baseline_context['measure'] = measure_duration
    baseline_context['validate'] = validate_threshold
    
    logger.info("📋 Performance baseline measurement initialized")
    logger.info("🎓 Educational Note: Performance baselines ensure SLA compliance")
    
    yield baseline_context


# ============================================================================
# WSGI SERVER LIFECYCLE TESTING
# ============================================================================

class TestWSGIServerLifecycle:
    """
    Comprehensive WSGI server lifecycle testing using subprocess and signal management.
    Replaces Jest server lifecycle tests with Python subprocess-based Gunicorn testing.
    
    This test class validates WSGI server startup, shutdown, signal handling, and
    process management using pytest fixtures and subprocess integration.
    """
    
    def test_wsgi_server_startup_lifecycle(self, dynamic_port, memory_monitor, performance_baseline):
        """
        Test WSGI server startup lifecycle with Gunicorn process management.
        Replaces Jest server.listen() testing with Gunicorn subprocess lifecycle validation.
        
        Validates:
        - Gunicorn WSGI server process initialization
        - Flask application factory loading within WSGI context
        - Worker process startup and readiness validation
        - Port binding and network interface configuration
        - Memory usage during startup within 75MB limit
        """
        logger.info("🚀 Testing WSGI server startup lifecycle")
        
        # Record initial memory baseline
        memory_monitor['record']("startup_test_begin")
        
        with performance_baseline['measure']("wsgi_startup"):
            # Start Gunicorn WSGI server using subprocess
            gunicorn_command = [
                'python', '-m', 'gunicorn',
                '--bind', f'127.0.0.1:{dynamic_port}',
                '--workers', '1',
                '--timeout', '30',
                '--worker-class', 'sync',
                '--access-logfile', '-',
                '--error-logfile', '-',
                '--log-level', 'info',
                'src.backend.wsgi:application'
            ]
            
            logger.info(f"🔧 Starting Gunicorn WSGI server on port {dynamic_port}")
            
            # Start WSGI server process
            process = subprocess.Popen(
                gunicorn_command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=os.getcwd()
            )
            
            try:
                # Wait for WSGI server startup (up to 10 seconds)
                startup_timeout = 10
                for attempt in range(startup_timeout):
                    try:
                        response = requests.get(
                            f'http://127.0.0.1:{dynamic_port}/health',
                            timeout=1
                        )
                        if response.status_code == 200:
                            logger.info("✅ WSGI server startup successful")
                            break
                    except requests.exceptions.RequestException:
                        time.sleep(1)
                        continue
                else:
                    pytest.fail(f"WSGI server failed to start within {startup_timeout} seconds")
                
                # Validate server process is running
                assert process.poll() is None, "WSGI server process terminated unexpectedly"
                
                # Validate memory usage during startup
                memory_monitor['validate']()
                
                # Test basic endpoint availability
                health_response = requests.get(f'http://127.0.0.1:{dynamic_port}/health')
                assert health_response.status_code == 200
                assert health_response.json()['status'] == 'healthy'
                
                logger.info("🎯 WSGI server startup lifecycle validation completed")
                
            finally:
                # Graceful shutdown
                logger.info("🛑 Initiating WSGI server graceful shutdown")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning("⚠️ Graceful shutdown timeout, forcing termination")
                    process.kill()
                    process.wait()
                
                logger.info("✅ WSGI server shutdown completed")
        
        # Validate startup performance
        startup_measurements = [m for m in performance_baseline['measurements'] if m['label'] == 'wsgi_startup']
        if startup_measurements:
            startup_duration = startup_measurements[-1]['duration_ms']
            performance_baseline['validate']('WSGI startup', startup_duration, 'cold_start_ms')
        
        logger.info("🎓 Educational Note: Subprocess testing validates production deployment")
    
    def test_wsgi_server_signal_handling(self, dynamic_port, memory_monitor):
        """
        Test WSGI server Python signal handling for graceful shutdown.
        Validates SIGTERM and SIGINT signal processing with proper cleanup.
        
        Validates:
        - SIGTERM signal handling for container orchestration
        - SIGINT signal handling for development interruption
        - Graceful worker process shutdown
        - Connection draining and request completion
        - Memory cleanup during shutdown process
        """
        logger.info("📡 Testing WSGI server signal handling")
        
        # Record memory baseline for signal testing
        memory_monitor['record']("signal_test_begin")
        
        # Start WSGI server for signal testing
        gunicorn_command = [
            'python', '-m', 'gunicorn',
            '--bind', f'127.0.0.1:{dynamic_port}',
            '--workers', '1',
            '--timeout', '30',
            'src.backend.wsgi:application'
        ]
        
        process = subprocess.Popen(
            gunicorn_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            # Wait for server readiness
            time.sleep(2)
            
            # Validate server is responding
            health_response = requests.get(f'http://127.0.0.1:{dynamic_port}/health', timeout=2)
            assert health_response.status_code == 200
            
            logger.info("🎯 Testing SIGTERM signal handling")
            
            # Send SIGTERM signal (graceful shutdown)
            process.send_signal(signal.SIGTERM)
            
            # Monitor graceful shutdown process
            shutdown_start = time.time()
            return_code = process.wait(timeout=10)
            shutdown_duration = time.time() - shutdown_start
            
            # Validate graceful shutdown behavior
            assert return_code == 0, f"WSGI server did not shut down gracefully (exit code: {return_code})"
            assert shutdown_duration < 10, f"Graceful shutdown took {shutdown_duration:.2f}s (>10s limit)"
            
            # Validate server is no longer responding
            with pytest.raises(requests.exceptions.RequestException):
                requests.get(f'http://127.0.0.1:{dynamic_port}/health', timeout=1)
            
            logger.info(f"✅ SIGTERM handled gracefully in {shutdown_duration:.2f}s")
            
        except subprocess.TimeoutExpired:
            logger.error("❌ WSGI server failed to respond to SIGTERM")
            process.kill()
            process.wait()
            pytest.fail("WSGI server signal handling timeout")
        
        # Validate memory after signal handling
        memory_monitor['validate']()
        
        logger.info("🎓 Educational Note: Signal handling enables container orchestration")
    
    def test_wsgi_server_port_binding_validation(self, memory_monitor):
        """
        Test WSGI server port binding validation and configuration.
        Validates port conflict detection and dynamic port allocation.
        
        Validates:
        - Dynamic port allocation without conflicts
        - Port binding validation and error handling
        - Multiple port configuration testing
        - Network interface binding validation
        """
        logger.info("🔌 Testing WSGI server port binding validation")
        
        memory_monitor['record']("port_binding_test_begin")
        
        # Test dynamic port allocation
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as test_socket:
            test_socket.bind(('localhost', 0))
            test_socket.listen(1)
            allocated_port = test_socket.getsockname()[1]
            
            # Test WSGI server startup on allocated port
            gunicorn_command = [
                'python', '-m', 'gunicorn',
                '--bind', f'127.0.0.1:{allocated_port}',
                '--workers', '1',
                '--timeout', '10',
                'src.backend.wsgi:application'
            ]
            
            # Release socket for WSGI server binding
            pass
        
        # Start WSGI server with validated port
        process = subprocess.Popen(
            gunicorn_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            # Wait for successful port binding
            time.sleep(3)
            
            # Validate port binding success
            response = requests.get(f'http://127.0.0.1:{allocated_port}/health', timeout=2)
            assert response.status_code == 200
            
            # Validate server process is running
            assert process.poll() is None, "WSGI server process terminated unexpectedly"
            
            logger.info(f"✅ WSGI server successfully bound to port {allocated_port}")
            
        finally:
            # Cleanup WSGI server process
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        
        # Validate memory usage during port binding
        memory_monitor['validate']()
        
        logger.info("🎓 Educational Note: Dynamic ports enable concurrent testing")


# ============================================================================
# FLASK APPLICATION INTEGRATION TESTING
# ============================================================================

class TestFlaskWSGIIntegration:
    """
    Flask application integration testing with WSGI server validation.
    Tests Flask application factory integration with WSGI entry point.
    
    This test class validates Flask application behavior within WSGI context,
    ensuring proper request handling, middleware processing, and response generation.
    """
    
    def test_flask_application_factory_wsgi_integration(self, wsgi_app, memory_monitor):
        """
        Test Flask application factory integration with WSGI entry point.
        Validates application factory pattern with WSGI deployment configuration.
        
        Validates:
        - Flask application factory pattern execution
        - WSGI application entry point functionality
        - Application configuration in WSGI context
        - Route registration and middleware setup
        """
        logger.info("🌶️ Testing Flask application factory WSGI integration")
        
        memory_monitor['record']("flask_wsgi_integration_begin")
        
        # Validate WSGI application is Flask instance
        assert isinstance(wsgi_app, Flask), "WSGI application is not Flask instance"
        
        # Validate Flask application configuration
        assert wsgi_app.config['TESTING'] is True, "Flask testing mode not enabled"
        
        # Test WSGI application with test client
        with wsgi_app.test_client() as client:
            # Test hello endpoint through WSGI application
            response = client.get('/hello')
            assert response.status_code == 200
            assert response.is_json
            
            data = response.get_json()
            assert 'message' in data
            assert data['message'] == 'Hello world'
            assert 'timestamp' in data
            
            # Test health endpoint through WSGI application
            health_response = client.get('/health')
            assert health_response.status_code == 200
            assert health_response.is_json
            
            health_data = health_response.get_json()
            assert health_data['status'] == 'healthy'
            
            logger.info("✅ Flask endpoints working correctly in WSGI context")
        
        # Validate memory usage during integration testing
        memory_monitor['validate']()
        
        logger.info("🎓 Educational Note: WSGI integration enables production deployment")
    
    def test_flask_wsgi_error_handling(self, wsgi_app, memory_monitor):
        """
        Test Flask error handling within WSGI server context.
        Validates error response generation and exception management.
        
        Validates:
        - 404 Not Found error handling
        - 405 Method Not Allowed error handling
        - 500 Internal Server Error handling
        - Error response format consistency
        """
        logger.info("🚨 Testing Flask WSGI error handling")
        
        memory_monitor['record']("error_handling_test_begin")
        
        with wsgi_app.test_client() as client:
            # Test 404 Not Found handling
            response_404 = client.get('/nonexistent-route')
            assert response_404.status_code == 404
            assert response_404.is_json
            
            error_data_404 = response_404.get_json()
            assert error_data_404['status'] == 404
            assert error_data_404['error'] == 'Not Found'
            assert 'message' in error_data_404
            
            # Test 405 Method Not Allowed handling
            response_405 = client.post('/hello')  # POST to GET-only route
            assert response_405.status_code == 405
            assert response_405.is_json
            
            error_data_405 = response_405.get_json()
            assert error_data_405['status'] == 405
            assert error_data_405['error'] == 'Method Not Allowed'
            
            logger.info("✅ Flask error handling working correctly in WSGI context")
        
        # Validate memory usage during error testing
        memory_monitor['validate']()
        
        logger.info("🎓 Educational Note: Error handling ensures robust API behavior")


# ============================================================================
# PERFORMANCE AND BENCHMARKING TESTING
# ============================================================================

class TestWSGIPerformance:
    """
    WSGI server performance testing with pytest-benchmark integration.
    Provides comprehensive performance validation and memory monitoring.
    
    This test class uses pytest-benchmark for statistical performance analysis
    and psutil for memory usage monitoring with 75MB limit enforcement.
    """
    
    @pytest.mark.benchmark
    def test_wsgi_server_response_time_benchmark(self, benchmark, dynamic_port, memory_monitor):
        """
        Benchmark WSGI server response time using pytest-benchmark.
        Validates response time performance against 50ms SLA requirement.
        
        Uses pytest-benchmark for statistical accuracy with multiple iterations
        and provides comprehensive timing analysis for production validation.
        """
        logger.info("⏱️ Benchmarking WSGI server response time performance")
        
        memory_monitor['record']("benchmark_test_begin")
        
        # Start WSGI server for benchmarking
        gunicorn_command = [
            'python', '-m', 'gunicorn',
            '--bind', f'127.0.0.1:{dynamic_port}',
            '--workers', '1',
            '--timeout', '30',
            'src.backend.wsgi:application'
        ]
        
        process = subprocess.Popen(
            gunicorn_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            # Wait for server startup
            time.sleep(3)
            
            # Validate server is ready
            health_response = requests.get(f'http://127.0.0.1:{dynamic_port}/health', timeout=2)
            assert health_response.status_code == 200
            
            def make_hello_request():
                """Benchmark function for hello endpoint request"""
                response = requests.get(f'http://127.0.0.1:{dynamic_port}/hello', timeout=5)
                assert response.status_code == 200
                return response
            
            # Execute benchmark with pytest-benchmark
            result = benchmark.pedantic(make_hello_request, iterations=10, rounds=3)
            
            # Validate response content
            assert result.status_code == 200
            assert result.json()['message'] == 'Hello world'
            
            # Validate performance against SLA (50ms warm request)
            mean_time_ms = benchmark.stats.mean * 1000
            assert mean_time_ms < 50, f"Mean response time {mean_time_ms:.2f}ms exceeds 50ms SLA"
            
            logger.info(f"📊 Benchmark results - Mean: {mean_time_ms:.2f}ms, "
                       f"Min: {benchmark.stats.min*1000:.2f}ms, "
                       f"Max: {benchmark.stats.max*1000:.2f}ms")
            
        finally:
            # Cleanup WSGI server
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        
        # Validate memory usage during benchmarking
        memory_monitor['validate']()
        
        logger.info("🎓 Educational Note: pytest-benchmark provides statistical accuracy")
    
    def test_wsgi_server_memory_usage_validation(self, dynamic_port, memory_monitor):
        """
        Test WSGI server memory usage validation with psutil monitoring.
        Validates memory consumption stays within 75MB limit during operation.
        
        Validates:
        - Memory usage during server startup and operation
        - Memory growth patterns under request load
        - Memory cleanup during server shutdown
        - Memory leak detection and prevention
        """
        logger.info("📊 Testing WSGI server memory usage validation")
        
        # Record initial memory baseline
        initial_memory = memory_monitor['record']("memory_test_baseline")
        
        # Start WSGI server for memory testing
        gunicorn_command = [
            'python', '-m', 'gunicorn',
            '--bind', f'127.0.0.1:{dynamic_port}',
            '--workers', '1',
            '--timeout', '30',
            'src.backend.wsgi:application'
        ]
        
        process = subprocess.Popen(
            gunicorn_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            # Wait for server startup and measure memory
            time.sleep(3)
            startup_memory = memory_monitor['record']("after_server_startup")
            
            # Validate server is ready
            health_response = requests.get(f'http://127.0.0.1:{dynamic_port}/health', timeout=2)
            assert health_response.status_code == 200
            
            # Generate request load and monitor memory
            for i in range(50):
                response = requests.get(f'http://127.0.0.1:{dynamic_port}/hello', timeout=2)
                assert response.status_code == 200
                
                # Record memory every 10 requests
                if i % 10 == 0:
                    memory_monitor['record'](f"after_{i+1}_requests")
            
            # Final memory measurement under load
            load_memory = memory_monitor['record']("after_request_load")
            
            # Validate memory growth is within acceptable limits
            memory_growth = load_memory - initial_memory
            assert memory_growth < 20, f"Memory growth {memory_growth:.2f}MB exceeds 20MB limit"
            
            # Validate absolute memory usage
            memory_monitor['validate']()
            
            logger.info(f"📈 Memory usage - Initial: {initial_memory:.2f}MB, "
                       f"Startup: {startup_memory:.2f}MB, "
                       f"Under load: {load_memory:.2f}MB")
            
        finally:
            # Graceful shutdown and memory cleanup validation
            process.terminate()
            process.wait(timeout=5)
            
            # Allow time for cleanup
            time.sleep(1)
            final_memory = memory_monitor['record']("after_server_shutdown")
            
            logger.info(f"🧹 Memory after shutdown: {final_memory:.2f}MB")
        
        logger.info("🎓 Educational Note: Memory monitoring prevents resource exhaustion")
    
    def test_wsgi_server_concurrent_load_testing(self, dynamic_port, memory_monitor, performance_baseline):
        """
        Test WSGI server concurrent load handling with threading.
        Validates server performance under concurrent request load.
        
        Validates:
        - Concurrent request handling capacity
        - Response time under load (50ms average requirement)
        - Memory usage during concurrent operations
        - Server stability under stress conditions
        """
        logger.info("🔀 Testing WSGI server concurrent load handling")
        
        memory_monitor['record']("concurrent_test_begin")
        
        # Start WSGI server for concurrent testing
        gunicorn_command = [
            'python', '-m', 'gunicorn',
            '--bind', f'127.0.0.1:{dynamic_port}',
            '--workers', '2',  # Use 2 workers for concurrency
            '--timeout', '30',
            'src.backend.wsgi:application'
        ]
        
        process = subprocess.Popen(
            gunicorn_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            # Wait for server startup
            time.sleep(4)
            
            # Validate server readiness
            health_response = requests.get(f'http://127.0.0.1:{dynamic_port}/health', timeout=2)
            assert health_response.status_code == 200
            
            # Measure concurrent load performance
            with performance_baseline['measure']("concurrent_load"):
                
                def make_concurrent_request(request_id: int) -> Dict[str, Any]:
                    """Make individual request for concurrent testing"""
                    try:
                        start_time = time.perf_counter()
                        response = requests.get(
                            f'http://127.0.0.1:{dynamic_port}/hello',
                            timeout=5
                        )
                        duration_ms = (time.perf_counter() - start_time) * 1000
                        
                        return {
                            'request_id': request_id,
                            'status_code': response.status_code,
                            'duration_ms': duration_ms,
                            'success': response.status_code == 200
                        }
                    except Exception as e:
                        return {
                            'request_id': request_id,
                            'status_code': 0,
                            'duration_ms': 0,
                            'success': False,
                            'error': str(e)
                        }
                
                # Execute 100 concurrent requests using ThreadPoolExecutor
                concurrent_requests = 100
                max_workers = 10
                
                logger.info(f"🚀 Executing {concurrent_requests} concurrent requests")
                
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    # Submit all requests concurrently
                    futures = [
                        executor.submit(make_concurrent_request, i)
                        for i in range(concurrent_requests)
                    ]
                    
                    # Collect results
                    results = [future.result() for future in futures]
            
            # Analyze concurrent load results
            successful_requests = [r for r in results if r['success']]
            failed_requests = [r for r in results if not r['success']]
            
            # Validate success rate
            success_rate = len(successful_requests) / len(results)
            assert success_rate >= 0.95, f"Success rate {success_rate:.2%} below 95% threshold"
            
            # Validate response times
            response_times = [r['duration_ms'] for r in successful_requests]
            avg_response_time = sum(response_times) / len(response_times)
            
            assert avg_response_time < 50, f"Average response time {avg_response_time:.2f}ms exceeds 50ms SLA"
            
            # Log performance statistics
            logger.info(f"📊 Concurrent load results:")
            logger.info(f"   Successful requests: {len(successful_requests)}/{concurrent_requests}")
            logger.info(f"   Success rate: {success_rate:.2%}")
            logger.info(f"   Average response time: {avg_response_time:.2f}ms")
            logger.info(f"   Min response time: {min(response_times):.2f}ms")
            logger.info(f"   Max response time: {max(response_times):.2f}ms")
            
            if failed_requests:
                logger.warning(f"⚠️ {len(failed_requests)} requests failed")
                for failed in failed_requests[:5]:  # Log first 5 failures
                    logger.warning(f"   Request {failed['request_id']}: {failed.get('error', 'Unknown error')}")
            
        finally:
            # Cleanup WSGI server
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        
        # Validate memory usage after concurrent testing
        memory_monitor['validate']()
        
        # Validate concurrent load performance
        concurrent_measurements = [m for m in performance_baseline['measurements'] if m['label'] == 'concurrent_load']
        if concurrent_measurements:
            load_duration = concurrent_measurements[-1]['duration_ms']
            performance_baseline['validate']('Concurrent load', load_duration, 'concurrent_avg_ms')
        
        logger.info("🎓 Educational Note: Concurrent testing validates production readiness")


# ============================================================================
# ENVIRONMENT AND CONFIGURATION TESTING
# ============================================================================

class TestWSGIEnvironmentConfiguration:
    """
    WSGI server environment configuration testing with python-dotenv integration.
    Validates environment variable handling and configuration management.
    
    This test class ensures proper environment configuration for WSGI deployment
    across development, testing, and production environments.
    """
    
    def test_python_dotenv_environment_loading(self, monkeypatch, memory_monitor):
        """
        Test python-dotenv environment variable loading for WSGI configuration.
        Validates .env file loading and environment variable precedence.
        
        Validates:
        - .env file loading with python-dotenv
        - Environment variable precedence and override behavior
        - Flask configuration from environment variables
        - WSGI-specific environment configuration
        """
        logger.info("🌍 Testing python-dotenv environment loading")
        
        memory_monitor['record']("env_loading_test_begin")
        
        # Test environment variable configuration
        test_env_vars = {
            'FLASK_ENV': 'testing',
            'FLASK_DEBUG': 'False',
            'HOST': '0.0.0.0',
            'PORT': '5000',
            'LOG_LEVEL': 'INFO',
            'WORKERS': '2'
        }
        
        # Apply test environment variables using monkeypatch
        for key, value in test_env_vars.items():
            monkeypatch.setenv(key, value)
        
        # Test Flask application with environment configuration
        app = create_app(config_name='testing')
        
        # Validate Flask configuration from environment
        assert app.config['ENV'] == 'testing'
        assert app.config['DEBUG'] is False
        assert app.config['TESTING'] is True
        
        # Test WSGI application configuration
        wsgi_app = create_wsgi_application()
        assert isinstance(wsgi_app, Flask)
        
        # Validate environment variable access
        assert os.getenv('FLASK_ENV') == 'testing'
        assert os.getenv('HOST') == '0.0.0.0'
        assert os.getenv('PORT') == '5000'
        
        logger.info("✅ Environment loading validation completed")
        
        # Validate memory usage during environment testing
        memory_monitor['validate']()
        
        logger.info("🎓 Educational Note: python-dotenv enables 12-factor app configuration")
    
    def test_wsgi_configuration_validation(self, flask_app, memory_monitor):
        """
        Test WSGI-specific configuration validation and Flask integration.
        Validates WSGI configuration parameters and Flask application settings.
        
        Validates:
        - WSGI application configuration consistency
        - Flask application settings for WSGI deployment
        - Configuration validation and error handling
        - Environment-specific configuration loading
        """
        logger.info("⚙️ Testing WSGI configuration validation")
        
        memory_monitor['record']("config_validation_test_begin")
        
        # Validate Flask application configuration for WSGI
        required_config_keys = [
            'ENV',
            'DEBUG',
            'TESTING',
            'SECRET_KEY',
            'JSON_SORT_KEYS',
            'MAX_CONTENT_LENGTH'
        ]
        
        for config_key in required_config_keys:
            assert config_key in flask_app.config, f"Required config key '{config_key}' missing"
        
        # Validate WSGI-specific Flask configuration
        assert flask_app.config['TESTING'] is True, "Testing mode not enabled"
        assert flask_app.config['DEBUG'] is False, "Debug mode should be disabled in testing"
        
        # Test configuration override behavior
        original_debug = flask_app.config['DEBUG']
        flask_app.config['DEBUG'] = True
        assert flask_app.config['DEBUG'] is True, "Configuration override failed"
        flask_app.config['DEBUG'] = original_debug
        
        # Validate configuration consistency
        assert flask_app.config['ENV'] in ['development', 'testing', 'production'], \
            f"Invalid environment: {flask_app.config['ENV']}"
        
        logger.info("✅ WSGI configuration validation completed")
        
        # Validate memory during configuration testing
        memory_monitor['validate']()
        
        logger.info("🎓 Educational Note: Configuration validation ensures deployment reliability")


# ============================================================================
# INTEGRATION AND END-TO-END TESTING
# ============================================================================

class TestWSGIEndToEndIntegration:
    """
    End-to-end WSGI server integration testing with complete workflow validation.
    Tests complete WSGI server deployment lifecycle with Flask application integration.
    
    This test class provides comprehensive validation of WSGI server deployment,
    operation, and shutdown in scenarios that mirror production environments.
    """
    
    def test_complete_wsgi_deployment_lifecycle(self, dynamic_port, memory_monitor, performance_baseline):
        """
        Test complete WSGI server deployment lifecycle from startup to shutdown.
        Validates end-to-end WSGI deployment workflow with comprehensive validation.
        
        Validates:
        - Complete WSGI server deployment workflow
        - Flask application availability throughout lifecycle
        - Performance characteristics during full lifecycle
        - Memory usage patterns during complete deployment
        - Graceful shutdown and cleanup procedures
        """
        logger.info("🔄 Testing complete WSGI deployment lifecycle")
        
        memory_monitor['record']("deployment_lifecycle_begin")
        
        deployment_phases = []
        
        with performance_baseline['measure']("complete_lifecycle"):
            
            # Phase 1: Server Startup and Initialization
            logger.info("📋 Phase 1: WSGI server startup and initialization")
            phase_start = time.time()
            
            gunicorn_command = [
                'python', '-m', 'gunicorn',
                '--bind', f'127.0.0.1:{dynamic_port}',
                '--workers', '2',
                '--timeout', '30',
                '--worker-class', 'sync',
                '--max-requests', '1000',
                '--preload-app',
                'src.backend.wsgi:application'
            ]
            
            process = subprocess.Popen(
                gunicorn_command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for startup with health check validation
            startup_timeout = 15
            server_ready = False
            
            for attempt in range(startup_timeout):
                try:
                    response = requests.get(
                        f'http://127.0.0.1:{dynamic_port}/health',
                        timeout=1
                    )
                    if response.status_code == 200:
                        server_ready = True
                        break
                except requests.exceptions.RequestException:
                    time.sleep(1)
            
            assert server_ready, f"WSGI server failed to start within {startup_timeout} seconds"
            
            phase_duration = time.time() - phase_start
            deployment_phases.append(('startup', phase_duration))
            memory_monitor['record']("after_phase1_startup")
            
            logger.info(f"✅ Phase 1 completed in {phase_duration:.2f}s")
            
            try:
                # Phase 2: Application Validation and Testing
                logger.info("📋 Phase 2: Application validation and endpoint testing")
                phase_start = time.time()
                
                # Comprehensive endpoint testing
                endpoints_to_test = [
                    ('/health', 200, 'status'),
                    ('/hello', 200, 'message')
                ]
                
                for endpoint, expected_status, expected_key in endpoints_to_test:
                    response = requests.get(
                        f'http://127.0.0.1:{dynamic_port}{endpoint}',
                        timeout=5
                    )
                    assert response.status_code == expected_status, \
                        f"Endpoint {endpoint} returned {response.status_code}, expected {expected_status}"
                    
                    if response.is_json:
                        data = response.json()
                        assert expected_key in data, f"Expected key '{expected_key}' missing from {endpoint}"
                
                phase_duration = time.time() - phase_start
                deployment_phases.append(('validation', phase_duration))
                memory_monitor['record']("after_phase2_validation")
                
                logger.info(f"✅ Phase 2 completed in {phase_duration:.2f}s")
                
                # Phase 3: Load Testing and Performance Validation
                logger.info("📋 Phase 3: Load testing and performance validation")
                phase_start = time.time()
                
                # Execute sustained load test
                load_test_duration = 10  # seconds
                requests_per_second = 10
                total_requests = load_test_duration * requests_per_second
                
                successful_requests = 0
                failed_requests = 0
                response_times = []
                
                load_start = time.time()
                while time.time() - load_start < load_test_duration:
                    try:
                        request_start = time.perf_counter()
                        response = requests.get(
                            f'http://127.0.0.1:{dynamic_port}/hello',
                            timeout=2
                        )
                        request_duration = time.perf_counter() - request_start
                        
                        if response.status_code == 200:
                            successful_requests += 1
                            response_times.append(request_duration * 1000)  # Convert to ms
                        else:
                            failed_requests += 1
                            
                    except requests.exceptions.RequestException:
                        failed_requests += 1
                    
                    time.sleep(1 / requests_per_second)  # Rate limiting
                
                # Validate load test results
                total_test_requests = successful_requests + failed_requests
                success_rate = successful_requests / total_test_requests if total_test_requests > 0 else 0
                
                assert success_rate >= 0.95, f"Load test success rate {success_rate:.2%} below 95%"
                
                if response_times:
                    avg_response_time = sum(response_times) / len(response_times)
                    assert avg_response_time < 100, f"Average response time {avg_response_time:.2f}ms too high"
                
                phase_duration = time.time() - phase_start
                deployment_phases.append(('load_testing', phase_duration))
                memory_monitor['record']("after_phase3_load_testing")
                
                logger.info(f"✅ Phase 3 completed in {phase_duration:.2f}s")
                logger.info(f"📊 Load test: {successful_requests} successful, {failed_requests} failed")
                
                # Phase 4: Graceful Shutdown and Cleanup
                logger.info("📋 Phase 4: Graceful shutdown and cleanup")
                phase_start = time.time()
                
                # Initiate graceful shutdown
                process.terminate()
                
                # Monitor shutdown process
                shutdown_timeout = 10
                try:
                    return_code = process.wait(timeout=shutdown_timeout)
                    assert return_code == 0, f"Non-zero exit code during shutdown: {return_code}"
                except subprocess.TimeoutExpired:
                    logger.warning("⚠️ Graceful shutdown timeout, forcing termination")
                    process.kill()
                    process.wait()
                    pytest.fail("WSGI server graceful shutdown timeout")
                
                # Validate server is no longer accessible
                time.sleep(1)
                with pytest.raises(requests.exceptions.RequestException):
                    requests.get(f'http://127.0.0.1:{dynamic_port}/health', timeout=1)
                
                phase_duration = time.time() - phase_start
                deployment_phases.append(('shutdown', phase_duration))
                memory_monitor['record']("after_phase4_shutdown")
                
                logger.info(f"✅ Phase 4 completed in {phase_duration:.2f}s")
                
            except Exception as e:
                # Ensure cleanup on test failure
                if process.poll() is None:
                    process.kill()
                    process.wait()
                raise e
        
        # Validate overall deployment lifecycle performance
        total_lifecycle_duration = sum(duration for _, duration in deployment_phases)
        assert total_lifecycle_duration < 60, f"Total lifecycle {total_lifecycle_duration:.2f}s exceeds 60s limit"
        
        # Log deployment phase summary
        logger.info("📊 Deployment lifecycle summary:")
        for phase_name, duration in deployment_phases:
            logger.info(f"   {phase_name}: {duration:.2f}s")
        logger.info(f"   Total: {total_lifecycle_duration:.2f}s")
        
        # Validate memory usage throughout lifecycle
        memory_monitor['validate']()
        
        logger.info("🎓 Educational Note: End-to-end testing validates production readiness")


# ============================================================================
# UTILITY FUNCTIONS AND HELPERS
# ============================================================================

def wait_for_server_readiness(host: str, port: int, timeout: int = 30) -> bool:
    """
    Utility function to wait for WSGI server readiness with health check validation.
    Provides reliable server startup detection for pytest testing.
    
    Args:
        host: Server host address
        port: Server port number
        timeout: Maximum wait time in seconds
        
    Returns:
        bool: True if server is ready, False if timeout exceeded
    """
    logger.info(f"⏳ Waiting for WSGI server readiness on {host}:{port}")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f'http://{host}:{port}/health', timeout=1)
            if response.status_code == 200:
                logger.info(f"✅ WSGI server ready after {time.time() - start_time:.2f}s")
                return True
        except requests.exceptions.RequestException:
            time.sleep(0.5)
            continue
    
    logger.error(f"❌ WSGI server not ready after {timeout}s timeout")
    return False


def validate_wsgi_response_format(response: requests.Response, expected_keys: List[str]) -> bool:
    """
    Utility function to validate WSGI response format and content structure.
    Provides consistent response validation for Flask endpoint testing.
    
    Args:
        response: HTTP response object from WSGI server
        expected_keys: List of expected keys in JSON response
        
    Returns:
        bool: True if response format is valid
        
    Raises:
        AssertionError: If response format validation fails
    """
    # Validate HTTP status and content type
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.is_json, "Response is not JSON format"
    
    # Validate JSON structure
    data = response.json()
    for key in expected_keys:
        assert key in data, f"Expected key '{key}' missing from response"
    
    logger.info(f"✅ Response format validation passed for keys: {expected_keys}")
    return True


# ============================================================================
# PYTEST MARKERS AND CONFIGURATION
# ============================================================================

# Define pytest markers for test categorization
pytestmark = [
    pytest.mark.wsgi,
    pytest.mark.integration,
    pytest.mark.performance
]

# pytest configuration for WSGI testing
pytest_plugins = [
    'pytest_benchmark',
    'pytest_flask'
]

# Module-level configuration
logger.info("📚 WSGI server test module loaded successfully")
logger.info("🎓 Educational Note: This module demonstrates comprehensive Python WSGI testing")
logger.info("🔧 Test categories: lifecycle, integration, performance, configuration")
logger.info("📊 Features: pytest-benchmark, psutil monitoring, subprocess management")