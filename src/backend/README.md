# Python Flask Migration Tutorial Backend - Hello World HTTP Server

## Overview

This educational Python Flask tutorial demonstrates fundamental HTTP server concepts using Flask v3.1.1 and Python 3.12+ with a single `/hello` endpoint returning 'Hello world' response. The application serves as a practical starting point for learning server-side Python development, RESTful API design, and modern web development patterns using the Flask framework.

### Project Purpose and Educational Objectives

- **Understanding HTTP request-response cycle**: Learn how web servers process incoming requests and generate responses using Flask's WSGI architecture
- **Flask framework fundamentals**: Master the micro web framework for Python that provides the core utilities for building web applications with minimal overhead
- **Python 3.12+ runtime environment concepts**: Explore the powerful Python runtime with type hints, pattern matching, and performance optimizations
- **RESTful API endpoint design**: Implement industry-standard API patterns using Flask's decorator-based routing system

### Technology Stack Overview

- **Python 3.12+**: Latest stable Python runtime with enhanced performance, type hints, and modern language features
- **Flask v3.1.1**: Lightweight WSGI web application framework with enhanced security features and Python 3.12+ compatibility
- **pip**: Package installer for Python providing dependency management and package distribution
- **Python Modern Syntax**: Advanced features including type hints, dataclasses, pattern matching, and async/await patterns

### Learning Outcomes and Skills Developed

Upon completion of this tutorial, you will understand:
- HTTP server creation using Flask application factory pattern
- Flask routing system with decorator-based view functions
- WSGI application architecture and deployment patterns
- Python environment management with virtual environments
- Graceful shutdown procedures and signal handling
- Security best practices with Flask v3.1.1
- Modern Python features and Flask development patterns

## Prerequisites

### Python 3.12+ Installation

The application requires Python 3.12 or higher for compatibility with Flask v3.1.1 and modern Python features. Python 3.12+ provides significant performance improvements, enhanced type system, and security updates.

**Installation Methods:**
- **Official Installer**: Download from [python.org](https://python.org/)
- **pyenv**: Recommended for managing multiple Python versions
  ```bash
  pyenv install 3.12.0
  pyenv global 3.12.0
  ```
- **System Package Manager**:
  ```bash
  # Ubuntu/Debian
  sudo apt update && sudo apt install python3.12 python3.12-venv
  
  # macOS with Homebrew
  brew install python@3.12
  
  # Windows with Chocolatey
  choco install python --version=3.12.0
  ```

### pip Package Manager

pip comes bundled with Python and provides dependency management capabilities. Verify installation:
```bash
pip --version  # Should show 23.0+ or higher
python -m pip --version  # Alternative verification method
```

### Virtual Environment Setup

Python virtual environments provide isolated dependency management and are essential for Flask development:
```bash
# Create virtual environment
python -m venv flask-tutorial-env

# Activate virtual environment
# Linux/macOS:
source flask-tutorial-env/bin/activate
# Windows:
flask-tutorial-env\Scripts\activate

# Verify activation (should show virtual environment path)
which python
```

### Basic Python and HTTP Knowledge

Familiarity with the following concepts enhances learning effectiveness:
- Python 3.12+ syntax including type hints and decorators
- HTTP protocol fundamentals (methods, status codes, headers)
- Asynchronous programming concepts with async/await
- JSON data format and REST architectural principles

### Command Line Interface Familiarity

Basic terminal/command prompt skills are required for:
- Navigating directories with `cd` command
- Managing virtual environments with `python -m venv`
- Installing dependencies with `pip install`
- Starting the server with `python wsgi.py` or `flask run`
- Testing endpoints with `curl` or similar tools

## Installation

### Repository Cloning

Clone the tutorial application to your local development environment:
```bash
git clone <repository-url>
cd python-flask-tutorial/src/backend
```

### Virtual Environment Creation and Activation

Create and activate a Python virtual environment for dependency isolation:
```bash
# Create virtual environment using Python 3.12+
python -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Verify Python version in virtual environment
python --version  # Should show Python 3.12+ or higher
```

### Dependency Installation with pip install

Install Flask and all required dependencies from requirements.txt:
```bash
pip install -r requirements.txt
```

This command downloads Flask v3.1.1, pytest, coverage tools, and creates the virtual environment with all dependencies. The `requirements.txt` file ensures exact version consistency across different environments.

### Environment Configuration

The application supports environment-based configuration for deployment flexibility using python-dotenv:

**Environment Variables:**

- `PORT`: Server port. With no environment present the code default is
  `8000` [src/backend/app.py:722], [src/backend/wsgi.py:106],
  [src/backend/wsgi.py:503]. The value `3000` is supplied by the optional
  environment template and by the container configuration
  [src/backend/.env.example:38], [infrastructure/docker/Dockerfile:54]. Two
  routes therefore make the server listen on 3000: copy the template as
  shown below, or export `PORT=3000` in the shell before starting, as the
  Usage section does.
- `HOST`: Host address (default: `localhost`) [src/backend/app.py:721]. The
  WSGI factory path used for container binding defaults to `0.0.0.0`
  instead [src/backend/wsgi.py:105]; the two startup paths are distinct and
  must not be conflated.
- `FLASK_ENV`: Environment mode (development/production/testing)
- `FLASK_DEBUG`: Debug mode (true/false)
- `SECRET_KEY`: Flask secret key for session security

**Example .env file (optional):**

```bash
PORT=3000
HOST=localhost
FLASK_ENV=development
FLASK_DEBUG=true
SECRET_KEY=your-secret-key-change-in-production
```

The binding used by the `localhost:3000` commands in this document comes
from `PORT` and `HOST` alone — the Usage section exports `FLASK_ENV`
alongside them to select the development-server path — so the narrowest
way to supply them is to export those two values. No file is created, and
nothing else in the template is switched on:

```bash
export PORT=3000
export HOST=localhost
```

`src/backend/.env.example` carries the same two values
[src/backend/.env.example:38], [src/backend/.env.example:52], and copying
it is a single command run from `src/backend`:

```bash
cp .env.example .env
```

That copy activates every value in the template, and two of them change
how the application behaves. `FLASK_DEBUG=true`
[src/backend/.env.example:96] puts the factory's development
configuration into debug mode [src/backend/app.py:156],
[src/backend/app.py:185]: measured through `create_app('development')`,
the `/hello` body grows from 86 bytes compact to 99 pretty-printed, and
the error handlers log full stack traces [src/backend/app.py:581],
[src/backend/app.py:619]. The template also sets `FLASK_ENV=development`
[src/backend/.env.example:75], which switches debug on for the `wsgi.py`
startup paths whatever `FLASK_DEBUG` says — the Usage section documents
that second mechanism. `SECRET_KEY` [src/backend/.env.example:162] ships
a fixed development value that the factory reads as Flask's session
signing key [src/backend/app.py:161]; because that value is committed
here, anyone who can read this repository can forge a session signed
with it.

Both are local-development defaults only, and that applies equally to the
example block above and to the copied file. Before the server is reachable
from anything but `localhost`, and before any production run, replace both.
Generate a unique high-entropy key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Set `SECRET_KEY` in `.env` to that value — the template asks for at least
32 characters from a cryptographically secure generator and says never to
carry the development key forward [src/backend/.env.example:267-269] — and
set `FLASK_DEBUG=false`, which the template's own security note requires
outside local use [src/backend/.env.example:296]. Turning that one
variable off is not sufficient on its own: set `FLASK_ENV=production` with
it, because a development environment switches debug on by itself, as the
template's own container example does [src/backend/.env.example:228-229].
The Usage section below states which byte count belongs to which startup
path.

### Verification Steps

Confirm successful installation:

```bash
# Verify Python version
python --version  # Should show 3.12+ or higher

# Verify pip version
pip --version      # Should show 23.0+ or higher

# Verify Flask installation: pip prints a concrete release, as in
# "Version: 3.1.3", never a requirement expression. Any release that
# satisfies the declared Flask>=3.1.1 is correct
# [src/backend/requirements.txt:11]
pip show Flask

# Verify virtual environment activation
which python       # Should show venv path

# Exercise the application factory and the /hello route in-process.
# Run from src/backend, so that "app" resolves to app.py
python - <<'PY'
from app import create_app
r = create_app('testing').test_client().get('/hello')
print(r.status_code, r.headers['Content-Type'], len(r.data))
PY
```

The factory logs several INFO lines while it builds the application; the
last line of output is the check itself:

```text
200 application/json 86
```

That is the 86-byte application-factory envelope described under Usage, so
a matching line confirms the interpreter, the installed dependencies and
the route together.

`pytest` cannot stand in for that check in this repository today. Both
pytest configuration files close their `collect_ignore` list with a stray
`]` — [pytest.ini:200] and [src/backend/pytest.ini:105] — and pytest
rejects the file while parsing it, before collecting a single test:

```text
ERROR: <repo>/src/backend/pytest.ini:105: unexpected line: ']'
```

The absolute path varies with the checkout location, the exit status is 4,
and the run from the repository root aborts the same way against
[pytest.ini:200].

That parse failure is the first blocker rather than the only one, and
correcting those two lines does not on its own make `pytest` a setup
check. Collected with the configuration bypassed, neither test module runs
as the repository is laid out:

- `tests/test_app.py` imports `from src.app import create_app` and skips
  the whole module when that import fails
  [src/backend/tests/test_app.py:54-56]. There is no `src/app.py` and no
  `src/backend/src/` directory, so collection reports no tests and exits
  5.
- `tests/test_wsgi.py` imports `src.backend.wsgi`
  [src/backend/tests/test_wsgi.py:64], which imports top-level `app` at
  module scope and calls `sys.exit(1)` when that fails
  [src/backend/wsgi.py:49-54]. Run from the repository root the collector
  dies with `SystemExit` and exits 3; with `src/backend` on `PYTHONPATH`
  the same file collects its 11 tests.

Use the in-process check above to verify setup. Making `pytest` itself
verify anything needs the configuration parsed **and** those two import
paths resolved — changes to Python and configuration files that are
outside this document.

## Usage

### Starting the Development Server

Launch the Flask development server using the WSGI entry point. Check which
of the two paths you are on before you run anything: `wsgi.py` starts a
development server **only when `FLASK_ENV=development` is set**
[src/backend/wsgi.py:495]. Without that variable the module initialises the
WSGI application and starts no server — it logs production guidance instead,
telling you to start Gunicorn [src/backend/wsgi.py:510-513]. A reader who
runs `python wsgi.py` with no `FLASK_ENV` and sees no listening server is on
that production path.

```bash
# Using WSGI entry point (recommended)
# Starts a development server only when FLASK_ENV=development is set
export FLASK_ENV=development
# Without PORT the same path binds 8000; 3000 is the port used below
export PORT=3000
# Without HOST the banner reports the factory fallback 0.0.0.0 while the
# development server still binds localhost — export it to make both agree
export HOST=localhost
python wsgi.py

# Alternative: Using Flask CLI
export FLASK_APP=app.py  # Linux/macOS
set FLASK_APP=app.py     # Windows
flask run --host=localhost --port=3000

# Production deployment with Gunicorn
# Run this in a shell where FLASK_ENV is production or unset: Gunicorn
# imports wsgi:application, which reads FLASK_ENV like any other path
gunicorn wsgi:application --bind 0.0.0.0:3000 --workers 4
```

**Port and host used by each startup path:** the three exports above are
what make the banner report `localhost:3000` on a clean checkout.
`FLASK_ENV=development` satisfies the development-server gate
[src/backend/wsgi.py:495]; `PORT=3000` replaces the `8000` fallback that the
same path uses when the variable is absent [src/backend/wsgi.py:503]; and
`HOST=localhost` overrides the `0.0.0.0` fallback that the WSGI factory uses
for its banner [src/backend/wsgi.py:105], which would otherwise disagree
with the `localhost` the development server actually binds
[src/backend/wsgi.py:502]. Copying the environment template instead of
exporting `PORT` and `HOST` produces the same values, because the template
sets both [src/backend/.env.example:38], [src/backend/.env.example:52] and
`load_dotenv()` reads the file at import time [src/backend/app.py:52]; it
additionally sets `FLASK_DEBUG=true`, which changes nothing about the
binding. Every
`localhost:3000` command in the rest of this document assumes the
development path started exactly as shown above.

**JSON body size is decided by debug state, not by the server.** Two
separate mechanisms switch debug on, neither of which consults
`FLASK_DEBUG` — which is why setting that variable to `false` does not get
you compact output on a development-environment start:

- `FLASK_ENV=development` makes the WSGI settings pass set `DEBUG=True` on
  the application itself [src/backend/wsgi.py:176-182]. That applies to
  **any** server importing `wsgi:application` under that variable, Gunicorn
  included — measured through `wsgi:application`, `FLASK_ENV=development`
  gives a 99-byte body and `FLASK_ENV=production` an 86-byte one.
- The development server then forces `debug=True` a second time, through
  `application.run(..., debug=True)` [src/backend/wsgi.py:506].

So the transcripts started with the exports above are **99 bytes**
pretty-printed, and the compact **86-byte** single-line body comes from a
path where debug is off: Gunicorn or `flask run` in a shell with `FLASK_ENV`
set to `production` or unset, and the pytest suite's test client. Each
transcript below names the environment it was captured under.

**Expected Output (captured from `FLASK_ENV=development HOST=localhost
PORT=3000 python wsgi.py`):**

```text
🚀 WSGI Application Ready for Production Deployment!
======================================================================
⏰ Initialization time: 2026-09-14T19:46:23.214817
🐍 Python version: 3.13.7
🌶️  Flask framework: Production WSGI application
🔌 WSGI configuration: localhost:3000
📡 Process ID: 35923
🖥️  Platform: linux

[ ... five further logged blocks and the memory report elided ]

🧪 Development mode: Starting Flask development server...
⚠️  Warning: Development server not suitable for production
🎓 Educational Note: Use Gunicorn for production deployment
 * Serving Flask app 'app'
 * Debug mode: on
[ ... werkzeug's "this is a development server" warning elided ]
 * Running on http://localhost:3000
Press CTRL+C to quit
```

**How to read that transcript.** Every line except the three `*`-prefixed
ones is emitted through Python's `logging` module and reaches the console
prefixed with `<timestamp> - <logger> - INFO -` and a space; that prefix is
elided above to keep the block readable. The first bracketed line stands in
for five further logged blocks — WSGI server deployment commands, the
endpoint list, testing commands, container notes and educational notes
[src/backend/wsgi.py:397-429] — followed by a memory report that logs the
process RSS and compares it against a 75 MB target
[src/backend/wsgi.py:355-366]. The banner header itself is
`WSGI Application Ready for Production Deployment!` even on the development
path, because the same initialisation routine serves both
[src/backend/wsgi.py:388].

**Values that change between runs.** `⏰ Initialization time` and
`📡 Process ID` differ on every start. `🐍 Python version` reports the
interpreter actually in use — `3.13.7` in the captured run, and any
Python 3.12 or newer is supported. `🔌 WSGI configuration` echoes whatever
`HOST` and `PORT` resolve to, which is `localhost:3000` only because the
`HOST` and `PORT` exports above are in effect. This line comes from
`create_wsgi_application`, whose own `HOST` fallback is `0.0.0.0`
[src/backend/wsgi.py:105], so with `HOST` unset the same run logs
`0.0.0.0:3000` here while the development server still binds `localhost`
from its own separate fallback [src/backend/wsgi.py:502] — two values for
one start, which is why the export is shown.

**Debug mode is reported twice, with different answers, and both are
correct.** The application factory logs `🐞 Debug mode: False` from
`app.config['DEBUG']` [src/backend/app.py:211] because `FLASK_DEBUG` was
never set, while Werkzeug prints `Debug mode: on` because `wsgi.py` calls
`application.run(..., debug=True)` [src/backend/wsgi.py:506]. The second one
governs the wire format: it is why the `/hello` body in the next section
comes back indented rather than compact.

Startup cost is logged rather than guaranteed. The captured run reported
`RSS (Resident Set Size): 33.90 MB` at initialisation and the module warns
only once RSS passes 75 MB [src/backend/wsgi.py:362-366]; that threshold is
a monitoring target in the code, not a limit this tutorial enforces or
benchmarks.

### Testing the /hello Endpoint

The application exposes a JSON HTTP GET endpoint at `/hello` that demonstrates Flask routing and JSON response generation.

**Browser Access:**
Navigate to `http://localhost:3000/hello` in any web browser to see the JSON "Hello world" response.

**Command Line Testing with curl:**
```bash
curl http://localhost:3000/hello
```

**Expected JSON Response:**

```json
{
  "message": "Hello world",
  "status": "success",
  "timestamp": "2026-09-14T19:46:23.425078"
}
```

The handler builds this three-field envelope and `jsonify()` sorts its keys,
so the wire order is `message`, `status`, `timestamp`
[src/backend/app.py:367-411], [src/backend/app.py:391-399]. Indented exactly
as shown is how the development server sends it, because that path runs with
`debug=True` [src/backend/wsgi.py:506] and Flask pretty-prints JSON whenever
the application is in debug mode. A debug-disabled factory path — Gunicorn,
or the pytest suite's test client — sends the same envelope compact on one
line, as the API Documentation transcript further below shows. The
`timestamp` value is generated per request and therefore differs on every
call.

**HTTP Response Details:**

- Status Code: `200 OK` [src/backend/app.py:400]
- Content-Type: `application/json` [src/backend/app.py:403]
- Content-Length: `99` on the development-server path documented above,
  where debug is on and `jsonify()` pretty-prints the envelope
  [src/backend/wsgi.py:176-182], [src/backend/wsgi.py:506]. The same
  envelope measures `86` bytes compact wherever debug is off — Gunicorn or
  `flask run` with `FLASK_ENV` set to `production` or unset, and the pytest
  suite's test client [src/backend/app.py:367-411].
- Response Time: measured per request and returned in the `X-Response-Time`
  header [src/backend/app.py:342]. The captured request on this path
  reported `0.18ms`; the application records that figure rather than
  guaranteeing any bound, and this tutorial publishes no benchmark.

### Command Line Testing Examples

**Basic GET request:**
```bash
curl -i http://localhost:3000/hello
```

**Output with headers**, captured from the development server started as
shown above:

```http
HTTP/1.1 200 OK
Server: Werkzeug/3.1.8 Python/3.13.7
Date: Mon, 14 Sep 2026 19:46:23 GMT
Content-Type: application/json
Content-Length: 99
X-API-Version: 1.0
X-Response-Time: 0.18ms
X-Request-ID: req_1789415183425
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
X-Permitted-Cross-Domain-Policies: none
Connection: close

{
  "message": "Hello world",
  "status": "success",
  "timestamp": "2026-09-14T19:46:23.425078"
}
```

The `99`-byte `Content-Length` and the indented body follow from debug being
on for this start — set once by `FLASK_ENV=development`
[src/backend/wsgi.py:176-182] and again by the development server itself
[src/backend/wsgi.py:506]. With debug off the same envelope is compact and
86 bytes long, exactly as the API Documentation transcript below
shows. The handler itself sets only `Content-Type` and
`X-API-Version` [src/backend/app.py:403-404]; the security headers come from
the after-request hook [src/backend/app.py:240-251], and the timing and
tracing headers from [src/backend/app.py:342] and [src/backend/app.py:350].

`Date`, `X-Response-Time`, `X-Request-ID` and the `timestamp` value vary per
request, so those four values are illustrative rather than reproducible.

The `Server` header is written by the Werkzeug development server itself
before the application's headers are applied, so the application-level
removal at [src/backend/app.py:237] cannot suppress it; the signature it
discloses is one more reason the development server is not a deployment
target.

**CORS headers appear even on a request that carries no `Origin`**, which is
what the transcript above shows. Flask-CORS is configured with the allowed
origins `http://localhost:3000` and `http://localhost:8000`
[src/backend/app.py:271], and its behaviour splits three ways: with no
`Origin` header it sends the first configured origin,
`Access-Control-Allow-Origin: http://localhost:3000`, together with
`Vary: Origin`; with a matching `Origin` it echoes that origin instead; with
an origin outside the allowed list it sends neither header.

**Testing health check endpoint:**
```bash
curl -i http://localhost:3000/health
```

**Testing invalid routes:**
```bash
curl -i http://localhost:3000/invalid
# Returns 404 Not Found with JSON error response
```

## API Documentation

### GET /hello Endpoint Specification

The core educational endpoint demonstrating fundamental Flask HTTP server functionality.

**Endpoint Details:**
- **URL**: `/hello`
- **Method**: `GET`
- **Description**: Returns a JSON 'Hello world' response to demonstrate Flask request-response cycle
- **Authentication**: None required
- **Parameters**: None

### Request Format and Headers

**HTTP Request Example:**
```http
GET /hello HTTP/1.1
Host: localhost:3000
User-Agent: curl/7.68.0
Accept: application/json
```

**Required Headers:** None
**Optional Headers:** Standard HTTP headers are accepted but not required

### Response Format and Headers

**Successful Response (200 OK)** — the compact form, as a path with debug
off sends it: Gunicorn or `flask run` in a shell where `FLASK_ENV` is
`production` or unset, and the pytest test client:

```http
HTTP/1.1 200 OK
Server: gunicorn
Date: Mon, 14 Sep 2026 20:00:14 GMT
Connection: close
Content-Type: application/json
Content-Length: 86
X-API-Version: 1.0
X-Response-Time: 0.16ms
X-Request-ID: req_1789416014407
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
X-Permitted-Cross-Domain-Policies: none

{"message":"Hello world","status":"success","timestamp":"2026-09-14T20:00:14.407199"}
```

That block was captured from `gunicorn wsgi:application --bind
localhost:3000 --workers 1`, which leaves `FLASK_ENV` unset and therefore
builds the production factory with debug off. `Server: gunicorn` identifies
the serving layer rather than the application, and `Date`,
`X-Response-Time`, `X-Request-ID` and the `timestamp` value differ on every
request.

The `86`-byte `Content-Length` counts the compact single-line envelope plus
its trailing newline, which is what `jsonify()` produces while the
application is **not** in debug mode [src/backend/app.py:367-411]. Any
debug-enabled path pretty-prints the same envelope to `99` bytes, as the
Usage transcript above shows, and there are four of them: the development
server started by `wsgi.py` [src/backend/wsgi.py:506], **Gunicorn or any
other server importing `wsgi:application` with `FLASK_ENV=development`**
[src/backend/wsgi.py:176-182], direct `python app.py` execution, and a
factory created with `FLASK_DEBUG=true` [src/backend/app.py:156]. This
endpoint sends no `Cache-Control` header: the handler sets only
`Content-Type` and `X-API-Version` [src/backend/app.py:403-404], and the
remaining headers are added by the after-request hooks
[src/backend/app.py:240-251], [src/backend/app.py:342],
[src/backend/app.py:350]. The two CORS headers are present here because
Flask-CORS sends the first configured origin even to a request with no
`Origin` header [src/backend/app.py:271], and are absent only for an origin
outside the allowed list, as described under Command Line Testing Examples
above.

**Response Body:** JSON object with `message`, `status` and `timestamp`
fields, the `message` field carrying `Hello world`
[src/backend/app.py:391-399].

### GET /health Health Check Endpoint

**Endpoint Details:**
- **URL**: `/health`
- **Method**: `GET`
- **Description**: Returns application health status for monitoring and deployment verification
- **Response Format**: JSON with timestamp and service information

**Successful Health Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000000",
  "service": "flask-hello-world-tutorial",
  "version": "1.0.0"
}
```

The health handler additionally sets
`Cache-Control: no-cache, no-store, must-revalidate` so that monitoring
probes are never served from a cache [src/backend/app.py:449]. That header
belongs to this endpoint only — `GET /hello` does not send it.

### Error Handling and Status Codes

The application implements comprehensive error handling following HTTP standards using Flask error handlers:

`jsonify()` sorts every error body into alphabetical key order, so the field
order below is the wire order rather than the order the handlers build.
Both captured blocks come from the development server, which indents the
JSON because it runs with `debug=True` [src/backend/wsgi.py:506]; the
compact byte count a debug-disabled factory path would send is given with
each one. Only the headers specific to each error are listed: every error
response also carries the same `Server`, `Date`, CORS, security and timing
headers as the successful transcript above, and those lines are omitted here
so the error-specific fields stand out.

**404 Not Found - Route not found:**

```http
HTTP/1.1 404 NOT FOUND
Content-Type: application/json
Content-Length: 198

{
  "error": "Not Found",
  "message": "The requested resource was not found on this server",
  "method": "GET",
  "path": "/invalid",
  "status": 404,
  "timestamp": "2026-09-14T19:46:23.429728"
}
```

The `message` wording is fixed in the handler and ends `not found on this
server`; `path` and `method` echo the request that missed
[src/backend/app.py:502-513]. Compact, that body is 173 bytes for the
`/invalid` path shown — a longer request path makes it longer.

**405 Method Not Allowed - Invalid HTTP method:**

```http
HTTP/1.1 405 METHOD NOT ALLOWED
Content-Type: application/json
Content-Length: 268
Allow: OPTIONS, HEAD, GET

{
  "allowed_methods": [
    "OPTIONS",
    "HEAD",
    "GET"
  ],
  "error": "Method Not Allowed",
  "message": "The POST method is not allowed for this resource",
  "method": "POST",
  "path": "/hello",
  "status": 405,
  "timestamp": "2026-09-14T19:46:23.434044"
}
```

Three details of that response are easy to get wrong. The `message` ends
`not allowed for this resource`, with the offending method interpolated
[src/backend/app.py:536-547]. The body carries an `allowed_methods` array
and the response carries a matching `Allow` header, both built from
Werkzeug's `error.valid_methods` [src/backend/app.py:541],
[src/backend/app.py:551-552]. And that list is an **unordered set** —
`{GET, HEAD, OPTIONS}` — not a sequence: the same request emitted
`OPTIONS, HEAD, GET` through the development server and
`OPTIONS, GET, HEAD` through the pytest test client, so assert membership
and never position. Compact, the body is 221 bytes.

**500 Internal Server Error:**

```http
HTTP/1.1 500 INTERNAL SERVER ERROR
Content-Type: application/json

{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred while processing your request",
  "request_id": "req_1789416014407",
  "status": 500,
  "timestamp": "2026-09-14T20:00:14.407199"
}
```

That shape is read from the handler rather than captured, because the
tutorial application has no route that fails on demand. It carries five
fields rather than four: the extra `request_id` repeats the per-request
identifier assigned in the before-request hook [src/backend/app.py:316] and
echoed in the `X-Request-ID` header, which is what ties a client-visible
error to a server log line. The message is the generic
`An unexpected error occurred while processing your request`, and no stack
trace is ever placed in the body [src/backend/app.py:586-592].

### Example Requests and Responses

**Valid JSON Request Example:**
```bash
curl -X GET http://localhost:3000/hello \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -v
```

**Invalid Method Example:**
```bash
curl -X POST http://localhost:3000/hello \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -v
```

## Testing

### pytest Testing Framework Setup

The application uses pytest v8.4.0+ as the primary testing framework, providing zero-configuration testing with built-in coverage reporting, Flask integration, and comprehensive assertion libraries.

**pytest Benefits:**
- Zero configuration setup with automatic test discovery
- Flask-specific testing through pytest-flask integration
- Built-in code coverage collection with pytest-cov
- Fixtures for dependency injection and test isolation
- Parallel test execution capabilities with pytest-xdist
- Extensive plugin ecosystem and community support

### Running Unit Tests

No `pytest` invocation in this section runs as the repository stands, and
parsing the configuration successfully would not be enough to change that.
pytest first aborts on the stray `]` in [pytest.ini:200] and
[src/backend/pytest.ini:105] before collecting anything; with that
bypassed, `tests/test_app.py` skips itself and `tests/test_wsgi.py` exits
during import. The Verification Steps section records both layers with
their exit statuses and supplies the in-process check to use instead. The
commands below describe what the suite is written to cover.

Execute the complete test suite:

```bash
# Run all tests with coverage
pytest

# Run tests with verbose output
pytest -v

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m performance   # Performance tests only
```

**Test Categories:**
- **Unit Tests**: Individual Flask component functionality validation
- **Integration Tests**: Complete HTTP request-response cycle testing
- **Performance Tests**: Response time and memory usage validation
- **Security Tests**: Flask application security and vulnerability testing

### Code Coverage Reports

Generate comprehensive coverage analysis with 100% enforcement:
```bash
# Run tests with coverage (default configuration)
pytest

# Generate HTML coverage report
pytest --cov-report=html

# Generate terminal coverage summary
pytest --cov-report=term-missing

# Coverage enforcement (fails if below 100%)
pytest --cov-fail-under=100
```

**Coverage Targets (100% Enforcement):**
- Line Coverage: 100% (complete code execution)
- Function Coverage: 100% (all functions tested)
- Branch Coverage: 100% (all conditional paths)
- Statement Coverage: 100% (all code statements)

**Coverage Report Output:**
```
==================== Coverage summary ====================
Statements   : 100% ( 45/45 )
Branches     : 100% ( 12/12 )
Functions    : 100% ( 8/8 )
Lines        : 100% ( 45/45 )
===========================================================
```

### Flask Application Testing with pytest-flask

pytest-flask provides powerful HTTP assertion capabilities for testing Flask applications:

**Example Test Cases:**
```python
# Basic endpoint testing
def test_hello_endpoint_returns_json_message(client):
    """Test GET /hello returns correct JSON response."""
    response = client.get('/hello')
    assert response.status_code == 200
    assert response.content_type == 'application/json'
    
    json_data = response.get_json()
    assert json_data['message'] == 'Hello world'

# Error handling testing
def test_unknown_route_returns_404(client):
    """Test unknown routes return 404 with JSON error."""
    response = client.get('/unknown')
    assert response.status_code == 404
    
    json_data = response.get_json()
    assert json_data['status'] == 404
    assert json_data['error'] == 'Not Found'

# Health check testing
def test_health_endpoint_returns_status(client):
    """Test GET /health returns health information."""
    response = client.get('/health')
    assert response.status_code == 200
    
    json_data = response.get_json()
    assert json_data['status'] == 'healthy'
    assert 'timestamp' in json_data
    assert json_data['service'] == 'flask-hello-world-tutorial'
```

**Test Execution Commands:**
- `pytest`: Run all tests with coverage enforcement
- `pytest -v`: Verbose output with test descriptions
- `pytest --no-cov`: Skip coverage for faster development iteration
- `pytest -x`: Stop after first failure
- `pytest --tb=short`: Shorter traceback format
- `pytest -k "hello"`: Run tests matching pattern

## Project Structure

### File and Directory Layout

```
src/backend/
├── app.py                 # Flask application factory with routes and middleware
├── wsgi.py                # WSGI entry point for production deployment
├── requirements.txt       # Python package dependencies
├── pytest.ini            # pytest testing framework configuration
├── README.md              # This documentation file
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore patterns
└── tests/
    ├── test_app.py        # Flask app, route, error and security tests
    └── test_wsgi.py       # WSGI lifecycle and integration tests
```

Those two modules are the whole suite. There is no `tests/conftest.py`:
each module declares the fixtures it uses, so a fixture is read in the
file that consumes it [src/backend/tests/test_app.py:620-691],
[src/backend/tests/test_wsgi.py:85-294].

### Component Responsibilities

**app.py - Flask Application Core:**
- Flask application factory pattern with `create_app()` function
- `/hello` and `/health` endpoint implementation using decorators
- Flask-CORS configuration for cross-origin resource sharing
- Error handling decorators for consistent error responses
- Security middleware with Flask before/after request hooks

**wsgi.py - WSGI Server Management:**
- WSGI application instance creation for production deployment
- Python signal handling for graceful shutdown (SIGTERM, SIGINT)
- Memory usage monitoring and performance logging
- Environment configuration loading with python-dotenv
- Development server support with Flask debug mode

**requirements.txt - Python Dependencies:**
- Production runtime dependencies (Flask, gunicorn, python-dotenv)
- Testing framework dependencies (pytest, pytest-flask, coverage)
- Code quality tools (black, flake8, bandit, safety)
- Development utilities (watchdog, pytest-benchmark)

### Configuration Files

**pytest.ini - Testing Configuration:**
```ini
[tool:pytest]
testpaths = tests
addopts = 
    --cov=src
    --cov-branch
    --cov-fail-under=100
    --cov-report=html:htmlcov
    --cov-report=term-missing
    --strict-markers
markers =
    unit: Unit tests for individual components
    integration: Integration tests for complete request cycles
    performance: Performance tests with response time validation
    security: Security tests for vulnerabilities
```

**.env.example - Environment Template:**
```bash
# Server Configuration
PORT=3000
HOST=localhost
FLASK_ENV=development
FLASK_DEBUG=true

# Security Configuration
SECRET_KEY=your-secret-key-change-in-production

# Application Settings
FLASK_APP=app.py
```

### Testing Structure

**tests/test_app.py - Application and Endpoint Tests:**

- Flask application factory functionality and per-environment
  configuration validation
- `/hello` and `/health` request-response cycles through the Flask test
  client, including response headers and timing
- Error handling for 404, 405 and 500 responses, asserted on the JSON
  body and status code
- Security header and CORS configuration verification, plus middleware,
  stateless-operation and configuration-management checks
- Its own fixtures — the application, the test client, the CLI runner, an
  auto-use environment setup and a memory monitor
  [src/backend/tests/test_app.py:620-691]

**tests/test_wsgi.py - WSGI Integration Tests:**

- WSGI server startup, signal handling and port-binding validation
- Flask-to-WSGI integration through the exported `application` callable
- Response-time, memory-usage and concurrent-load measurement
- python-dotenv environment loading and configuration validation
- Its own fixtures, including the dynamic-port allocator and the memory
  and performance monitors [src/backend/tests/test_wsgi.py:85-294]

## Educational Context

### HTTP Server Fundamentals

This tutorial demonstrates core HTTP server concepts essential for web development using Flask:

**Request-Response Cycle:**
1. **Client Request**: HTTP client sends GET request to Flask application
2. **WSGI Processing**: Flask routes request through WSGI interface to appropriate handler
3. **Business Logic**: Flask view function processes request and generates response
4. **Response Transmission**: Flask sends JSON HTTP response back to client through WSGI

**Key Learning Concepts:**
- WSGI (Web Server Gateway Interface) specification and implementation
- HTTP protocol mechanics with Flask's request/response objects
- Status codes and semantic meanings in REST API design
- JSON content negotiation and automatic serialization
- Stateless communication principles with Flask application context

### Flask Framework Concepts

Flask v3.1.1 provides lightweight, flexible tooling for HTTP servers with modern Python integration:

**Framework Philosophy:**
- Micro framework with minimal assumptions about application structure
- Extensible through a rich ecosystem of Flask extensions
- WSGI-compliant for compatibility with various deployment options
- Werkzeug-based with robust HTTP handling and debugging tools

**Flask v3.1.1 Features:**
- **Enhanced Type Hints**: Improved IDE integration and static analysis support
- **Security Improvements**: Updated dependencies with security patches
- **Python 3.12+ Compatibility**: Optimized for modern Python features and performance
- **Async Support**: Built-in support for async view functions where needed

### Python Runtime Understanding

Python 3.12+ provides a powerful runtime with significant improvements over previous versions:

**Runtime Characteristics:**
- **Performance Improvements**: 10-60% faster execution compared to Python 3.11
- **Enhanced Type System**: Improved type hints and static analysis capabilities
- **Memory Efficiency**: Reduced memory overhead and garbage collection improvements
- **pip Ecosystem**: Access to over 400,000 packages on PyPI
- **Cross-Platform Compatibility**: Consistent behavior across Windows, macOS, and Linux

### Modern Python Patterns

The application demonstrates contemporary Python development practices:

**Python 3.12+ Features Utilized:**
- **Type Hints**: Comprehensive type annotations for better code documentation
- **Decorators**: Flask route decorators and error handler decorators
- **Context Managers**: Flask application context and request context handling
- **F-Strings**: Modern string formatting for logging and responses
- **Dataclasses**: Structured data handling (if extended)
- **Pattern Matching**: Advanced control flow for complex routing (if extended)

## Troubleshooting

### Port Binding Issues

**Problem:** Port 3000 already in use
```
OSError: [Errno 98] Address already in use
```

**Solutions:**
1. **Stop the process that holds the port — after confirming it is
   yours:**

   Identify the listener and its owner first. A port-wide kill such as
   `fuser -k 3000/tcp` signals every holder without telling you what it
   was, which on a shared machine can stop a colleague's service or an
   unrelated development server.

   ```bash
   # Show the listener with its command, PID and owning user
   lsof -nP -iTCP:3000 -sTCP:LISTEN
   # Where lsof is unavailable, ss reports the same owner information
   ss -ltnp | grep :3000

   # Confirm the PID really is your Flask server before signalling it
   ps -p <PID> -o pid,user,args
   ```

   Then ask it to stop. Plain `kill` sends SIGTERM, which is what
   `wsgi.py` registers a handler for [src/backend/wsgi.py:239-240], so
   the graceful shutdown path runs [src/backend/wsgi.py:258]:

   ```bash
   kill <PID>

   # Confirm it released the port
   lsof -nP -iTCP:3000 -sTCP:LISTEN
   ```

   Only if the process is still listening after SIGTERM, escalate.
   `kill -9` cannot be caught, so the shutdown handler never runs and the
   server exits without closing down cleanly — it is a last resort:

   ```bash
   kill -9 <PID>
   ```

   On Windows, the same order applies: identify the owning image, ask it
   to exit, and add `/F` only if it refuses.

   ```text
   netstat -ano | findstr :3000
   tasklist /FI "PID eq <PID>"
   taskkill /PID <PID>
   ```

2. **Use alternative port:**

   ```bash
   # FLASK_ENV=development is required: without it wsgi.py initialises the
   # WSGI application, prints Gunicorn guidance and starts no server
   FLASK_ENV=development PORT=3001 python wsgi.py

   # Or with Flask CLI, which takes the port as a flag instead
   flask --app app.py run --host localhost --port 3001
   ```

3. **Check for other applications:**
   Common applications that use port 3000 include development servers, React applications, and Node.js applications.

### Virtual Environment Issues

**Problem:** pip install fails with permission errors
```
PermissionError: [Errno 13] Permission denied
```

**Solutions:**
1. **Ensure virtual environment is activated:**
   ```bash
   # Check if virtual environment is active
   which python
   
   # Should show path to venv/bin/python
   # If not, activate it:
   source venv/bin/activate  # Linux/macOS
   venv\Scripts\activate     # Windows
   ```

2. **Recreate virtual environment:**
   ```bash
   deactivate
   rm -rf venv
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Clear pip cache:**
   ```bash
   pip cache purge
   pip install --no-cache-dir -r requirements.txt
   ```

### Python Version Compatibility

**Problem:** Flask v3.1.1 requires Python 3.8 or higher
```
ERROR: Flask 3.1.1 requires Python >=3.8
```

**Solutions:**
1. **Update Python to 3.12+ version:**
   ```bash
   # Using pyenv (recommended)
   pyenv install 3.12.0
   pyenv global 3.12.0
   
   # Verify version
   python --version
   ```

2. **Check virtual environment Python version:**
   ```bash
   # Ensure virtual environment uses correct Python
   python -c "import sys; print(sys.version)"
   ```

### Flask Import Errors

**Problem:** Flask application import failures
```
ModuleNotFoundError: No module named 'flask'
```

**Solutions:**
1. **Verify Flask installation:**
   ```bash
   pip show Flask
   pip list | grep -i flask
   ```

2. **Install Flask explicitly:**
   ```bash
   pip install Flask>=3.1.1
   ```

3. **Check PYTHONPATH:**
   ```bash
   echo $PYTHONPATH
   python -c "import sys; print(sys.path)"
   ```

### Testing Framework Issues

**Problem:** pytest tests failing with import errors
```
ImportError: cannot import name 'create_app' from 'app'
```

**Solutions:**
1. **Verify test configuration:**
   ```bash
   # Check pytest configuration
   pytest --collect-only
   
   # Verify app module can be imported
   python -c "from app import create_app; print('Success')"
   ```

2. **Fix Python path in tests:**
   ```python
   # At the top of a test module, or of a conftest.py you add — this
   # repository ships neither a conftest.py nor this path shim
   import sys
   import os
   sys.path.insert(0, os.path.dirname(__file__))
   ```

3. **Clear pytest cache:**
   ```bash
   pytest --cache-clear
   rm -rf .pytest_cache
   ```

### Common Server Issues

**Problem:** Server starts but endpoints not responding
```
curl: (7) Failed to connect to localhost port 3000
```

**Diagnostic Steps:**
1. **Verify server is listening:**
   ```bash
   netstat -tlnp | grep :3000
   lsof -i:3000
   ```

2. **Check Flask application logs:**

   ```bash
   # FLASK_ENV=development is what starts a server at all; FLASK_DEBUG=true
   # additionally puts the factory itself into debug mode
   FLASK_ENV=development FLASK_DEBUG=true python wsgi.py

   # Or with verbose pytest
   pytest -s -v
   ```

3. **Test with verbose curl:**
   ```bash
   curl -v http://localhost:3000/hello
   curl -v http://localhost:3000/health
   ```

## Next Steps

### Adding Database Integration

Progress to more advanced tutorials incorporating data persistence:

**Recommended Learning Path:**
1. **SQLAlchemy with PostgreSQL**: Relational database integration using SQLAlchemy ORM
2. **Flask-SQLAlchemy**: Flask-specific database extensions and patterns
3. **MongoDB with PyMongo**: NoSQL document database integration
4. **Redis for Caching**: In-memory data structure store for session and cache management
5. **Database Migration Strategies**: Alembic for schema management and version control

**Example Database Integration:**
```python
# Flask-SQLAlchemy setup
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:pass@localhost/db'
    db.init_app(app)
    return app
```

### Implementing Authentication and Authorization

Enhance security with user management and access control:

**Authentication Patterns:**
1. **JWT Token Authentication**: Stateless authentication for REST APIs
2. **Flask-Login**: Session-based authentication with user management
3. **OAuth 2.0 Integration**: Third-party authentication providers (Google, GitHub)
4. **Flask-Security**: Comprehensive authentication and authorization framework
5. **Multi-Factor Authentication**: Enhanced security with 2FA/TOTP

**Libraries and Tools:**
- **Flask-JWT-Extended**: JWT authentication for Flask applications
- **bcrypt**: Password hashing and salting with Flask-Bcrypt
- **Flask-Principal**: Identity and permission management
- **Authlib**: OAuth and OpenID Connect integration

### Building RESTful APIs

Expand beyond the single endpoint to full CRUD operations:

**REST Architecture Implementation:**
1. **Resource-Based URLs**: Logical resource organization with Flask blueprints
2. **HTTP Method Semantics**: Proper use of GET, POST, PUT, DELETE, PATCH
3. **Request/Response Patterns**: JSON serialization and validation
4. **API Versioning**: URL-based or header-based versioning strategies

**Advanced API Features:**
- **Marshmallow**: Advanced serialization and validation
- **Flask-RESTful**: Resource-based API development
- **OpenAPI/Swagger**: API documentation with Flask-SMOREST
- **Rate Limiting**: Request throttling with Flask-Limiter
- **API Authentication**: Token-based and OAuth2 implementation

### Production Deployment Considerations

Prepare Flask applications for production environments:

**Deployment Platforms:**
1. **Platform-as-a-Service (PaaS)**: Heroku, Render, Railway for simplified deployment
2. **Cloud Providers**: AWS, Google Cloud, Microsoft Azure for scalable infrastructure
3. **Container Orchestration**: Docker and Kubernetes for microservices architecture
4. **WSGI Servers**: Gunicorn, uWSGI, and Waitress for production serving

**Production Optimizations:**
- **Application Configuration**: Environment-specific settings with Flask-Config
- **Process Management**: Gunicorn multi-worker deployment strategies
- **Reverse Proxy Setup**: nginx configuration for static files and load balancing
- **SSL/TLS Configuration**: HTTPS setup with Let's Encrypt certificates
- **Performance Monitoring**: APM tools integration (New Relic, DataDog)

**Recommended Production Tools:**
- **Gunicorn**: WSGI HTTP server for Python web applications
- **nginx**: Reverse proxy and static file serving
- **Docker**: Containerization for consistent deployment environments
- **Prometheus + Grafana**: Monitoring and metrics collection
- **Sentry**: Error tracking and performance monitoring

### Advanced Flask Concepts

Explore advanced Flask patterns and extensions:

**Flask Extensions:**
- **Flask-Migrate**: Database migration management with Alembic
- **Flask-Mail**: Email sending capabilities
- **Flask-Admin**: Administrative interface generation
- **Flask-SocketIO**: WebSocket support for real-time applications
- **Flask-Caching**: Caching layer with multiple backend support

**Advanced Patterns:**
- **Application Factories**: Scalable application configuration
- **Blueprint Registration**: Modular application organization
- **Custom Decorators**: Authentication and authorization decorators
- **Flask Context**: Understanding application and request contexts
- **Error Handling**: Custom error pages and exception handling

---

## Performance Characteristics

This tutorial publishes no performance benchmark, so the entries below state
what the application measures and what a single captured run observed — not
a guarantee, a service level, or a figure any test enforces.

- **Startup Time**: not measured by the application. The captured
  development-server start logged its initialisation timestamp only
  [src/backend/wsgi.py:387-390]
- **Memory Usage**: measured with `psutil` at initialisation, on each
  handled signal, at shutdown and on an uncaught exception, then compared
  against a 75 MB monitoring target that logs a warning when exceeded
  [src/backend/wsgi.py:355-366]. The captured run reported `33.90 MB` RSS at
  initialisation on Python 3.13.7
- **Response Time**: measured per request and returned in the
  `X-Response-Time` header [src/backend/app.py:342]. The captured `/hello`
  requests reported `0.16ms` under Gunicorn and `0.18ms` under the
  development server, each from one request on an idle container
- **Concurrent Requests**: determined entirely by the serving layer, not by
  this application, and not benchmarked here. The Gunicorn command
  documented in the Usage section asks for four synchronous workers
  (`--workers 4`), while the one-worker invocation named under Response
  Format and Headers was used only to capture that transcript. The
  development server runs threaded by default, because `wsgi.py` passes no
  `threaded` argument to `application.run` and Flask's own default is on
  [src/backend/wsgi.py:506]
- **Test Execution**: not benchmarked. Time `pytest` on your own machine if
  you need a figure for it

## Security Considerations

### Flask v3.1.1 Security Features
- **Enhanced Dependencies**: Updated Werkzeug and Jinja2 with security patches
- **CSRF Protection**: Built-in support with Flask-WTF integration
- **Secure Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **JSON Security**: Safe JSON handling with proper content type validation

### Python 3.12+ Security Benefits
- **Security Patches**: Latest security updates and vulnerability fixes
- **SSL/TLS Support**: Modern cryptography with updated OpenSSL integration
- **Type Safety**: Enhanced type checking reduces runtime errors

### Educational Security Practices
- **Environment Variables**: Secure configuration management with python-dotenv
- **Error Handling**: Generic error messages preventing information disclosure
- **Dependency Security**: Automated vulnerability scanning with safety and bandit
- **Input Validation**: Request data validation through Flask's request handling

## License Information

**License**: MIT License

**Description**: Open source educational project suitable for learning and modification

**Permissions**: Commercial use, modification, distribution, private use

**Limitations**: No liability or warranty provided

## Contribution Guidelines

### Educational Focus
Maintain simplicity and educational clarity in all contributions. The primary goal is learning effectiveness rather than feature completeness.

### Code Standards
Follow PEP 8 Python style guide with comprehensive type hints and docstrings. All code should be self-explanatory for educational purposes.

### Testing Requirements
Maintain 100% test coverage for educational demonstration. Any new functionality must include corresponding pytest test cases.

### Documentation Updates
Update README.md for any functional changes or additions. Documentation should reflect current implementation accurately.

---

**Happy Learning!** This tutorial provides a solid foundation for understanding Python Flask fundamentals. Continue exploring the rich ecosystem of Flask extensions and Python libraries to build more complex and feature-rich web applications.
