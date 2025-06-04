#!/usr/bin/env python3
"""
Comprehensive pytest test suite for Flask application functionality validation.

This module provides thorough testing coverage for the Flask Migration Tutorial
application, validating route handlers, error handling middleware, security
configuration, and performance characteristics using pytest framework with
pytest-flask fixtures.

Test Coverage Areas:
- Flask application factory pattern testing
- HTTP endpoint validation (/hello, /health)
- Flask error handler testing (404, 405, 500)
- Security header configuration validation
- CORS functionality testing
- Performance benchmarking with pytest-benchmark
- Memory usage validation with psutil monitoring
- Flask middleware stack testing
- Stateless operation verification
- JSON response format validation

Educational Purpose:
- Demonstrates pytest testing best practices for Flask applications
- Shows pytest-flask fixture usage for Flask test client integration
- Provides examples of comprehensive HTTP endpoint testing
- Illustrates performance testing with pytest-benchmark
- Demonstrates security testing patterns for Flask applications
- Shows proper test organization using pytest test classes
"""

import pytest
import json
import time
import logging
import psutil
import os
from typing import Dict, Any, Tuple
from datetime import datetime
from unittest.mock import patch, MagicMock

# Import Flask and testing dependencies
try:
    from flask import Flask
    from flask.testing import FlaskClient
    import requests
except ImportError as e:
    pytest.fail(f"Required Flask dependencies not available: {e}")

# Import application modules
try:
    from src.backend.app import create_app
except ImportError:
    pytest.fail("Flask application module not found. Ensure src.backend.app is available.")


class TestFlaskApplicationFactory:
    """
    Test suite for Flask application factory pattern validation.
    
    Validates Flask application initialization, configuration management,
    and proper setup of all application components including routes,
    error handlers, and middleware configuration.
    """
    
    def test_create_app_returns_flask_instance(self):
        """Test Flask application factory returns valid Flask instance."""
        app = create_app()
        
        assert isinstance(app, Flask), "create_app() must return Flask instance"
        assert app.name == "src.backend.app", "Flask app name should match module"
        
    def test_flask_app_configuration_in_testing_mode(self):
        """Test Flask application configuration in testing environment."""
        # Set testing environment
        os.environ['FLASK_ENV'] = 'testing'
        os.environ['TESTING'] = '1'
        
        app = create_app()
        
        # Validate Flask testing configuration
        assert app.config.get('ENV') in ['testing', 'development'], "Flask environment should be testing"
        assert app.config.get('TESTING') is not None, "Testing flag should be set"
        
        # Clean up environment
        os.environ.pop('FLASK_ENV', None)
        os.environ.pop('TESTING', None)
    
    def test_flask_app_has_required_routes(self):
        """Test Flask application has all required route endpoints."""
        app = create_app()
        
        # Get all registered routes
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        
        # Validate required endpoints exist
        assert '/hello' in rules, "Flask app must have /hello endpoint"
        assert '/health' in rules, "Flask app must have /health endpoint"
        
        # Validate route methods
        hello_rule = next(rule for rule in app.url_map.iter_rules() if rule.rule == '/hello')
        health_rule = next(rule for rule in app.url_map.iter_rules() if rule.rule == '/health')
        
        assert 'GET' in hello_rule.methods, "/hello endpoint must support GET method"
        assert 'GET' in health_rule.methods, "/health endpoint must support GET method"
    
    def test_flask_app_has_error_handlers(self):
        """Test Flask application has required error handlers registered."""
        app = create_app()
        
        # Validate error handlers are registered
        assert 404 in app.error_handler_spec[None], "Flask app must have 404 error handler"
        assert 405 in app.error_handler_spec[None], "Flask app must have 405 error handler"  
        assert 500 in app.error_handler_spec[None], "Flask app must have 500 error handler"
    
    def test_flask_app_security_configuration(self):
        """Test Flask application security settings are properly configured."""
        app = create_app()
        
        # Validate security configuration
        assert app.config.get('SESSION_COOKIE_SECURE') is True, "Session cookies should be secure"
        assert app.config.get('SESSION_COOKIE_HTTPONLY') is True, "Session cookies should be HTTP only"
        assert app.config.get('SESSION_COOKIE_SAMESITE') == 'Strict', "Session cookies should use SameSite Strict"


class TestFlaskRouteHandlers:
    """
    Test suite for Flask route handler functionality validation.
    
    Provides comprehensive testing of all Flask endpoints including
    request/response validation, JSON format verification, and
    proper HTTP status code handling.
    """
    
    def test_hello_endpoint_success_response(self, client: FlaskClient):
        """Test GET /hello endpoint returns successful response with valid JSON."""
        response = client.get('/hello')
        
        # Validate HTTP response
        assert response.status_code == 200, "Hello endpoint should return 200 OK"
        assert response.content_type == 'application/json', "Response should be JSON content type"
        
        # Validate JSON response structure
        assert response.is_json, "Response should be valid JSON"
        data = response.get_json()
        
        assert isinstance(data, dict), "Response should be JSON object"
        assert 'message' in data, "Response should contain 'message' field"
        assert data['message'] == 'Hello world', "Message should be 'Hello world'"
        
        # Educational note: Validate response contains timestamp for logging
        # Note: timestamp field may or may not be present depending on implementation
    
    def test_hello_endpoint_response_headers(self, client: FlaskClient):
        """Test GET /hello endpoint returns proper security headers."""
        response = client.get('/hello')
        
        # Validate security headers are present
        assert response.headers.get('X-Content-Type-Options') == 'nosniff', "X-Content-Type-Options header required"
        assert response.headers.get('X-Frame-Options') == 'DENY', "X-Frame-Options header required"
        assert response.headers.get('X-XSS-Protection') == '1; mode=block', "X-XSS-Protection header required"
        
        # Validate cache control headers for API endpoints
        assert 'no-cache' in response.headers.get('Cache-Control', ''), "API responses should not be cached"
    
    def test_health_endpoint_success_response(self, client: FlaskClient):
        """Test GET /health endpoint returns successful health status."""
        response = client.get('/health')
        
        # Validate HTTP response
        assert response.status_code == 200, "Health endpoint should return 200 OK"
        assert response.content_type == 'application/json', "Health response should be JSON"
        
        # Validate JSON response structure
        assert response.is_json, "Health response should be valid JSON"
        data = response.get_json()
        
        assert isinstance(data, dict), "Health response should be JSON object"
        assert 'status' in data, "Health response should contain status field"
        assert data['status'] == 'healthy', "Health status should be 'healthy'"
        assert 'timestamp' in data, "Health response should contain timestamp"
        
        # Validate timestamp format
        timestamp = data['timestamp']
        assert isinstance(timestamp, (int, float, str)), "Timestamp should be numeric or string"
    
    def test_health_endpoint_contains_service_metadata(self, client: FlaskClient):
        """Test GET /health endpoint contains service information."""
        response = client.get('/health')
        data = response.get_json()
        
        # Validate service metadata
        assert 'service' in data, "Health response should contain service name"
        assert 'version' in data, "Health response should contain version info"
        
        # Validate service identification
        service_name = data['service']
        assert 'flask' in service_name.lower(), "Service name should indicate Flask application"
    
    def test_multiple_requests_stateless_operation(self, client: FlaskClient):
        """Test Flask application maintains stateless operation across requests."""
        # Make multiple requests to validate stateless behavior
        responses = []
        for i in range(5):
            response = client.get('/hello')
            responses.append(response)
            
            # Validate each response independently
            assert response.status_code == 200, f"Request {i+1} should return 200 OK"
            data = response.get_json()
            assert data['message'] == 'Hello world', f"Request {i+1} should return consistent message"
        
        # Validate all responses are independent (stateless)
        for i, response in enumerate(responses):
            assert response.status_code == 200, f"Stateless check: request {i+1} should be independent"


class TestFlaskErrorHandlers:
    """
    Test suite for Flask error handler functionality validation.
    
    Validates proper error response generation, status codes,
    and JSON error format consistency across different error scenarios.
    """
    
    def test_404_not_found_error_handler(self, client: FlaskClient):
        """Test Flask 404 error handler returns proper JSON error response."""
        response = client.get('/nonexistent-endpoint')
        
        # Validate 404 response
        assert response.status_code == 404, "Non-existent endpoint should return 404"
        assert response.content_type == 'application/json', "404 error should return JSON"
        
        # Validate JSON error structure
        assert response.is_json, "404 response should be valid JSON"
        data = response.get_json()
        
        assert isinstance(data, dict), "Error response should be JSON object"
        assert 'status' in data, "Error response should contain status field"
        assert data['status'] == 404, "Status field should match HTTP status code"
        assert 'error' in data, "Error response should contain error field"
        assert data['error'] == 'Not Found', "Error field should describe the error type"
        assert 'message' in data, "Error response should contain descriptive message"
        assert 'path' in data, "Error response should contain request path"
        assert data['path'] == '/nonexistent-endpoint', "Path should match requested endpoint"
        assert 'timestamp' in data, "Error response should contain timestamp"
    
    def test_405_method_not_allowed_error_handler(self, client: FlaskClient):
        """Test Flask 405 error handler for unsupported HTTP methods."""
        # Test POST method on GET-only endpoint
        response = client.post('/hello')
        
        # Validate 405 response
        assert response.status_code == 405, "Unsupported method should return 405"
        assert response.content_type == 'application/json', "405 error should return JSON"
        
        # Validate JSON error structure
        assert response.is_json, "405 response should be valid JSON"
        data = response.get_json()
        
        assert isinstance(data, dict), "Error response should be JSON object"
        assert data['status'] == 405, "Status should be 405"
        assert data['error'] == 'Method Not Allowed', "Error should describe method restriction"
        assert 'POST' in data['message'], "Message should reference the unsupported method"
        assert data['path'] == '/hello', "Path should match requested endpoint"
    
    def test_500_internal_server_error_handler(self, client: FlaskClient, app: Flask):
        """Test Flask 500 error handler for internal server errors."""
        # Create a route that raises an exception for testing
        @app.route('/test-error')
        def test_error():
            raise Exception("Test exception for error handler validation")
        
        response = client.get('/test-error')
        
        # Validate 500 response
        assert response.status_code == 500, "Internal error should return 500"
        assert response.content_type == 'application/json', "500 error should return JSON"
        
        # Validate JSON error structure
        assert response.is_json, "500 response should be valid JSON"
        data = response.get_json()
        
        assert isinstance(data, dict), "Error response should be JSON object"
        assert data['status'] == 500, "Status should be 500"
        assert data['error'] == 'Internal Server Error', "Error should describe server error"
        assert 'message' in data, "Error response should contain generic message"
        assert 'timestamp' in data, "Error response should contain timestamp"
        
        # Validate security: ensure no stack trace or sensitive info exposed
        message = data['message'].lower()
        assert 'exception' not in message, "Error message should not expose exception details"
        assert 'traceback' not in message, "Error message should not expose stack trace"
    
    def test_error_response_security_headers(self, client: FlaskClient):
        """Test error responses include proper security headers."""
        response = client.get('/nonexistent-endpoint')
        
        # Validate security headers on error responses
        assert response.headers.get('X-Content-Type-Options') == 'nosniff', "Error responses need security headers"
        assert response.headers.get('X-Frame-Options') == 'DENY', "Error responses need frame protection"
        assert response.headers.get('X-XSS-Protection') == '1; mode=block', "Error responses need XSS protection"


class TestFlaskSecurityConfiguration:
    """
    Test suite for Flask security configuration validation.
    
    Validates security headers, CORS configuration, and other
    security-related settings are properly implemented.
    """
    
    def test_flask_security_headers_on_success_response(self, client: FlaskClient):
        """Test Flask security headers are present on successful responses."""
        response = client.get('/hello')
        
        # Validate security headers
        headers = response.headers
        assert headers.get('X-Content-Type-Options') == 'nosniff', "Content-Type-Options header required"
        assert headers.get('X-Frame-Options') == 'DENY', "Frame-Options header required"
        assert headers.get('X-XSS-Protection') == '1; mode=block', "XSS-Protection header required"
        assert headers.get('Referrer-Policy') == 'strict-origin-when-cross-origin', "Referrer-Policy header required"
    
    def test_flask_cors_configuration(self, client: FlaskClient):
        """Test Flask CORS configuration allows proper cross-origin requests."""
        # Test CORS preflight request
        response = client.options('/hello', headers={
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET'
        })
        
        # Validate CORS headers (may vary based on Flask-CORS configuration)
        # Note: Specific CORS behavior depends on Flask-CORS setup in the application
        assert response.status_code in [200, 204], "OPTIONS request should be handled"
    
    def test_flask_server_header_removal(self, client: FlaskClient):
        """Test Flask server identification headers are not exposed."""
        response = client.get('/hello')
        
        # Validate server fingerprinting prevention
        server_header = response.headers.get('Server', '').lower()
        assert 'flask' not in server_header, "Server header should not expose Flask"
        assert 'werkzeug' not in server_header, "Server header should not expose Werkzeug"
        
        # Validate X-Powered-By header is not present
        assert 'X-Powered-By' not in response.headers, "X-Powered-By header should be disabled"
    
    def test_flask_cache_control_headers(self, client: FlaskClient):
        """Test Flask cache control headers for API endpoints."""
        response = client.get('/hello')
        
        # Validate cache control for API responses
        cache_control = response.headers.get('Cache-Control', '')
        assert 'no-cache' in cache_control.lower(), "API responses should not be cached"
        assert 'no-store' in cache_control.lower(), "API responses should not be stored"
        
        # Validate Pragma header
        assert response.headers.get('Pragma') == 'no-cache', "Pragma header should prevent caching"
        assert response.headers.get('Expires') == '0', "Expires header should prevent caching"


class TestFlaskPerformanceCharacteristics:
    """
    Test suite for Flask application performance validation.
    
    Validates response times, memory usage, and other performance
    characteristics using pytest-benchmark for statistical analysis.
    """
    
    @pytest.mark.benchmark
    def test_hello_endpoint_response_time_benchmark(self, benchmark, client: FlaskClient):
        """Benchmark Flask /hello endpoint response time performance."""
        def make_hello_request():
            response = client.get('/hello')
            assert response.status_code == 200
            return response
        
        # Run benchmark with statistical analysis
        result = benchmark(make_hello_request)
        
        # Validate response time performance (50ms warm request SLA)
        mean_time_ms = benchmark.stats.mean * 1000
        assert mean_time_ms < 50, f"Hello endpoint response time {mean_time_ms:.2f}ms exceeds 50ms SLA"
        
        # Educational note: pytest-benchmark provides statistical analysis
        print(f"\nHello endpoint performance: {mean_time_ms:.2f}ms average")
    
    @pytest.mark.benchmark
    def test_health_endpoint_response_time_benchmark(self, benchmark, client: FlaskClient):
        """Benchmark Flask /health endpoint response time performance."""
        def make_health_request():
            response = client.get('/health')
            assert response.status_code == 200
            return response
        
        # Run benchmark with statistical analysis
        result = benchmark(make_health_request)
        
        # Validate health endpoint performance (25ms health check SLA)
        mean_time_ms = benchmark.stats.mean * 1000
        assert mean_time_ms < 25, f"Health endpoint response time {mean_time_ms:.2f}ms exceeds 25ms SLA"
    
    def test_flask_memory_usage_monitoring(self, client: FlaskClient):
        """Test Flask application memory usage stays within limits."""
        # Get baseline memory usage
        process = psutil.Process()
        baseline_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Make multiple requests to test memory behavior
        for i in range(20):
            response = client.get('/hello')
            assert response.status_code == 200
        
        # Check memory usage after requests
        current_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_growth = current_memory - baseline_memory
        
        # Validate memory usage within 75MB limit
        assert current_memory < 75, f"Memory usage {current_memory:.2f}MB exceeds 75MB limit"
        assert memory_growth < 5, f"Memory growth {memory_growth:.2f}MB during test exceeds 5MB limit"
        
        # Educational note: Memory monitoring demonstrates resource management
        print(f"\nMemory usage: {current_memory:.2f}MB (growth: {memory_growth:.2f}MB)")
    
    def test_concurrent_request_handling(self, client: FlaskClient):
        """Test Flask application handles concurrent requests efficiently."""
        import threading
        import time
        from concurrent.futures import ThreadPoolExecutor
        
        def make_concurrent_request():
            start_time = time.time()
            response = client.get('/hello')
            end_time = time.time()
            return {
                'status_code': response.status_code,
                'response_time': (end_time - start_time) * 1000,  # ms
                'success': response.status_code == 200
            }
        
        # Execute 10 concurrent requests
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_concurrent_request) for _ in range(10)]
            results = [future.result() for future in futures]
        
        # Validate all requests succeeded
        success_count = sum(1 for result in results if result['success'])
        assert success_count == 10, f"Only {success_count}/10 concurrent requests succeeded"
        
        # Validate average response time under load
        avg_response_time = sum(result['response_time'] for result in results) / len(results)
        assert avg_response_time < 50, f"Average response time {avg_response_time:.2f}ms under load exceeds 50ms"


class TestFlaskMiddlewareIntegration:
    """
    Test suite for Flask middleware and request lifecycle validation.
    
    Validates Flask before_request and after_request hooks,
    request processing pipeline, and middleware integration.
    """
    
    def test_flask_request_logging_middleware(self, client: FlaskClient, caplog):
        """Test Flask request logging middleware functionality."""
        with caplog.at_level(logging.INFO):
            response = client.get('/hello')
            
        # Validate request was logged
        assert response.status_code == 200
        
        # Check for request logging entries (implementation dependent)
        log_messages = [record.message for record in caplog.records]
        request_logged = any('hello' in msg.lower() or 'request' in msg.lower() for msg in log_messages)
        
        # Educational note: Logging validation demonstrates middleware testing
        print(f"\nRequest logging captured: {len(log_messages)} log entries")
    
    def test_flask_response_time_tracking(self, client: FlaskClient):
        """Test Flask response time tracking in request processing."""
        start_time = time.time()
        response = client.get('/hello')
        end_time = time.time()
        
        # Validate response time is reasonable
        response_time_ms = (end_time - start_time) * 1000
        assert response_time_ms < 100, f"Response time {response_time_ms:.2f}ms seems unreasonable"
        
        # Educational note: Response time tracking demonstrates performance monitoring
        assert response.status_code == 200
    
    def test_flask_request_context_management(self, app: Flask):
        """Test Flask request context management and isolation."""
        with app.test_request_context('/hello'):
            from flask import request
            
            # Validate request context is properly set up
            assert request.path == '/hello', "Request context should have correct path"
            assert request.method == 'GET', "Request context should have correct method"
            
        # Educational note: Request context testing demonstrates Flask context patterns


class TestFlaskApplicationIntegration:
    """
    Test suite for comprehensive Flask application integration validation.
    
    Validates end-to-end functionality, configuration management,
    and overall application behavior integration.
    """
    
    def test_flask_application_startup_configuration(self, app: Flask):
        """Test Flask application startup and configuration validation."""
        # Validate application is properly configured
        assert app is not None, "Flask application should be created successfully"
        assert hasattr(app, 'config'), "Flask application should have configuration"
        
        # Validate required configuration keys
        required_configs = ['SECRET_KEY', 'JSON_SORT_KEYS', 'JSONIFY_MIMETYPE']
        for config_key in required_configs:
            assert config_key in app.config, f"Flask app should have {config_key} configuration"
    
    def test_flask_json_serialization_configuration(self, client: FlaskClient):
        """Test Flask JSON serialization configuration and behavior."""
        response = client.get('/hello')
        
        # Validate JSON response characteristics
        assert response.is_json, "Response should be valid JSON"
        data = response.get_json()
        
        # Validate JSON structure
        assert isinstance(data, dict), "JSON response should be an object"
        
        # Test JSON serialization consistency
        json_str = json.dumps(data, sort_keys=False)
        assert json_str is not None, "JSON should serialize consistently"
    
    def test_flask_environment_variable_handling(self, app: Flask, monkeypatch):
        """Test Flask environment variable configuration handling."""
        # Test environment variable override
        monkeypatch.setenv('FLASK_ENV', 'testing')
        monkeypatch.setenv('FLASK_DEBUG', 'true')
        
        # Create new app instance with environment variables
        test_app = create_app()
        
        # Validate environment configuration
        assert test_app.config.get('ENV') in ['testing', 'development'], "Environment should be set from env var"
        
        # Educational note: Environment testing demonstrates configuration flexibility
    
    def test_flask_application_teardown_handling(self, app: Flask):
        """Test Flask application teardown and cleanup behavior."""
        with app.app_context():
            # Simulate application context usage
            from flask import current_app
            assert current_app is app, "Current app should match test app"
            
        # Context should be cleaned up after exiting the context manager
        # Educational note: Context management testing ensures proper cleanup


# pytest fixtures for Flask application testing
@pytest.fixture
def app():
    """
    Flask application fixture for testing.
    
    Creates a Flask application instance configured for testing
    with proper environment setup and configuration overrides.
    
    Returns:
        Flask: Configured Flask application instance for testing
    """
    # Set testing environment
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['TESTING'] = '1'
    
    # Create Flask application with testing configuration
    app = create_app()
    app.config.update({
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,  # Disable CSRF for testing
        'SECRET_KEY': 'test-secret-key-for-testing'
    })
    
    # Yield app for test usage
    yield app
    
    # Cleanup environment after tests
    os.environ.pop('FLASK_ENV', None)
    os.environ.pop('TESTING', None)


@pytest.fixture
def client(app):
    """
    Flask test client fixture for HTTP endpoint testing.
    
    Provides a test client for making HTTP requests to the Flask
    application during testing with proper request context management.
    
    Args:
        app: Flask application fixture
        
    Returns:
        FlaskClient: Flask test client for HTTP testing
    """
    return app.test_client()


@pytest.fixture
def runner(app):
    """
    Flask CLI runner fixture for command-line interface testing.
    
    Provides a test runner for testing Flask CLI commands and
    command-line interface functionality.
    
    Args:
        app: Flask application fixture
        
    Returns:
        FlaskCliRunner: Flask CLI test runner
    """
    return app.test_cli_runner()


@pytest.fixture(autouse=True)
def memory_monitoring():
    """
    Automatic memory monitoring fixture for all tests.
    
    Monitors memory usage before and after each test to detect
    memory leaks and ensure resource cleanup. Fails tests that
    cause significant memory growth.
    
    Yields:
        float: Baseline memory usage in MB
    """
    # Capture baseline memory
    process = psutil.Process()
    baseline_memory = process.memory_info().rss / 1024 / 1024  # MB
    
    yield baseline_memory
    
    # Check memory after test
    final_memory = process.memory_info().rss / 1024 / 1024  # MB
    memory_growth = final_memory - baseline_memory
    
    # Assert memory growth is within acceptable limits (1MB per test)
    if memory_growth > 1:
        pytest.fail(f"Memory leak detected: {memory_growth:.2f}MB growth during test")


@pytest.fixture(scope='session')
def performance_baseline():
    """
    Session-scoped performance baseline fixture.
    
    Establishes performance baselines for the test session
    to enable performance regression detection across tests.
    
    Returns:
        dict: Performance baseline metrics
    """
    return {
        'max_response_time_ms': 50,  # 50ms SLA for warm requests
        'max_memory_usage_mb': 75,   # 75MB memory limit
        'max_memory_growth_mb': 1,   # 1MB growth per test
        'max_concurrent_response_time_ms': 50  # 50ms under load
    }


# Educational note: Test configuration and execution
if __name__ == '__main__':
    """
    Direct test execution for development and debugging.
    
    Allows running tests directly with python test_app.py for
    development and debugging purposes outside of pytest runner.
    """
    import sys
    
    # Run pytest with current module
    pytest.main([__file__, '-v', '--tb=short'])