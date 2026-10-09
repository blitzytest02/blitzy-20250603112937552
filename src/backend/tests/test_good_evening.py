#!/usr/bin/env python3
"""
Pytest test suite for the GET /good-evening greeting endpoint.

Covers the new read-only greeting route added beside the existing greeting route of
this Flask service. The request that produced the change named a Jest file
(test/good-evening.test.js) in the naming convention of the Node.js predecessor this
repository was migrated from; that name is replaced here by the repository's own
framework and directory, with the file named after the feature as requested.

This module mirrors the structure of the existing Flask route-handler tests in
src/backend/tests/test_app.py: the same class organisation, the same fixture-injected
client, the same test_<subject>_<expected outcome> naming, and the same exact-value
assertions on the response body and headers.

Educational Purpose:
- Shows pytest-flask test client patterns for validating a newly added Flask route
- Demonstrates exact-value assertions on a JSON response envelope
- Shows validation of handler-set and application-inherited response headers
- Demonstrates the method-not-allowed behaviour of a GET-only route

Technical Features:
- Module-local Flask application and test client fixtures (no conftest.py exists here)
- JSON envelope validation for message, status and ISO-8601 timestamp
- Response header validation including the inherited security headers
- Application-wide 405 error handler validation with Allow header membership checks
"""

import pytest
from datetime import datetime

# Flask testing imports
try:
    from flask import Flask
    from flask.testing import FlaskClient
except ImportError as e:
    pytest.skip(f"Flask testing dependencies not available: {e}",
                allow_module_level=True)

# Import the Flask application factory for testing
try:
    from src.backend.app import create_testing_app
except ImportError as e:
    pytest.skip(f"Flask application module not available: {e}", allow_module_level=True)


class TestGoodEveningRouteHandler:
    """
    Route handler testing for the GET /good-evening greeting endpoint using the
    pytest-flask test client fixtures, mirroring the /hello tests in test_app.py.
    """

    # The required test-method name plus its typed client parameter is 94 columns wide,
    # past the repository's 88-column flake8 limit, so the parameter list is wrapped
    # rather than the name changed.
    def test_good_evening_endpoint_returns_200_with_json_response(
        self, client: FlaskClient
    ):
        """
        Test GET /good-evening returns successful JSON response with proper structure.
        Mirrors the /hello equivalent test for the new greeting endpoint.
        """
        # Make request to /good-evening endpoint using Flask test client
        response = client.get('/good-evening')

        # Validate HTTP status code
        assert response.status_code == 200

        # Validate response is JSON format
        assert response.is_json
        assert response.content_type == 'application/json'

        # Validate JSON response structure
        data = response.get_json()
        assert isinstance(data, dict)
        assert 'message' in data
        assert 'timestamp' in data
        assert 'status' in data

        # Validate response content
        assert data['message'] == 'Good evening'
        assert data['status'] == 'success'

        # Validate timestamp format
        timestamp = data['timestamp']
        assert isinstance(timestamp, str)
        # Validate ISO format timestamp
        datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

    def test_good_evening_endpoint_response_headers(self, client: FlaskClient):
        """
        Test GET /good-evening response headers and security settings.
        Validates the handler-set headers and the inherited security headers.
        """
        response = client.get('/good-evening')

        # Validate Flask response headers set by the route handler
        assert response.headers['Content-Type'] == 'application/json'
        assert 'X-API-Version' in response.headers
        assert response.headers['X-API-Version'] == '1.0'

        # Validate security headers are present
        assert 'X-Content-Type-Options' in response.headers
        assert response.headers['X-Content-Type-Options'] == 'nosniff'
        assert 'X-Frame-Options' in response.headers
        assert response.headers['X-Frame-Options'] == 'DENY'
        assert 'X-XSS-Protection' in response.headers

        # Validate server identification removal for security
        assert 'Server' not in response.headers
        assert 'X-Powered-By' not in response.headers

    def test_good_evening_endpoint_method_not_allowed(self, client: FlaskClient):
        """
        Test the GET-only /good-evening endpoint rejects POST with a JSON 405 error.
        Validates the application-wide 405 error handler against the new route.
        """
        # Try POST method on GET-only /good-evening endpoint
        response = client.post('/good-evening')

        # Validate 405 status code
        assert response.status_code == 405

        # Validate JSON error response format
        assert response.is_json
        error_data = response.get_json()

        # Validate 405 error response structure
        assert error_data['status'] == 405
        assert error_data['error'] == 'Method Not Allowed'
        assert 'message' in error_data
        assert error_data['method'] == 'POST'
        assert error_data['path'] == '/good-evening'

        # Validate Allow header membership only: the handler builds the header from
        # Flask's routing method set, so its rendered order is not stable between runs
        assert 'Allow' in response.headers
        allowed_methods = response.headers['Allow']
        assert 'GET' in allowed_methods
        assert 'POST' not in allowed_methods


# pytest fixtures for Flask testing integration
@pytest.fixture
def app():
    """
    pytest fixture providing Flask application instance for testing.
    Declared module-locally because this repository has no conftest.py.
    """
    app = create_testing_app()
    app.config.update({
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key'
    })
    return app


@pytest.fixture
def client(app: Flask):
    """
    pytest fixture providing Flask test client for HTTP request testing.
    Replaces Supertest request() with Flask test client patterns.
    """
    return app.test_client()


# pytest markers for test categorization
pytestmark = [
    pytest.mark.unit,  # Unit tests marker
    pytest.mark.flask,  # Flask-specific tests marker
]
