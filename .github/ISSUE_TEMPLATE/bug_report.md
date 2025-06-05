---
name: Bug Report
about: Create a report to help us improve the Python Flask tutorial application
title: '[BUG] Brief description of the issue'
labels: ['bug', 'needs-triage']
assignees: []
---

# Bug Report - Python Flask Tutorial Application

Thank you for taking the time to report a bug in our Python Flask tutorial application! This template will help you provide all the necessary information for us to understand, reproduce, and fix the issue effectively.

## 🐛 Bug Summary

**Provide a clear and concise description of what the bug is**

*Example: The /hello endpoint returns a 500 error instead of 'Hello world' when accessed via curl using Flask test client*

<!-- 
Guidance: Provide a brief, specific description of the unexpected behavior.
Focus on what you observed versus what you expected to happen.
-->

---

## 🖥️ Environment Information

**Please provide details about your development environment:**

- **Operating System**: <!-- e.g., macOS 14.1, Windows 11, Ubuntu 22.04 -->
- **Python version**: <!-- Run `python --version` - Expected: v3.12.0 or higher -->
- **pip version**: <!-- Run `pip --version` - Expected: v23.0.0 or higher -->
- **Flask version**: <!-- Check requirements.txt - Expected: >=3.1.1 -->
- **pytest version**: <!-- Run `pytest --version` - Expected: v8.4.0 or higher -->
- **Gunicorn version**: <!-- Run `gunicorn --version` - Expected: v21.2.0 or higher -->
- **Tutorial version**: <!-- Expected: 1.0.0 -->
- **Browser** (if applicable): <!-- e.g., Chrome 119.0.6045.105, Firefox 119.0 -->

**Environment Variables** (if any custom settings):
```bash
PORT=3000
FLASK_ENV=development
FLASK_DEBUG=True
# List any other environment variables you've set
```

---

## 🔄 Steps to Reproduce

**Detailed steps to reproduce the behavior:**

1. **Start from a clean state** (fresh installation):
   ```bash
   git clone [repository-url]
   cd src/backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Start the Flask server**:
   ```bash
   python wsgi.py
   # OR for production testing
   gunicorn wsgi:application --bind 0.0.0.0:3000
   # OR using Flask development server
   flask --app app run --host 0.0.0.0 --port 3000
   ```

3. **Send the request**:
   ```bash
   curl http://localhost:3000/hello
   # OR describe browser/Postman steps
   # OR using pytest test client
   pytest tests/test_app.py::test_hello_endpoint -v
   ```

4. **Observe the error response**

<!-- 
Requirements:
- Include exact commands used with Python virtual environment activation
- Specify any configuration changes made to Flask settings
- Note any error messages encountered in Python output
- Start from a fresh virtual environment to ensure reproducibility
- Include pytest test execution commands for endpoint validation
-->

---

## ✅ Expected Behavior

**What you expected to happen:**

*The /hello endpoint should return 'Hello world' with HTTP 200 status and Content-Type: application/json using Flask jsonify() response*

<!-- Reference the tutorial documentation or README.md for expected behavior -->

---

## ❌ Actual Behavior

**What actually happened:**

*Received HTTP 500 Internal Server Error with JSON response: {'error': 'Internal server error'}*

**Include specific details:**
- Exact error messages received
- HTTP status codes returned
- Any unexpected console output
- Response headers or body content

---

## 📋 Error Logs and Output

**Please include relevant error logs, console output, or screenshots:**

```bash
# Flask server console output:
2024-01-15 10:30:00,123 - wsgi - INFO - 🚀 WSGI Application Successfully Initialized!
2024-01-15 10:30:00,124 - app - INFO - 📥 GET /hello - Request received
Traceback (most recent call last):
  File "/app/src/backend/app.py", line 45, in hello_route_handler
    response_data = {"message": undefined_variable}
NameError: name 'undefined_variable' is not defined
2024-01-15 10:30:00,125 - app - ERROR - 💥 500 Internal Server Error occurred:
2024-01-15 10:30:00,125 - app - ERROR - Error type: NameError
```

```bash
# Client response:
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
{
  "status": 500,
  "error": "Internal Server Error", 
  "message": "An internal server error occurred",
  "timestamp": "2024-01-15T10:30:00.000000"
}
```

<!-- 
Guidance:
- Use code blocks for formatting
- Include both server-side and client-side output
- Remove any sensitive information
- Include full error stack traces when available
-->

---

## ⚙️ Configuration Details

### Environment Variables
<!-- List any custom environment variables set -->
- `PORT`: 3000 (default)
- `FLASK_ENV`: development
- `FLASK_DEBUG`: True
- Any custom variables: _None_

### Code Modifications
<!-- Describe any changes made to the tutorial code -->
- Changes to wsgi.py: _None_
- Modifications to app.py: _None_
- Custom Flask middleware/decorators added: _None_
- Flask application factory modifications: _None_

### Dependency Changes
<!-- List any additional packages installed or version changes -->
- Additional pip packages: _None_
- Version changes: _None_
- Requirements.txt modifications: _None_
- Virtual environment issues: _None_

---

## 🧪 Testing Information

**Results of running the test suite:**

```bash
# pytest test results:
$ pytest tests/ --cov=src/backend --cov-report=term-missing -v
========================= test session starts =========================
collected 8 items

tests/test_app.py::test_hello_endpoint_success PASSED        [ 25%]
tests/test_app.py::test_health_endpoint_success PASSED       [ 50%]
tests/test_app.py::test_404_error_handler PASSED            [ 75%]
tests/test_wsgi.py::test_wsgi_application_creation PASSED   [100%]

---------- coverage: platform linux, python 3.12.1-final-0 ----------
Name                      Stmts   Miss  Cover   Missing
-------------------------------------------------------
src/backend/app.py           45      0   100%
src/backend/wsgi.py          32      0   100%
-------------------------------------------------------
TOTAL                        77      0   100%

========================= 4 passed in 0.12s =========================
```

**Manual testing performed:**
- [ ] Tested with curl
- [ ] Tested with browser  
- [ ] Tested with Postman
- [ ] Tested with Flask test client
- [ ] Verified Python version (3.12+)
- [ ] Verified virtual environment activation
- [ ] Ran pytest successfully with 100% coverage
- [ ] Verified Flask application factory pattern works

---

## 🔍 Issue Isolation

**Steps taken to isolate the issue:**

- [ ] Tested with fresh virtual environment
- [ ] Verified Python version (v3.12.0+)
- [ ] Verified Flask version (>=3.1.1)
- [ ] Checked for conflicting processes on port 3000
- [ ] Tested with different HTTP clients (curl, browser, Postman, Flask test client)
- [ ] Reviewed recent changes or updates
- [ ] Recreated virtual environment and reinstalled dependencies
- [ ] Verified pytest configuration and fixtures
- [ ] Tested Flask application factory pattern

**Troubleshooting attempted:**
```bash
# Commands tried to resolve the issue:
lsof -ti:3000 | xargs kill                    # Kill port conflicts
deactivate && rm -rf .venv                    # Remove virtual environment
python -m venv .venv && source .venv/bin/activate  # Recreate virtual environment
pip install --upgrade pip                     # Update pip
pip install -r requirements.txt               # Clean install dependencies
pytest tests/ -v --tb=short                   # Run tests with verbose output
python wsgi.py                                # Test WSGI application directly
```

---

## 📚 Additional Context

**When did the issue first appear?**
<!-- e.g., After following step 3 of the tutorial, after system update, etc. -->

**Does it happen consistently or intermittently?**
<!-- Consistent, random, only under certain conditions -->

**Any recent system updates or changes?**
<!-- OS updates, Python version changes, other software installations -->

**Similar issues encountered in other projects?**
<!-- Any patterns or related problems -->

**Workarounds discovered?**
<!-- Any temporary solutions that work -->

---

## 🎓 Educational Impact

**How this bug affects the learning experience:**

- [ ] Prevents completion of tutorial steps
- [ ] Creates confusing error messages for beginners  
- [ ] Impacts understanding of core concepts
- [ ] Missing educational explanations

**Specific learning objectives affected:**
<!-- e.g., WSGI server concepts, Flask routing with decorators, Flask error handling, pytest testing patterns, Python virtual environments -->

---

## 📋 Pre-submission Checklist

Please confirm you have completed the following before submitting:

- [ ] I have searched existing issues to ensure this is not a duplicate
- [ ] I have provided complete environment information
- [ ] I have included detailed reproduction steps  
- [ ] I have tested with the latest version of the tutorial (v1.0.0)
- [ ] I have included relevant error logs and output
- [ ] I have verified this issue occurs with Python v3.12.0+
- [ ] I have confirmed Flask v3.1.1+ is being used
- [ ] I have activated the Python virtual environment
- [ ] I have run the pytest suite and included results
- [ ] I have verified pytest configuration and 100% coverage requirement
- [ ] I have followed the development setup guidelines
- [ ] I have considered the educational impact of this issue

---

## 🛠️ Development Setup Guidelines

For maintainers and contributors reproducing this issue:

### Essential Requirements
- **Python**: v3.12.0 or higher ([Download](https://python.org/downloads/))
- **pip**: v23.0.0 or higher (bundled with Python)
- **Flask**: v3.1.1+ (installed via `pip install`)
- **pytest**: v8.4.0+ (installed via `pip install`)
- **Gunicorn**: v21.2.0+ (installed via `pip install`)

### Setup Steps
```bash
# 1. Install Python from python.org (3.12+ recommended)
# 2. Verify installation
python --version  # Should show v3.12.0+
pip --version     # Should show v23.0.0+

# 3. Clone and setup project
git clone <repository-url>
cd src/backend

# 4. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 5. Install dependencies
pip install -r requirements.txt

# 6. Verify setup
pytest tests/ --cov=src/backend -v  # Should pass all tests with 100% coverage
python wsgi.py                      # Should start Flask server on port 3000

# 7. Test endpoint
curl http://localhost:3000/hello    # Should return {"message": "Hello world"}
```

### Common Troubleshooting
```bash
# Port conflicts
lsof -ti:3000 | xargs kill

# Python version issues  
pyenv global 3.12.1  # If using pyenv

# Virtual environment issues
deactivate
rm -rf .venv
python -m venv .venv
source .venv/bin/activate

# Dependency issues
pip install --upgrade pip
pip install -r requirements.txt

# Flask-specific troubleshooting
export FLASK_ENV=development
export FLASK_DEBUG=True
flask --app app run --port 3000

# pytest issues
pytest tests/ -v --tb=short
pytest --collect-only  # Check test discovery
```

---

## 🏷️ Bug Categories Reference

To help with triage, this issue appears to be related to:

- [ ] **WSGI Server Startup Issues** - Problems with Flask application or Gunicorn initialization
- [ ] **Flask Endpoint Functionality** - Issues with /hello or /health endpoint behavior using Flask decorators
- [ ] **Flask Error Handling Issues** - Problems with Flask error handlers (404, 405, 500) or decorator patterns
- [ ] **pytest Testing Failures** - pytest test suite failures or Flask test client issues
- [ ] **Python Dependency Issues** - pip, virtual environment, or package-related problems
- [ ] **Flask Application Factory Issues** - Problems with create_app() function or configuration
- [ ] **Performance Issues** - Response time, memory usage, or psutil monitoring problems
- [ ] **Flask-CORS Issues** - Cross-origin resource sharing configuration problems
- [ ] **python-dotenv Issues** - Environment variable loading or configuration problems
- [ ] **Documentation Issues** - Tutorial instruction problems

---

## 🔧 Flask-Specific Troubleshooting

**Common Flask Application Issues:**

### Flask Application Factory Problems
```bash
# Test application factory directly
python -c "from app import create_app; app = create_app(); print('✅ Application factory works')"

# Check Flask configuration
python -c "from app import create_app; app = create_app(); print(app.config)"
```

### Flask Route Handler Issues
```bash
# List all registered routes
flask --app app routes

# Test specific route with Flask test client
python -c "
from app import create_app
app = create_app()
with app.test_client() as client:
    response = client.get('/hello')
    print(f'Status: {response.status_code}')
    print(f'Data: {response.get_json()}')
"
```

### WSGI Server Configuration Issues
```bash
# Test Gunicorn configuration
gunicorn --check-config wsgi:application

# Run with debugging
gunicorn wsgi:application --bind 0.0.0.0:3000 --log-level debug

# Test WSGI application directly
python -c "from wsgi import application; print('✅ WSGI application loads')"
```

### Flask-CORS Integration Issues
```bash
# Check CORS headers
curl -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3000/hello -v

# Test cross-origin request
curl -H "Origin: http://example.com" http://localhost:3000/hello -v
```

### pytest and Flask Test Client Issues
```bash
# Test Flask application in pytest environment
pytest tests/test_app.py::test_hello_endpoint_success -v -s

# Check pytest fixtures
pytest --fixtures tests/

# Run with Flask debugging
FLASK_DEBUG=True pytest tests/ -v --tb=long

# Test coverage specifically
pytest tests/ --cov=src/backend --cov-branch --cov-report=html
```

### Python Virtual Environment Issues
```bash
# Verify virtual environment is activated
which python  # Should point to .venv/bin/python
pip list       # Should show Flask, pytest, etc.

# Recreate virtual environment if corrupted
deactivate
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Container and Docker Issues (python:3.12-alpine)
```bash
# Test container build
docker build -t flask-app .

# Check container health
docker run --rm -p 3000:3000 flask-app
curl http://localhost:3000/health

# Debug container startup
docker run --rm -it flask-app sh
python wsgi.py

# Check Gunicorn in container
docker run --rm -p 3000:3000 flask-app gunicorn wsgi:application --bind 0.0.0.0:3000
```

---

**Thank you for helping improve this educational Python Flask tutorial! Your bug report helps make learning Python, Flask, and WSGI better for everyone.**

<!-- 
For maintainers: This issue template follows educational best practices and includes:
- Comprehensive Python environment information including virtual environments
- Detailed reproduction steps with Flask-specific commands and pytest testing
- Educational context and impact assessment for Python web development learning
- Development setup guidance for contributors using Flask application factory pattern
- Quality assurance through pre-submission checklist with pytest coverage requirements
- Support for community learning objectives including WSGI deployment and Flask testing patterns
- Flask-specific troubleshooting including application factory, decorators, and WSGI server issues
- Python security considerations including bandit scanning and dependency validation
- Container troubleshooting for python:3.12-alpine base images and Gunicorn health checks
-->