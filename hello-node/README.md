# hello-node — a Node.js tutorial serving one `GET /hello` endpoint

A self-contained Node.js and Express tutorial project that serves **exactly one endpoint**, `GET /hello`, and returns the plain-text greeting `Hello world` to the calling HTTP client. It is deliberately small: eleven bytes over a real socket, with every behaviour around those eleven bytes — the media type, the path casing, the methods the path accepts, what happens to every other path, and how the process shuts down — specified, documented and covered by tests. This project lives in `hello-node/` at the repository root and is entirely independent of the Python Flask application that also lives in this repository under `src/backend/`: it shares no code, no configuration, no port and no dependency manifest with it, and installing or running it changes nothing about the Flask service. The two can run side by side on one machine.

Every command below is runnable **as written from the `hello-node/` directory**, unless the section says otherwise (the `curl` verification commands work from any directory). Every expected output shown was measured against this project on Node.js 22.16.0 with npm 11.4.1 — nothing here is predicted.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install and Run](#install-and-run)
3. [Expected Startup Output](#expected-startup-output)
4. [Configuration](#configuration)
5. [The Endpoint Contract](#the-endpoint-contract)
6. [Behaviour Outside the Contract](#behaviour-outside-the-contract)
7. [Verification](#verification)
8. [Graceful Shutdown](#graceful-shutdown)
9. [Tests](#tests)
10. [Project Layout](#project-layout)
11. [Learning Objectives](#learning-objectives)

## Prerequisites

| Component | Required Version | Purpose |
|-----------|------------------|---------|
| **Node.js** | 22.16.0 | JavaScript runtime; pinned in `.nvmrc` and in `engines.node` |
| **npm** | 11.4.1 | Package manager; pinned in `engines.npm` |
| **curl** | any recent version | Used by the verification commands to call the endpoint |

Node.js 22.16.0 is pinned twice — in `.nvmrc`, so `nvm use` selects it, and in the `engines` field of `package.json`, so npm warns if you install under a different runtime.

**npm 11.4.1 is not bundled with Node.js 22.16.0, so you have to install it explicitly.** Node.js 22.16.0 ships npm **10.9.2**; installing `npm@11.4.1` yourself is what produces the pinned version. This is worth stating plainly because the repository's contributor guide claims the opposite (`CONTRIBUTING.md:91` describes npm v11.4.1 as "bundled with Node.js") — that claim is incorrect, and the install step below is not optional.

Verify the toolchain before installing anything:

```bash
node -v    # must report: v22.16.0
npm -v     # must report: 11.4.1
```

## Install and Run

From the `hello-node/` directory:

```bash
nvm use                          # reads .nvmrc -> 22.16.0
npm install -g npm@11.4.1        # required: 22.16.0 bundles npm 10.9.2
npm ci                           # restores from the committed lockfile
npm start
```

`npm ci` is the authoritative install command. It installs exactly the tree recorded in the committed `package-lock.json`, which is what makes every learner's install identical to the one this document was verified against. Expected output:

```text
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. ...
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, ...

added 348 packages, and audited 349 packages in 751ms

62 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

Three things in that output are expected and none is a problem:

- **348 packages** for one declared runtime dependency. Express 5.1.0 brings a substantial transitive tree — body parsing, content negotiation, ETag generation, MIME lookup, routing and error handling — and the production-only tree is 68 of those packages. The rest are the test runner and its dependencies.
- **Exactly two deprecation warnings**, `inflight@1.0.6` and `glob@7.2.3`. Both are reached transitively through Jest, neither is a package this project selects, and neither carries a security advisory against this tree. They are accepted, not fixed: resolving them would mean replacing the test runner. `npm audit` reports `found 0 vulnerabilities`.
- **`found 0 vulnerabilities`** — the expected result, and the reason `npm ci` is safe to run as the first step.

Use `npm install` only when you have deliberately changed a dependency version in `package.json` and want to regenerate the lockfile. For simply installing the project, `npm ci` is the command.

## Expected Startup Output

`npm start` runs `node server.js`, which binds the socket and prints exactly two lines:

```text
Server listening on http://localhost:3002
Try: curl http://localhost:3002/hello
```

That is the whole banner — no emoji, no separator rule, no timestamp. The port in those lines is read back from the socket's actual bound address via `server.address()`, not echoed from the requested configuration, so the address printed is always one a client can really call.

The server now runs in the foreground until you stop it (see [Graceful Shutdown](#graceful-shutdown)). Run the verification commands in a second terminal.

## Configuration

`HOST` and `PORT` are the **only two** environment variables this server reads. Both are optional and both have a documented default; `.env.example` in this directory documents them in full.

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOST` | `localhost` | Network interface the server binds |
| `PORT` | `3002` | TCP port the server binds |

Override them on the command line for a single run:

```bash
PORT=4010 HOST=127.0.0.1 npm start
```

```text
Server listening on http://127.0.0.1:4010
Try: curl http://127.0.0.1:4010/hello
```

There is no `dotenv` dependency and none is being added, so a `.env` file is **not** read by the process. `.env.example` documents these two variables for a human; a real override has to be present in the environment, as on the command line above.

**Why the default port is 3002 and not the more familiar 3000.** Port 3000 is not free in this repository: the development compose service publishes it on the host as `"3000:3000"` (`infrastructure/docker/docker-compose.yml:86`), so binding it here would fail for anyone who has `docker compose up` running. 3002 is claimed by nothing else in this repository and stays close enough to 3000 to remain recognizable.

`HOST` is passed through to `listen()` without validation, so setting `HOST=0.0.0.0` really does bind every interface on the machine. The default is the safe one — `localhost` is the loopback interface, reachable from this machine and nowhere else — and the override is your decision.

## The Endpoint Contract

This is the acceptance surface of the project. Every value below is fixed.

| Property | Value |
|----------|-------|
| Method and path | `GET /hello`, **case-sensitive** |
| Trailing-slash variant | `GET /hello/` is served identically, by the same single registration |
| Casing variants | `GET /HELLO`, `/Hello`, `/hELLo` and any other casing return `404`, not the greeting |
| Success status | `200 OK` |
| Response body | `Hello world` |
| Body length | 11 bytes, no trailing newline |
| `Content-Type` | `text/plain; charset=utf-8` |
| `Content-Length` | `11` |

**Request:**

```http
GET /hello HTTP/1.1
Host: localhost:3002
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11

Hello world
```

The body is the eleven literal bytes `Hello world` — capital `H`, lowercase `w`, a single space, no punctuation and no trailing newline. It is the greeting itself, not a document describing the greeting: the media type is `text/plain; charset=utf-8` and the body is not wrapped in an envelope of any kind.

Two details of that contract are worth dwelling on, because both are decisions rather than defaults:

- **The media type is set explicitly.** Express infers `text/html` for a string handed to `res.send()`, so `app.js` calls `res.status(200).type('text/plain').send(GREETING)`. Without the `.type()` call a client would be told to render the greeting as markup.
- **One registration serves both `/hello` and `/hello/`.** Express's `strict routing` setting is deliberately left disabled, so a trailing slash is forgiven and answered by the same handler with an identical status, body and media type. Path *casing* is treated the opposite way, and the next section explains why.

**Educational contrast with the sibling Flask service.** The Python application in this repository serves the same path and builds the same string, but returns it inside a JSON envelope — `{"message": "Hello world", "timestamp": ..., "status": "success"}` with `Content-Type: application/json` (`src/backend/app.py:386-404`). A client calling that endpoint receives a JSON document *about* the greeting; a client calling this one receives the greeting. The two implementations differ on purpose, and the contract documented here is the one this project honours.

## Behaviour Outside the Contract

"Exactly one endpoint" is only meaningful if everything else has a defined answer, so the boundary is specified rather than left to framework defaults. Every row below is measured.

| Request | Response |
|---------|----------|
| `GET` on any unmatched path, including every casing variant of `/hello` | `404`, `application/json; charset=utf-8`, body `{"status":404,"message":"Not Found","path":"<path>","method":"GET","timestamp":"<ISO-8601>"}` |
| `GET /` | The same JSON `404` — no root route is served |
| `GET /health` | The same JSON `404` — no health endpoint is served |
| `HEAD /hello` | `200`, with the same `Content-Type` and `Content-Length: 11` as the `GET`, and an empty body |
| `POST`, `PUT`, `PATCH`, `DELETE` or `OPTIONS` on `/hello` | `405`, header `Allow: GET, HEAD`, body `{"status":405,"message":"Method Not Allowed","path":"/hello","method":"<method>","timestamp":"<ISO-8601>"}` |

There is **no** health probe, **no** root route, **no** versioned prefix and **no** metrics endpoint. `GET /hello` is the only request that succeeds.

**Path matching is case-sensitive, and that required asking for it.** Express matches route paths case-insensitively by default, so an unmodified application answers `/HELLO` and `/Hello` with the greeting — which would make one documented endpoint reachable at an unbounded number of paths. `app.js` therefore sets `case sensitive routing` to `true`, after which those requests fall through to the `404`. The asymmetry with the forgiven trailing slash is intentional: a trailing slash is a typing convention for the same resource, whereas a different casing is a different path.

**`HEAD /hello` is served, not rejected.** HTTP requires `HEAD` to be identical to `GET` minus the body, and Express satisfies `HEAD` through the registered `GET` handler automatically — returning the response headers with no body. A service that accepted `GET` but rejected `HEAD` on the same path would be non-conformant, so that behaviour is retained. Two consequences follow: the `405` rule covers non-GET methods *other than* `HEAD`, and the `Allow` header advertises `GET, HEAD` so that it names every method the path really accepts.

**The `405` exists because a handler produces it.** A bare `GET` registration followed only by a catch-all answers `POST /hello` with `404`, because no registration claimed the path for that method. Returning `405` requires a method guard registered on the same path *after* the `GET` and *before* the terminal handler — which is why route ordering in `app.js` is load-bearing rather than cosmetic.

**The error bodies are JSON while the success body is plain text.** That contrast is deliberate: the greeting is a literal string because a literal string is what the endpoint promises, whereas an error is a structured report and a machine-readable envelope is the right shape for one. The `Allow` header on the `405` is there because HTTP requires a `405` response to name the methods the target supports.

## Verification

Start the server with `npm start`, then run these from a second terminal. **The `curl` commands work from any directory** — they only need the server to be listening.

### The success response, in full

```bash
curl -i http://localhost:3002/hello
```

```text
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
ETag: W/"b-e1AsOh9IyGCa4hLN+2Od7jlnP14"
Date: <RFC 7231 date>
Connection: keep-alive
Keep-Alive: timeout=5

Hello world
```

The status line, both content headers and the body are fixed by the contract. The remaining headers are Express defaults that are retained rather than contract terms: `Date` varies with every request, and the `ETag` is derived from the response body — stable for this body, but not something to assert against. One Express default is deliberately removed: `x-powered-by` is disabled, so the service does not advertise its framework to every client. You will not find that header in the response above.

### The body is exactly eleven bytes

```bash
curl -s http://localhost:3002/hello | wc -c
```

```text
11
```

```bash
curl -s http://localhost:3002/hello | od -c
```

```text
0000000   H   e   l   l   o       w   o   r   l   d
0000013
```

The dump ends at `d` at offset `0000013` (octal for 11) with no newline, no carriage return and no padding of any kind.

### The boundary

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:3002/hello/
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/HELLO
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:3002/nope
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/health
curl -s -I http://localhost:3002/hello | head -3
curl -s -i -X POST http://localhost:3002/hello | head -3
```

Expected results, in the same order:

| Request | Expected |
|---------|----------|
| `/hello/` | `200 text/plain; charset=utf-8` — the trailing-slash variant is served identically |
| `/HELLO` | `404` — case-sensitive routing is enforced |
| `/nope` | `404 application/json; charset=utf-8` |
| `/health` | `404` — proves exactly one endpoint is served |
| `HEAD /hello` | `200 OK`, `Content-Type: text/plain; charset=utf-8`, `Content-Length: 11`, and no body |
| `POST /hello` | `405 Method Not Allowed`, `Allow: GET, HEAD`, `Content-Type: application/json; charset=utf-8` |

**The `/health` check is in this list on purpose.** The sibling Flask application in this repository *does* serve that path (`src/backend/app.py:426`), so a reader coming from it might reasonably expect one here. Calling it and receiving a `404` demonstrates the "exactly one endpoint" constraint instead of leaving it assumed.

To see a full error body rather than just its status:

```bash
curl -s http://localhost:3002/nope
```

```text
{"status":404,"message":"Not Found","path":"/nope","method":"GET","timestamp":"2026-09-14T15:57:08.348Z"}
```

The `timestamp` is the moment the response was generated, so it differs on every call.

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT`. On either one it stops accepting new connections, lets the responses already in flight finish, announces that it is done, and exits with status `0`.

**In the foreground**, press `Ctrl-C` in the terminal running `npm start`. `Ctrl-C` sends `SIGINT`:

```text
SIGINT received: closing server...
Server closed. Goodbye!
```

**In the background**, start the server with `node server.js` — the same command `npm start` runs — so that you hold the PID of the Node process itself:

```bash
node server.js &
pid=$!
# ... make requests ...
kill -TERM $pid
wait $pid; echo "exit status=$?"
```

```text
SIGTERM received: closing server...
Server closed. Goodbye!
exit status=0
```

The listening port is released, so a request made afterwards is refused rather than answered.

**Signal the Node process, not an `npm` wrapper.** `npm start` runs `node server.js` as a child process, and sending `SIGTERM` to the `npm` process does not reach that child: the `npm` wrapper exits, the Node process keeps running and keeps holding the port. `Ctrl-C` in the foreground is unaffected, because it signals the whole foreground process group. For a backgrounded server, use `node server.js &` as shown above so the PID you capture is the one that needs the signal.

## Tests

```bash
npm test
```

```text
Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```

| Suite | Tests | What it asserts |
|-------|-------|-----------------|
| `test/integration/hello-endpoint.test.js` | 6 | The delivered HTTP contract and its boundary: status `200`; `content-type` exactly `text/plain; charset=utf-8`; body exactly `Hello world` with length 11; `content-length` of `11`; no `x-powered-by`; the trailing-slash variant identical; `/HELLO`, `/Hello` and `/hELLo` each `404`; `HEAD /hello` returning `200` with both content headers and no body; the JSON `404` and its fields; the `405` with `Allow: GET, HEAD` |
| `test/unit/app.test.js` | 3 | `createApp()` returns a configured Express application; `GREETING` is the exact eleven-byte literal; `x-powered-by` is disabled |
| `test/unit/server.test.js` | 6 | Configuration defaults resolve to `localhost` and `3002`; `HOST` and `PORT` overrides are honoured; `readConfig()` reads `process.env`; the server logs the *bound* port; the termination path logs both lines and exits `0`; a real `process.emit('SIGTERM')` closes the server |

Two more scripts are available:

```bash
npm run test:coverage    # jest --coverage
npm run test:ci          # jest --ci --coverage --runInBand
```

Coverage is collected on every run, from `app.js` and `server.js` only:

```text
-----------|---------|----------|---------|---------|
File       | % Stmts | % Branch | % Funcs | % Lines |
-----------|---------|----------|---------|---------|
All files  |     100 |      100 |     100 |     100 |
 app.js    |     100 |      100 |     100 |     100 |
 server.js |     100 |      100 |     100 |     100 |
-----------|---------|----------|---------|---------|
```

The machine-enforced gate in `jest.config.js` is lower than that result — branches 95, functions 100, lines 95, statements 95 — so the suite has a little headroom while both modules in fact reach 100% on every metric.

Two properties of the suite are worth understanding, because they are why it is quick and why it never gets in your way:

- **The integration tests need no running server and no free port of their own.** They call `createApp()` and drive the returned application in-process through supertest, which starts a throwaway server on an ephemeral loopback port for each request and closes it afterwards. So they neither collide with a server you already have running on 3002 nor require one to be up. This is exactly what the `app.js` / `server.js` split buys.
- **The server tests replace `console.log` and `process.exit` with Jest spies.** That is how the termination path can be asserted — the two shutdown lines and the exit status — without the test worker actually exiting partway through the run.

If you run a single test file directly, disable coverage, because the threshold above is global and a partial run cannot meet it:

```bash
npx jest test/unit/app.test.js --coverage=false
```

**No automated job runs these tests.** `hello-node/**` matches none of the path filters in `.github/workflows/ci.yml:6-12`, so pushing a change to this project triggers no workflow. The suite is a local and pull-request-time gate: it runs when you or a reviewer runs it.

## Project Layout

Eleven files, each with one job:

```text
hello-node/
├── package.json                          # manifest: entry point, scripts, exact dependency versions
├── package-lock.json                     # committed lockfile, so `npm ci` is authoritative
├── .nvmrc                                # pins Node.js 22.16.0 for `nvm use`
├── .env.example                          # documents HOST and PORT, the only two variables read
├── jest.config.js                        # test discovery, coverage collection, coverage gate
├── app.js                                # application assembly: every route, no socket
├── server.js                             # lifecycle: configuration, binding, banner, signals
├── README.md                             # this tutorial
└── test/
    ├── unit/
    │   ├── app.test.js                   # the application module's exports and the greeting
    │   └── server.test.js                # configuration, binding, and termination
    └── integration/
        └── hello-endpoint.test.js        # the delivered HTTP contract and its boundary
```

**Why `app.js` and `server.js` are separate files.** `app.js` assembles the Express application — it registers every route and returns the configured app from a `createApp()` factory. It never calls `listen()`, never reads `process.env` and never chooses a port. `server.js` owns all three of those, plus everything else that follows from holding an operating-system resource: resolving configuration against the documented defaults, binding the socket, printing the banner, and closing the socket cleanly when a signal arrives.

That split is not a stylistic preference. It is what lets the tests drive the application **in-process**: a test can `require('../../app')`, call `createApp()`, and exercise every route through supertest without anything ever binding port 3002. A single module that both registered routes and bound a socket could not be imported by a test without binding one — which would make the suite depend on a free port and on tearing the server down afterwards. The same division appears in the Python application in this repository, where `app.py` owns the routes and `wsgi.py` owns the process lifecycle.

## Learning Objectives

Working through this project, you will learn:

1. **The application-factory pattern** — why a module exports a `createApp()` function that returns a brand-new configured application, rather than exporting a single shared instance, and how that gives every caller and every test an isolated app with no shared state.
2. **Separating application assembly from the HTTP listener** — which responsibilities belong to `app.js` (routes, settings) and which belong to `server.js` (configuration, binding, banner, signals), and why that boundary is what makes the application testable at all.
3. **Setting media types explicitly** — that Express infers `text/html` for a sent string, so `res.type('text/plain')` is load-bearing rather than decorative, and how `Content-Length` follows from the body.
4. **Exact-path matching, and why case sensitivity is not the default** — that Express matches paths case-insensitively until you set `case sensitive routing`, and what that default would mean for a service documenting exactly one endpoint.
5. **Route ordering as the difference between `405` and `404`** — that a method guard registered after the `GET` and before the terminal handler is the only reason `POST /hello` reports "method not allowed" instead of "not found", and that reordering those three registrations changes what clients receive.
6. **Why `HEAD` is served rather than rejected** — that HTTP requires `HEAD` to be `GET` minus the body, that Express satisfies it through the `GET` handler, and why the `Allow` header therefore advertises `GET, HEAD`.
7. **Environment-driven configuration with defaults** — reading `HOST` and `PORT` from the environment against documented fallbacks, why `readConfig()` takes its environment as a parameter instead of reaching for the global, and why a `.env` file is not read when nothing parses one.
8. **Graceful termination on signals** — what `server.close()` actually does, why in-flight responses finish instead of being cut off mid-body, and why the banner reports the port read back from `server.address()` rather than the port that was requested.
9. **In-process HTTP testing** — driving a real Express application through supertest with no pre-running server and no fixed port, and using spies to assert behaviour such as shutdown logging that would otherwise be untestable.
