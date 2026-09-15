# hello-node — a Node.js tutorial serving one `GET /hello` endpoint

A self-contained Node.js and Express tutorial project that serves **exactly one endpoint**, `GET /hello`, and returns the plain-text greeting `Hello world` to the calling HTTP client. It is deliberately small: eleven bytes over a real socket, with every behaviour around those eleven bytes — the media type, the path casing, the methods the path accepts, what happens to every other path, and how the process shuts down — specified, documented and covered by tests. This project lives in `hello-node/` at the repository root and is entirely independent of the Python Flask application that also lives in this repository under `src/backend/`: it shares no code, no configuration, no port and no dependency manifest with it, and installing or running it changes nothing about the Flask service. The two can run side by side on one machine.

Every command below is runnable **as written from the `hello-node/` directory**, unless the section says otherwise (the `curl` verification commands work from any directory). Every expected output shown was measured against this project on Node.js 22.23.2 with npm 11.19.1 — nothing here is predicted.

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
| **Node.js** | 22.23.2 | JavaScript runtime; pinned in `.nvmrc` and in `engines.node` |
| **npm** | 11.19.1 | Package manager; pinned in `engines.npm` |
| **nvm** | 0.40.x (verified with 0.40.3) | Reads `.nvmrc` and selects the pinned Node.js for you. Needed only for the `nvm use` step below — Option B installs Node.js without it |
| **curl** | any recent version | Used by the verification commands to call the endpoint |

Node.js 22.23.2 is pinned twice — in `.nvmrc`, so `nvm use` selects it, and in the `engines` field of `package.json`, so npm warns if you install under a different runtime.

**Both numbers are the newest release of the line they name, which is why they differ from the repository's contributor guide** (`CONTRIBUTING.md:90-91` names Node v22.16.0 and npm v11.4.1). Staying on the right major line is not the same as being patched: 22.16.0 is behind its own 22.x line and is listed against 35 entries in the Node.js security feed, while 22.23.2 is listed against none. The npm pin moves for the same reason and one more — the npm 11.4.1 executable ships a bundled dependency tree carrying 30 published advisories of its own, and those are advisories `npm audit` over *this* project's lockfile can never show you, because they live inside the package manager rather than in the tree it installs. When you advance these numbers later, move all three locations together — `engines.node`, `.nvmrc` and the lockfile root — and re-run everything in [Verification](#verification) and [Tests](#tests).

**npm 11.19.1 is not bundled with Node.js 22.23.2, so you have to install it explicitly.** Node.js 22.23.2 ships npm **10.9.8**; installing `npm@11.19.1` yourself is what produces the pinned version. This is worth stating plainly because the repository's contributor guide claims the opposite (`CONTRIBUTING.md:91` describes npm v11.4.1 as "bundled with Node.js") — npm is a separate release train from Node.js, that claim is incorrect for any pairing, and the install step below is not optional.

### Getting Node.js 22.23.2

Pick one of these two routes before running anything in the next section. The repository's contributor guide documents the same pair (`CONTRIBUTING.md:100-128`).

**Option A — nvm, which is what the commands below assume.** `nvm` is a shell function rather than a program on your `PATH`, so it has to be installed *and loaded into the shell you are typing in*; in a shell that has not loaded it, `nvm use` fails with `nvm: command not found`. Install it, load it, and let it read `.nvmrc`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install                      # reads .nvmrc -> installs 22.23.2
nvm use                          # reads .nvmrc -> selects 22.23.2
```

```text
Found '<path>/hello-node/.nvmrc' with version <22.23.2>
Now using node v22.23.2 (npm v10.9.8)
```

The npm version nvm reports in parentheses is whichever one is installed for that runtime: `10.9.8` on a fresh install — that is the npm the official Node.js 22.23.2 distribution bundles — and `11.19.1` after you run the upgrade in the next section. `v0.40.3` is the nvm release this project was verified with; nvm's own README at <https://github.com/nvm-sh/nvm> carries the current tag, and any 0.40.x behaves the same way here. The installer appends those two `NVM_DIR` lines to your shell profile, so you only need to run them by hand in the shell you installed from — a terminal opened afterwards loads nvm on its own. Run `nvm install`/`nvm use` from the `hello-node/` directory, because that is where the `.nvmrc` they read lives.

**Option B — install Node.js 22.23.2 directly.** Download the 22.23.2 release from <https://nodejs.org/> and install it with the installer for your operating system. Then skip the `nvm use` line in the next section; every other command is unchanged.

Either way, npm 11.19.1 still has to be installed explicitly, as the next section does.

Verify the toolchain before installing anything:

```bash
node -v    # must report: v22.23.2
npm -v     # must report: 11.19.1
```

## Install and Run

From the `hello-node/` directory:

```bash
nvm use                          # reads .nvmrc -> 22.23.2
npm install -g npm@11.19.1       # required: 22.23.2 bundles npm 10.9.8
npm ci                           # restores from the committed lockfile
npm start
```

The first line needs nvm installed and loaded (Option A above). If you installed Node.js 22.23.2 directly (Option B), skip it and run the other three.

`npm ci` is the authoritative install command. It installs exactly the tree recorded in the committed `package-lock.json`, which is what makes every learner's install identical to the one this document was verified against. Expected output:

```text
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. ...
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, ...

added 347 packages, and audited 348 packages in <duration>

62 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

The package counts are fixed by the committed lockfile, so those numbers are worth checking. The elapsed time is not: npm prints whatever the run took, which is why this document shows `<duration>` in its place rather than a figure to compare against. For scale, three warm-cache runs of this exact command on the machine it was verified against reported `961ms`, `888ms` and `865ms`, and a read-only `npm ci --dry-run` over the same lockfile reported `up to date in 254ms`; a cold npm cache or a slow network makes it considerably longer.

Three things in that output are expected and none is a problem:

- **347 packages** for one declared runtime dependency. Express 5.1.0 brings a substantial transitive tree — body parsing, content negotiation, ETag generation, MIME lookup, routing and error handling — and the production-only tree is 68 of those packages. The rest are the test runner and its dependencies. The lockfile describes 348 packages, one more than are installed here, and npm's summary counts the tree it actually installed: the difference is `fsevents`, an optional macOS-only dependency Jest reaches through its file-watching layer, which Linux skips. That one-package gap is also why older notes in this repository quote 348 and 349.
- **Exactly two deprecation warnings**, `inflight@1.0.6` and `glob@7.2.3`. Both are reached transitively through Jest, neither is a package this project selects, and neither carries a security advisory against this tree. They are accepted, not fixed: resolving them would mean replacing the test runner.
- **`found 0 vulnerabilities`** — what the audit built into `npm ci` reports for this lock graph: no advisory *currently known to the registry* matches any of the 348 packages it audited. That is a point-in-time statement about known advisories, not a guarantee that installing is risk-free. Two things it does not say: an advisory published tomorrow against a package already in the lockfile would change the answer with no change to the tree, which is why `npm audit` is worth re-running rather than trusting once; and `npm ci` runs the install lifecycle scripts of the packages it installs unless you pass `--ignore-scripts` (`npm config get ignore-scripts` is `false` by default), so a clean audit is not a statement about what those scripts do.

Use `npm install` only when you have deliberately changed a dependency version in `package.json` and want to regenerate the lockfile. For simply installing the project, `npm ci` is the command.

## Expected Startup Output

`npm start` runs `node server.js`, which binds the socket and prints exactly two lines:

```text
Server listening on http://localhost:3002
Try: curl http://localhost:3002/hello
```

That is the whole banner — no emoji, no separator rule, no timestamp. The two halves of that URL reach it by different routes, and the difference is worth knowing:

- **The port is read back from the socket.** `server.js` takes it from `server.address()` once the socket is listening, not from the value that was requested, so the number printed is the port actually bound. That is what makes the ephemeral-port case honest: `startServer({ port: 0 })` asks the operating system for any free port and the banner reports the one it got, where echoing the request would have printed `:0`.
- **The host is printed as configured.** It is the `HOST` value passed straight through, not a value read back from the socket. With the default `localhost` the printed URL is directly callable, which is the case you will see. With a wildcard bind — `HOST=0.0.0.0` — the banner prints `http://0.0.0.0:3002`, and that names every interface rather than a destination: reach such a server on a concrete address of one of the interfaces it is listening on, for example `http://127.0.0.1:3002` from the same machine.

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

There is no `dotenv` dependency and none is being added, so a `.env` file is **not** read by the process. That is the whole mechanism: a value has to be in the environment of the command you run, as on the command line above. `.env.example` is a reference for a human — copying it to `.env` configures nothing, because nothing in this project parses one, and `.env.example` says so in the same words.

**Why the default port is 3002 and not the more familiar 3000.** Port 3000 is not free in this repository: the development compose service publishes it on the host as `"3000:3000"` (`infrastructure/docker/docker-compose.yml:86`), so binding it here would fail for anyone who has `docker compose up` running. 3002 is claimed by nothing else in this repository and stays close enough to 3000 to remain recognizable.

**What `PORT` accepts.** Ask for a port between 1024 and 65535 — the range a process can bind without special privilege. That range is documented here rather than policed in code: `readConfig()` is `Number(env.PORT) || 3002`, so whatever you set is coerced to a number and handed to `listen()` as it is. Two consequences of that follow, and both are worth knowing before you experiment. The first is that every falsy result of the coercion counts as absent, so an unset, empty, zero or non-numeric `PORT` — `PORT=`, `PORT=0`, `PORT=abc`, `PORT=4010abc` — resolves to 3002 with nothing printed about it; `PORT=0` is therefore not a way to ask for an ephemeral port, which is a testing affordance reached only by calling `startServer({ port: 0 })` in-process. The second is that anything coercing to a truthy number reaches the socket exactly as coerced, including values you may not have meant literally: `PORT=0x50` asks for port 80, because that is what `Number('0x50')` is, and `PORT=1e3` asks for 1000. Port 80 is inside the privileged range, so what you then see depends on who you are — an ordinary user gets a bind failure reported as `EACCES`, and only a privileged process actually gets the socket. A number outside the range above is `listen()`'s to reject, and it rejects synchronously with `ERR_SOCKET_BAD_PORT` — `PORT=65536`, `PORT=-1` and `PORT=1.5` each fail that way as the server starts, rather than quietly falling back to the default. A port in range that another process already holds fails at bind time instead, and the startup path reports it in a single line on stderr naming the code, such as `EADDRINUSE`, and then leaves the process with a nonzero exit status — `1` — instead of `0`. The status is the half of that report a machine can read, and it is what makes the failure detectable from outside: a wrapper script checking `$?`, a `set -e` step, a container entrypoint or a process supervisor sees only the status, never the stderr line, so a start that bound nothing but exited `0` would be recorded as a server that came up. Try it: start one server, then run `npm start` a second time on the same port and print `$?` — the second command reports the `EADDRINUSE` line and a nonzero status, while the first keeps its port and keeps answering.

**What `HOST` accepts.** A hostname or an IP address, passed through to `listen()` exactly as you set it. `readConfig()` is `env.HOST || 'localhost'` and nothing further happens to the value: this project adds no check of its own, so whether a name resolves is the resolver's business, and an address this machine does not own simply fails at bind time with the same single stderr line and the same nonzero exit status. That matters to a learner because it means the variable does what it appears to do — `HOST=0.0.0.0` for IPv4 and `HOST=::` for IPv6 really bind every interface on the machine, and they are honoured rather than second-guessed because binding every interface is precisely what a container deployment needs; the Python service in this repository documents `0.0.0.0` for that case and defaults to it (`src/backend/.env.example:46-49`, `src/backend/wsgi.py:105`). The default is the safe one: `localhost` is the loopback interface, reachable from this machine and from nowhere else, which is what you want for a server you are running on your own laptop. Reaching past it is a deliberate act, and the decision is the operator's — yours — rather than the server's.

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

The empty line after the `Host` field is part of the request, not page formatting. In the HTTP-message grammar the field section is followed by a bare `CRLF` — `start-line CRLF *( field-line CRLF ) CRLF [ message-body ]` (RFC 9112 §2.1) — so a server keeps reading header fields until it meets that empty line. `curl` supplies it for you; a request typed into a raw socket without it is never considered complete.

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

There is **no** health probe, **no** root route, **no** versioned prefix and **no** metrics endpoint. `/hello` is the only path that answers successfully — and it answers exactly two ways: a `GET`, with or without the tolerated trailing slash, and the `HEAD` that HTTP requires to accompany it, which returns that `GET`'s headers with no body. Every other path, and every other method on `/hello`, receives one of the two error responses in the table above. "One endpoint" is a statement about the resource, not a count of requests.

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
sleep 1                                      # let the listener bind before the first request
curl -s http://localhost:3002/hello; echo    # the body has no trailing newline, so echo ends the line
kill -TERM $pid
wait $pid; echo "exit status=$?"
```

```text
Server listening on http://localhost:3002
Try: curl http://localhost:3002/hello
Hello world
SIGTERM received: closing server...
Server closed. Goodbye!
exit status=0
```

The listening port is released, so a request made afterwards is refused rather than answered.

**Where the signal lands when you start the server through `npm`.** `npm start` does not run `node server.js` directly: it spawns a shell, and the shell runs Node, so there are three processes rather than two. npm 11.19.1 does try to pass termination signals down — its bundled `@npmcli/run-script` installs `SIGINT` and `SIGTERM` handlers and re-sends the signal to the process it spawned — but the process it spawned is that shell, and a shell which has already started `node` need not forward anything to it. Measured here on Linux, where `/bin/sh` is `dash`: `kill -TERM` on the `npm` process ended npm and the shell, while `node server.js` stayed up, kept holding the port, and printed neither shutdown line.

`Ctrl-C` is unaffected by any of this, because the terminal delivers `SIGINT` to every process in the foreground group — Node included — rather than to npm alone. Measured: both shutdown lines, then exit.

So for a backgrounded server, `node server.js &` as shown above is the reliable form. It is not that graceful shutdown requires bypassing npm; it is that the PID you capture is then Node's own, which takes the intermediate shell out of the question and makes the outcome the same on every machine.

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
| `test/unit/server.test.js` | 6 | Configuration defaults resolve to `localhost` and `3002`; `HOST` and `PORT` overrides are honoured; `readConfig()` reads `process.env`; the server logs the *bound* port; the termination path logs both lines and exits `0`; an in-process `process.emit('SIGTERM')` closes the server |

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
- **The server tests replace `console.log` and `process.exit` with Jest spies.** That is how the termination path can be asserted — the two shutdown lines and the exit status — without the test worker actually exiting partway through the run. The failed-bind status is observed differently, because `process.exitCode = 1` is a property assignment and not a call, so there is nothing to spy on: the suite saves `process.exitCode` before each test and restores it afterwards, which is also what stops a status one test set from becoming the exit status of the whole Jest run.

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
├── .nvmrc                                # pins Node.js 22.23.2 for `nvm use`
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

That split is not a stylistic preference. It is what lets the tests drive the application **in-process**: a test can `require('../../app')`, call `createApp()`, and exercise every route through supertest without anything ever binding port 3002. A single module that both registered routes and bound a socket could still keep its `listen()` call behind a `require.main === module` guard, exactly as `server.js` does at its foot, so the gain is not that importing such a module would be impossible — it is that requiring `app.js` has no listener side effect at all, and that the choice of host and port stays out of the module that defines the routes. The same division appears in the Python application in this repository, where `app.py` owns the routes and `wsgi.py` owns the process lifecycle.

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
