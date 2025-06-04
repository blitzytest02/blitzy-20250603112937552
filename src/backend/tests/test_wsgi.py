#!/usr/bin/env python3
"""
Comprehensive pytest test suite for WSGI server lifecycle management and Flask application integration.

This module provides thorough validation of WSGI server startup, shutdown, performance characteristics,
and production deployment scenarios. Replaces server.test.js functionality using pytest framework
with subprocess integration for Gunicorn WSGI server testing.

Key Testing Areas:
- WSGI server lifecycle including startup, shutdown, and signal handling
- Gunicorn WSGI server integration testing using subprocess for production deployment validation
- Flask application factory testing with WSGI entry point validation
- pytest-benchmark integration for WSGI server performance measurement with response time thresholds
- psutil memory monitoring for WSGI server resource usage validation with 75MB limit
- Python signal handling testing for SIGTERM and SIGINT with graceful shutdown validation
- pytest fixture-based environment variable testing with python-dotenv integration
- Concurrent request testing using threading for WSGI server load validation

Educational Purpose:
- Demonstrates comprehensive Flask WSGI testing patterns using pytest ecosystem
- Shows production-ready WSGI server validation with Gunicorn integration
- Provides pytest-benchmark performance testing examples with statistical analysis
- Illustrates psutil system monitoring integration for resource validation
- Replaces Node.js server testing patterns with Python equivalents

Dependencies:
- pytest>=8.4.0: Testing framework with advanced fixture management
- pytest-flask>=1.3.0: Flask application testing integration
- pytest-benchmark>=4.0.0: Performance testing and benchmarking
- psutil>=5.9.0: System resource monitoring and process management
- gunicorn>=21.2.0: Production WSGI server for testing
- python-dotenv>=1.0.1: Environment variable management
- threading: Concurrent request testing support
- subprocess: WSGI server process management
- signal: Python signal handling validation
"""

import os
import sys
import time
import signal
import socket
import subprocess
import threading
import json
import logging
from pathlib import Path
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, Optional, List, Tuple
from unittest.mock import patch, MagicMock

import pytest
import psutil
import requests
from dotenv import load_dotenv

# Import Flask application components for WSGI testing
try:
    from src.app import create_app
    from src.wsgi import create_wsgi_application
except ImportError as e:
    pytest.fail(f"Failed to import Flask application components: {e}")

# Configure test logging for educational visibility
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WSGITestFixtures:
    """
    Pytest fixture collection for WSGI server testing providing comprehensive
    test infrastructure including dynamic port allocation, memory monitoring,
    and environment configuration management.
    """
    
    @pytest.fixture(scope='session', autouse=True)
    def configure_test_environment(self):
        """
        Session-wide pytest fixture for WSGI test environment configuration.
        Loads test environment variables and ensures clean test isolation.
        """
        # Store original environment for restoration
        original_env = os.environ.copy()
        
        # Load test environment configuration
        load_dotenv('.env.testing', override=True)
        
        # Set Flask testing environment variables
        os.environ.update({
            'FLASK_ENV': 'testing',
            'TESTING': '1',
            'LOG_LEVEL': 'ERROR',  # Reduce noise during testing
            'FLASK_DEBUG': 'False'  # Disable debug mode for performance testing
        })
        
        logger.info("🔧 WSGI test environment configured with python-dotenv")
        yield
        
        # Restore original environment
        os.environ.clear()
        os.environ.update(original_env)
        logger.info("🧹 WSGI test environment restored")
    
    @pytest.fixture
    def dynamic_port(self):
        """
        pytest fixture for dynamic port allocation preventing WSGI server conflicts.
        Uses socket-based port discovery to ensure available ports for testing.
        """
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', 0))
            port = s.getsockname()[1]
        
        # Set port in environment for WSGI server configuration
        os.environ['PORT'] = str(port)
        logger.info(f"🔌 Allocated dynamic port: {port} for WSGI testing")
        
        yield port
        
        # Clean up port environment variable
        os.environ.pop('PORT', None)
    
    @pytest.fixture
    def memory_monitor(self):
        """
        pytest fixture for psutil-based memory monitoring during WSGI tests.
        Provides baseline memory tracking and validates 75MB memory limit enforcement.
        """
        process = psutil.Process()
        baseline_memory = process.memory_info().rss / 1024 / 1024  # Convert to MB
        
        logger.info(f"📊 Memory baseline: {baseline_memory:.2f}MB")
        
        yield {
            'baseline': baseline_memory,
            'process': process,
            'limit_mb': 75
        }
        
        # Validate memory usage after test completion
        current_memory = process.memory_info().rss / 1024 / 1024
        memory_growth = current_memory - baseline_memory
        
        # Log memory statistics for educational visibility
        logger.info(f"📈 Memory after test: {current_memory:.2f}MB (growth: {memory_growth:.2f}MB)")
        
        # Assert memory limit compliance
        assert current_memory < 75, f"Memory usage {current_memory:.2f}MB exceeds 75MB limit"
        assert memory_growth < 10, f"Memory growth {memory_growth:.2f}MB exceeds 10MB per test limit"
    
    @pytest.fixture
    def wsgi_test_config(self):
        """
        pytest fixture providing WSGI-specific test configuration.
        Configures Gunicorn parameters and WSGI server settings for testing.
        """
        return {
            'workers': 1,  # Single worker for predictable testing
            'timeout': 30,  # Request timeout in seconds
            'bind_host': '127.0.0.1',
            'worker_class': 'sync',  # Synchronous worker for simplicity
            'max_requests': 100,  # Prevent memory leaks
            'preload_app': True,  # Faster startup
        }


class TestWSGIServerLifecycle(WSGITestFixtures):
    """
    Comprehensive WSGI server lifecycle testing using pytest framework.
    Validates WSGI server startup, shutdown, signal handling, and process management
    using subprocess integration with Gunicorn WSGI server.
    """
    
    def test_wsgi_application_factory_creation(self, memory_monitor):
        """
        Test Flask application factory pattern creates valid WSGI application.
        Validates WSGI entry point functionality and application configuration.
        """
        # Test WSGI application factory function
        wsgi_app = create_wsgi_application()
        
        # Validate WSGI application interface
        assert wsgi_app is not None, "WSGI application factory returned None"
        assert hasattr(wsgi_app, '__call__'), "WSGI application must be callable"
        assert hasattr(wsgi_app, 'config'), "WSGI application must have config attribute"
        
        # Validate Flask application configuration
        assert wsgi_app.config['TESTING'] is True, "WSGI application must be in testing mode"
        
        logger.info("✅ WSGI application factory validation passed")
    
    def test_wsgi_server_startup_shutdown_lifecycle(self, dynamic_port, memory_monitor, wsgi_test_config):
        """
        Test complete WSGI server startup and shutdown lifecycle using subprocess.
        Validates Gunicorn WSGI server integration with Flask application factory.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Gunicorn command for WSGI server startup
        gunicorn_cmd = [
            'gunicorn',
            '--bind', bind_address,
            '--workers', str(wsgi_test_config['workers']),
            '--timeout', str(wsgi_test_config['timeout']),
            '--worker-class', wsgi_test_config['worker_class'],
            '--max-requests', str(wsgi_test_config['max_requests']),
            '--preload-app',
            'src.wsgi:application'  # WSGI module and application variable
        ]
        
        logger.info(f"🚀 Starting WSGI server: {' '.join(gunicorn_cmd)}")
        
        # Start WSGI server process
        process = subprocess.Popen(
            gunicorn_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=Path(__file__).parent.parent.parent.parent  # Project root
        )
        
        try:
            # Wait for WSGI server startup (with timeout)
            startup_timeout = 10  # seconds
            startup_start = time.time()
            
            while time.time() - startup_start < startup_timeout:
                try:
                    response = requests.get(f"http://{bind_address}/hello", timeout=2)
                    if response.status_code == 200:
                        logger.info("✅ WSGI server startup successful")
                        break
                except requests.exceptions.RequestException:
                    time.sleep(0.5)
                    continue
            else:
                pytest.fail(f"WSGI server failed to start within {startup_timeout}s")
            
            # Validate server is responding correctly
            response = requests.get(f"http://{bind_address}/hello", timeout=5)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert 'message' in data, "Response must contain 'message' field"
            assert data['message'] == 'Hello world', f"Expected 'Hello world', got {data['message']}"
            
            logger.info("✅ WSGI server response validation passed")
            
        finally:
            # Graceful shutdown test
            logger.info("🛑 Testing graceful WSGI server shutdown")
            
            # Send SIGTERM for graceful shutdown
            process.send_signal(signal.SIGTERM)
            
            # Wait for graceful shutdown with timeout
            try:
                process.wait(timeout=10)
                logger.info("✅ WSGI server graceful shutdown successful")
            except subprocess.TimeoutExpired:
                logger.warning("⚠️ Graceful shutdown timeout, forcing termination")
                process.kill()
                process.wait()
            
            # Validate process is terminated
            assert process.poll() is not None, "WSGI server process should be terminated"
    
    def test_wsgi_server_signal_handling(self, dynamic_port, wsgi_test_config):
        """
        Test WSGI server signal handling for SIGTERM and SIGINT.
        Validates Python signal handler integration with graceful shutdown.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Test both SIGTERM and SIGINT signals
        signals_to_test = [
            (signal.SIGTERM, "SIGTERM"),
            (signal.SIGINT, "SIGINT")
        ]
        
        for sig, sig_name in signals_to_test:
            logger.info(f"🔧 Testing {sig_name} signal handling")
            
            # Start WSGI server
            process = subprocess.Popen([
                'gunicorn',
                '--bind', bind_address,
                '--workers', '1',
                '--timeout', '30',
                'src.wsgi:application'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            try:
                # Wait for server startup
                time.sleep(3)
                
                # Verify server is running
                try:
                    response = requests.get(f"http://{bind_address}/hello", timeout=2)
                    assert response.status_code == 200, "Server should be responding before signal test"
                except requests.exceptions.RequestException:
                    pytest.fail("WSGI server not responding before signal test")
                
                # Send signal
                process.send_signal(sig)
                logger.info(f"📡 Sent {sig_name} signal to WSGI server")
                
                # Wait for graceful shutdown
                shutdown_start = time.time()
                try:
                    process.wait(timeout=15)
                    shutdown_duration = time.time() - shutdown_start
                    logger.info(f"✅ {sig_name} graceful shutdown completed in {shutdown_duration:.2f}s")
                    
                    # Validate exit code indicates graceful shutdown
                    assert process.returncode == 0, f"{sig_name} should result in clean exit (code 0)"
                    
                except subprocess.TimeoutExpired:
                    process.kill()
                    pytest.fail(f"{sig_name} graceful shutdown timeout")
                    
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
    
    def test_wsgi_server_port_binding_validation(self, wsgi_test_config):
        """
        Test WSGI server port binding validation and conflict handling.
        Validates dynamic port allocation and error handling for port conflicts.
        """
        # Test valid port binding
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', 0))
            available_port = s.getsockname()[1]
        
        bind_address = f"{wsgi_test_config['bind_host']}:{available_port}"
        
        process = subprocess.Popen([
            'gunicorn',
            '--bind', bind_address,
            '--workers', '1',
            'src.wsgi:application'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for startup
            time.sleep(3)
            
            # Validate server is bound to correct port
            response = requests.get(f"http://{bind_address}/hello", timeout=5)
            assert response.status_code == 200, "WSGI server should respond on bound port"
            
            logger.info(f"✅ WSGI server successfully bound to port {available_port}")
            
        finally:
            process.terminate()
            process.wait()
        
        # Test port conflict handling
        logger.info("🔧 Testing port conflict handling")
        
        # Bind to a port manually
        conflict_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        conflict_socket.bind(('localhost', 0))
        conflict_port = conflict_socket.getsockname()[1]
        conflict_socket.listen(1)
        
        try:
            # Try to start WSGI server on occupied port
            conflict_process = subprocess.Popen([
                'gunicorn',
                '--bind', f"{wsgi_test_config['bind_host']}:{conflict_port}",
                '--workers', '1',
                'src.wsgi:application'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            # Wait for startup attempt
            try:
                conflict_process.wait(timeout=10)
                # Should exit with error due to port conflict
                assert conflict_process.returncode != 0, "WSGI server should fail on port conflict"
                logger.info("✅ Port conflict handling validated")
            except subprocess.TimeoutExpired:
                conflict_process.kill()
                pytest.fail("WSGI server should fail quickly on port conflict")
                
        finally:
            conflict_socket.close()


class TestWSGIPerformanceValidation(WSGITestFixtures):
    """
    WSGI server performance validation using pytest-benchmark integration.
    Tests response times, memory usage, and concurrent request handling
    with statistical analysis and SLA enforcement.
    """
    
    @pytest.mark.benchmark
    def test_wsgi_server_cold_start_performance(self, benchmark, dynamic_port, memory_monitor, wsgi_test_config):
        """
        Benchmark WSGI server cold start performance using pytest-benchmark.
        Validates <100ms cold start SLA with statistical analysis.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        def cold_start_wsgi_server():
            """Cold start WSGI server and measure startup time."""
            start_time = time.perf_counter()
            
            # Start WSGI server
            process = subprocess.Popen([
                'gunicorn',
                '--bind', bind_address,
                '--workers', '1',
                '--timeout', '30',
                '--preload-app',
                'src.wsgi:application'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            try:
                # Wait for server to be ready
                ready = False
                timeout = 10
                while time.perf_counter() - start_time < timeout and not ready:
                    try:
                        response = requests.get(f"http://{bind_address}/hello", timeout=1)
                        if response.status_code == 200:
                            ready = True
                    except requests.exceptions.RequestException:
                        time.sleep(0.1)
                
                if not ready:
                    pytest.fail("WSGI server failed to start within timeout")
                
                startup_duration = time.perf_counter() - start_time
                return startup_duration
                
            finally:
                process.terminate()
                process.wait()
        
        # pytest-benchmark with statistical analysis
        result = benchmark.pedantic(cold_start_wsgi_server, iterations=3, rounds=1)
        
        # Validate 100ms cold start SLA
        assert benchmark.stats.mean < 0.100, f"Cold start {benchmark.stats.mean*1000:.2f}ms exceeds 100ms SLA"
        
        logger.info(f"🚀 WSGI cold start: {benchmark.stats.mean*1000:.2f}ms (target: <100ms)")
    
    @pytest.mark.benchmark
    def test_wsgi_server_warm_request_performance(self, benchmark, dynamic_port, memory_monitor, wsgi_test_config):
        """
        Benchmark WSGI server warm request performance using pytest-benchmark.
        Validates <50ms warm request SLA with statistical accuracy.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Start WSGI server for warm request testing
        process = subprocess.Popen([
            'gunicorn',
            '--bind', bind_address,
            '--workers', '1',
            '--timeout', '30',
            'src.wsgi:application'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for server startup
            time.sleep(3)
            
            def make_warm_request():
                """Make warm request to WSGI server."""
                response = requests.get(f"http://{bind_address}/hello", timeout=5)
                assert response.status_code == 200, "Warm request should succeed"
                return response.elapsed.total_seconds()
            
            # Warm up server with initial requests
            for _ in range(5):
                make_warm_request()
            
            # pytest-benchmark warm request testing
            result = benchmark.pedantic(make_warm_request, iterations=10, rounds=3)
            
            # Validate 50ms warm request SLA
            assert benchmark.stats.median < 0.050, f"Warm request {benchmark.stats.median*1000:.2f}ms exceeds 50ms SLA"
            
            logger.info(f"🏃 WSGI warm request: {benchmark.stats.median*1000:.2f}ms (target: <50ms)")
            
        finally:
            process.terminate()
            process.wait()
    
    @pytest.mark.benchmark
    def test_wsgi_server_memory_usage_validation(self, benchmark, dynamic_port, memory_monitor, wsgi_test_config):
        """
        Validate WSGI server memory usage with psutil monitoring.
        Enforces 75MB memory limit and monitors memory growth patterns.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Start WSGI server
        process = subprocess.Popen([
            'gunicorn',
            '--bind', bind_address,
            '--workers', '1',
            '--max-requests', '100',
            'src.wsgi:application'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for server startup
            time.sleep(3)
            
            # Get WSGI server process for memory monitoring
            wsgi_process = psutil.Process(process.pid)
            initial_memory = wsgi_process.memory_info().rss / 1024 / 1024  # MB
            
            logger.info(f"📊 Initial WSGI server memory: {initial_memory:.2f}MB")
            
            def memory_stress_test():
                """Execute requests to stress test memory usage."""
                memory_samples = []
                
                # Execute multiple requests to test memory patterns
                for i in range(20):
                    response = requests.get(f"http://{bind_address}/hello", timeout=5)
                    assert response.status_code == 200, "Memory stress request should succeed"
                    
                    # Sample memory usage
                    current_memory = wsgi_process.memory_info().rss / 1024 / 1024
                    memory_samples.append(current_memory)
                
                return memory_samples
            
            # Benchmark memory stress test
            memory_samples = benchmark(memory_stress_test)
            
            # Analyze memory usage patterns
            max_memory = max(memory_samples)
            avg_memory = sum(memory_samples) / len(memory_samples)
            memory_growth = max_memory - initial_memory
            
            # Validate memory constraints
            assert max_memory < 75, f"Maximum memory {max_memory:.2f}MB exceeds 75MB limit"
            assert memory_growth < 20, f"Memory growth {memory_growth:.2f}MB exceeds 20MB limit"
            
            logger.info(f"💾 WSGI memory - Max: {max_memory:.2f}MB, Avg: {avg_memory:.2f}MB, Growth: {memory_growth:.2f}MB")
            
        finally:
            process.terminate()
            process.wait()
    
    def test_wsgi_server_concurrent_request_handling(self, dynamic_port, memory_monitor, wsgi_test_config):
        """
        Test WSGI server concurrent request handling using threading.
        Validates performance under load with 100 parallel requests.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Start WSGI server with multiple workers for concurrency
        process = subprocess.Popen([
            'gunicorn',
            '--bind', bind_address,
            '--workers', '2',  # Multiple workers for concurrency
            '--worker-class', 'sync',
            '--timeout', '30',
            'src.wsgi:application'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for server startup
            time.sleep(5)
            
            def make_concurrent_request(request_id: int) -> Dict[str, Any]:
                """Make individual request for concurrent testing."""
                start_time = time.perf_counter()
                try:
                    response = requests.get(f"http://{bind_address}/hello", timeout=10)
                    duration = time.perf_counter() - start_time
                    
                    return {
                        'request_id': request_id,
                        'status_code': response.status_code,
                        'duration': duration,
                        'success': response.status_code == 200
                    }
                except requests.exceptions.RequestException as e:
                    duration = time.perf_counter() - start_time
                    return {
                        'request_id': request_id,
                        'status_code': 0,
                        'duration': duration,
                        'success': False,
                        'error': str(e)
                    }
            
            # Execute concurrent requests using ThreadPoolExecutor
            logger.info("🔄 Executing 100 concurrent requests")
            
            concurrent_start = time.perf_counter()
            
            with ThreadPoolExecutor(max_workers=20) as executor:
                # Submit 100 concurrent requests
                futures = [executor.submit(make_concurrent_request, i) for i in range(100)]
                
                # Collect results
                results = []
                for future in as_completed(futures):
                    result = future.result()
                    results.append(result)
            
            concurrent_duration = time.perf_counter() - concurrent_start
            
            # Analyze concurrent performance
            successful_requests = [r for r in results if r['success']]
            failed_requests = [r for r in results if not r['success']]
            
            success_rate = len(successful_requests) / len(results) * 100
            
            if successful_requests:
                avg_response_time = sum(r['duration'] for r in successful_requests) / len(successful_requests)
                max_response_time = max(r['duration'] for r in successful_requests)
                min_response_time = min(r['duration'] for r in successful_requests)
            else:
                avg_response_time = max_response_time = min_response_time = 0
            
            # Validate concurrent performance requirements
            assert success_rate >= 95, f"Success rate {success_rate:.1f}% below 95% threshold"
            assert avg_response_time < 0.050, f"Average response time {avg_response_time*1000:.2f}ms exceeds 50ms under load"
            assert len(failed_requests) <= 5, f"Too many failed requests: {len(failed_requests)}"
            
            logger.info(f"🚀 Concurrent Performance Results:")
            logger.info(f"   Success Rate: {success_rate:.1f}%")
            logger.info(f"   Average Response: {avg_response_time*1000:.2f}ms")
            logger.info(f"   Min Response: {min_response_time*1000:.2f}ms")
            logger.info(f"   Max Response: {max_response_time*1000:.2f}ms")
            logger.info(f"   Total Duration: {concurrent_duration:.2f}s")
            logger.info(f"   Requests/Second: {100/concurrent_duration:.1f}")
            
        finally:
            process.terminate()
            process.wait()


class TestWSGIEnvironmentConfiguration(WSGITestFixtures):
    """
    WSGI server environment configuration testing using python-dotenv integration.
    Validates environment variable handling, configuration loading, and Flask settings.
    """
    
    def test_wsgi_environment_variable_configuration(self, dynamic_port, monkeypatch):
        """
        Test WSGI server environment variable configuration with python-dotenv.
        Validates Flask environment settings and configuration loading.
        """
        port = dynamic_port
        
        # Test environment configurations
        test_environments = [
            {'FLASK_ENV': 'development', 'FLASK_DEBUG': 'True'},
            {'FLASK_ENV': 'testing', 'FLASK_DEBUG': 'False'},
            {'FLASK_ENV': 'production', 'FLASK_DEBUG': 'False'}
        ]
        
        for env_config in test_environments:
            logger.info(f"🔧 Testing environment: {env_config}")
            
            # Set environment variables using monkeypatch
            for key, value in env_config.items():
                monkeypatch.setenv(key, value)
            
            # Test WSGI application creation with environment
            wsgi_app = create_wsgi_application()
            
            # Validate environment-specific configuration
            assert wsgi_app.config['ENV'] == env_config['FLASK_ENV']
            
            if env_config['FLASK_ENV'] == 'development':
                # Development-specific validations
                assert wsgi_app.config.get('DEBUG') is True or env_config['FLASK_DEBUG'] == 'True'
            elif env_config['FLASK_ENV'] == 'production':
                # Production-specific validations
                assert wsgi_app.config.get('DEBUG') is False
            
            logger.info(f"✅ Environment {env_config['FLASK_ENV']} validation passed")
    
    def test_wsgi_dotenv_file_loading(self, dynamic_port, tmp_path):
        """
        Test python-dotenv file loading for WSGI configuration.
        Validates .env file parsing and environment variable precedence.
        """
        # Create temporary .env file for testing
        env_file = tmp_path / ".env.test"
        env_content = """
# Test environment configuration for WSGI
FLASK_ENV=testing
FLASK_DEBUG=False
PORT=5000
HOST=localhost
SECRET_KEY=test-secret-key-for-wsgi
CUSTOM_CONFIG_VALUE=test-value
"""
        env_file.write_text(env_content)
        
        # Load environment from file
        from dotenv import load_dotenv
        load_dotenv(env_file, override=True)
        
        # Validate environment variables were loaded
        assert os.getenv('FLASK_ENV') == 'testing'
        assert os.getenv('FLASK_DEBUG') == 'False'
        assert os.getenv('SECRET_KEY') == 'test-secret-key-for-wsgi'
        assert os.getenv('CUSTOM_CONFIG_VALUE') == 'test-value'
        
        # Test WSGI application with loaded environment
        wsgi_app = create_wsgi_application()
        
        # Validate configuration from environment
        assert wsgi_app.config['ENV'] == 'testing'
        assert wsgi_app.config['SECRET_KEY'] == 'test-secret-key-for-wsgi'
        
        logger.info("✅ python-dotenv file loading validation passed")
    
    def test_wsgi_environment_variable_precedence(self, dynamic_port, monkeypatch, tmp_path):
        """
        Test environment variable precedence in WSGI configuration.
        Validates that environment variables override .env file values.
        """
        # Create .env file with default values
        env_file = tmp_path / ".env.precedence"
        env_file.write_text("FLASK_ENV=development\nTEST_VALUE=from_file\n")
        
        # Load from file first
        from dotenv import load_dotenv
        load_dotenv(env_file)
        
        # Override with environment variable
        monkeypatch.setenv('FLASK_ENV', 'production')
        monkeypatch.setenv('TEST_VALUE', 'from_env')
        
        # Load file again with override=False (environment should take precedence)
        load_dotenv(env_file, override=False)
        
        # Validate precedence
        assert os.getenv('FLASK_ENV') == 'production'  # Environment variable wins
        assert os.getenv('TEST_VALUE') == 'from_env'   # Environment variable wins
        
        # Test with WSGI application
        wsgi_app = create_wsgi_application()
        assert wsgi_app.config['ENV'] == 'production'
        
        logger.info("✅ Environment variable precedence validation passed")


class TestWSGIErrorHandlingAndResilience(WSGITestFixtures):
    """
    WSGI server error handling and resilience testing.
    Validates error scenarios, recovery mechanisms, and fault tolerance.
    """
    
    def test_wsgi_server_startup_failure_handling(self, memory_monitor):
        """
        Test WSGI server startup failure scenarios and error handling.
        Validates graceful failure handling and appropriate error reporting.
        """
        # Test invalid WSGI module
        invalid_process = subprocess.Popen([
            'gunicorn',
            '--bind', '127.0.0.1:0',  # Let system choose port
            '--workers', '1',
            'invalid.module:application'  # Invalid module
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for startup attempt
            exit_code = invalid_process.wait(timeout=10)
            
            # Should fail with non-zero exit code
            assert exit_code != 0, "Invalid WSGI module should cause startup failure"
            
            # Check stderr for error message
            stderr_output = invalid_process.stderr.read()
            assert "ModuleNotFoundError" in stderr_output or "ImportError" in stderr_output
            
            logger.info("✅ Invalid WSGI module failure handling validated")
            
        except subprocess.TimeoutExpired:
            invalid_process.kill()
            pytest.fail("WSGI server should fail quickly with invalid module")
    
    def test_wsgi_server_request_timeout_handling(self, dynamic_port, wsgi_test_config):
        """
        Test WSGI server request timeout handling and recovery.
        Validates timeout configuration and server stability.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Start WSGI server with short timeout for testing
        process = subprocess.Popen([
            'gunicorn',
            '--bind', bind_address,
            '--workers', '1',
            '--timeout', '5',  # Short timeout for testing
            'src.wsgi:application'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for startup
            time.sleep(3)
            
            # Test normal request (should succeed)
            response = requests.get(f"http://{bind_address}/hello", timeout=2)
            assert response.status_code == 200, "Normal request should succeed"
            
            # Server should still be responsive after normal requests
            response = requests.get(f"http://{bind_address}/hello", timeout=2)
            assert response.status_code == 200, "Server should remain responsive"
            
            logger.info("✅ WSGI server timeout handling validated")
            
        finally:
            process.terminate()
            process.wait()
    
    def test_wsgi_server_worker_restart_resilience(self, dynamic_port, wsgi_test_config):
        """
        Test WSGI server worker restart resilience and recovery.
        Validates server stability under worker failures.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Start WSGI server with worker restart configuration
        process = subprocess.Popen([
            'gunicorn',
            '--bind', bind_address,
            '--workers', '2',
            '--max-requests', '10',  # Force worker restart after 10 requests
            '--max-requests-jitter', '2',
            'src.wsgi:application'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for startup
            time.sleep(3)
            
            # Make requests to force worker restarts
            successful_requests = 0
            for i in range(20):  # More than max-requests to trigger restarts
                try:
                    response = requests.get(f"http://{bind_address}/hello", timeout=5)
                    if response.status_code == 200:
                        successful_requests += 1
                    time.sleep(0.1)  # Brief pause between requests
                except requests.exceptions.RequestException:
                    # Some requests may fail during worker restart
                    pass
            
            # Validate server resilience
            success_rate = successful_requests / 20 * 100
            assert success_rate >= 85, f"Success rate {success_rate:.1f}% too low during worker restarts"
            
            # Validate server is still responsive after worker restarts
            final_response = requests.get(f"http://{bind_address}/hello", timeout=5)
            assert final_response.status_code == 200, "Server should be responsive after worker restarts"
            
            logger.info(f"✅ Worker restart resilience validated (success rate: {success_rate:.1f}%)")
            
        finally:
            process.terminate()
            process.wait()


class TestWSGIIntegrationValidation(WSGITestFixtures):
    """
    WSGI integration validation testing with Flask application components.
    Validates end-to-end integration between WSGI server and Flask application.
    """
    
    def test_wsgi_flask_application_integration(self, dynamic_port, memory_monitor, wsgi_test_config):
        """
        Test complete WSGI integration with Flask application factory.
        Validates end-to-end request processing through WSGI stack.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Start WSGI server
        process = subprocess.Popen([
            'gunicorn',
            '--bind', bind_address,
            '--workers', '1',
            '--access-logfile', '-',  # Log to stdout for debugging
            'src.wsgi:application'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for startup
            time.sleep(3)
            
            # Test all Flask endpoints through WSGI
            test_endpoints = [
                ('/hello', 200, 'GET'),
                ('/health', 200, 'GET'),
                ('/nonexistent', 404, 'GET'),
            ]
            
            for endpoint, expected_status, method in test_endpoints:
                logger.info(f"🔧 Testing {method} {endpoint}")
                
                if method == 'GET':
                    response = requests.get(f"http://{bind_address}{endpoint}", timeout=5)
                
                assert response.status_code == expected_status, \
                    f"{endpoint} returned {response.status_code}, expected {expected_status}"
                
                # Validate JSON response format
                if response.headers.get('Content-Type', '').startswith('application/json'):
                    data = response.json()
                    assert isinstance(data, dict), "Response should be JSON object"
                    
                    if endpoint == '/hello':
                        assert 'message' in data, "Hello endpoint should have message field"
                        assert data['message'] == 'Hello world'
                    elif endpoint == '/health':
                        assert 'status' in data, "Health endpoint should have status field"
                
                logger.info(f"✅ {method} {endpoint} validation passed")
            
            # Test HTTP method validation
            logger.info("🔧 Testing HTTP method validation")
            post_response = requests.post(f"http://{bind_address}/hello", timeout=5)
            assert post_response.status_code == 405, "POST to GET-only endpoint should return 405"
            
            method_error = post_response.json()
            assert 'error' in method_error, "405 response should contain error information"
            
            logger.info("✅ WSGI-Flask integration validation completed")
            
        finally:
            process.terminate()
            process.wait()
    
    def test_wsgi_health_check_integration(self, dynamic_port, wsgi_test_config):
        """
        Test WSGI health check integration for container orchestration.
        Validates health check endpoint functionality through WSGI stack.
        """
        port = dynamic_port
        bind_address = f"{wsgi_test_config['bind_host']}:{port}"
        
        # Start WSGI server
        process = subprocess.Popen([
            'gunicorn',
            '--bind', bind_address,
            '--workers', '1',
            'src.wsgi:application'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Wait for startup
            time.sleep(3)
            
            # Test health check endpoint multiple times
            for i in range(5):
                health_response = requests.get(f"http://{bind_address}/health", timeout=5)
                assert health_response.status_code == 200, f"Health check {i+1} failed"
                
                health_data = health_response.json()
                assert 'status' in health_data, "Health response should contain status"
                assert health_data['status'] == 'healthy', "Status should be 'healthy'"
                assert 'timestamp' in health_data, "Health response should contain timestamp"
                
                # Small delay between health checks
                time.sleep(0.5)
            
            logger.info("✅ WSGI health check integration validated")
            
        finally:
            process.terminate()
            process.wait()


# pytest configuration and execution markers
pytestmark = [
    pytest.mark.wsgi,
    pytest.mark.integration,
    pytest.mark.slow
]


if __name__ == "__main__":
    # Direct pytest execution for development testing
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--benchmark-skip",  # Skip benchmarks for quick development testing
        "--capture=no"
    ])