# Annotated walkthrough of the tutorial code

This document is the annotated code tour of the Node.js tutorial service: what
each delivered file does, why it is shaped that way, and which constructs a
learner has to understand before the code reads as obvious. It is one of three
documents with deliberately separate jobs. The tutorial README is for
*running* the service, [the API reference](api-reference.md) is the single
authority for the `GET /hello` contract, and this document is for
*understanding the code*. Where something about the contract is needed here it
is linked rather than restated: one document is authoritative, and the
value-level repetitions the project permits elsewhere are a closed, validated
set rather than an invitation to paraphrase.

Every snippet below is an extract of a delivered file, quoted as it ships.
That is what makes the code you read here the same code the executed test
suite proves. Where a file's own explanatory comments are left out of a quote
to keep it short, the omission is stated before the block; nothing is
shortened, renamed or tidied.

## How the three modules fit together

The service is three source modules and one test file. Each module owns
exactly one job, and the boundaries between them are what let the test suite
run without binding a port.

| File | The one job it owns | What it exports |
| --- | --- | --- |
| `src/routes/hello.js` | the route and its body | `router`, `HELLO_BODY` |
| `src/app.js` | application assembly, fall-through | `createApp` |
| `src/server.js` | the socket and process lifecycle | nothing |

The dependency direction is strictly one way. `src/server.js` requires
`src/app.js`, `src/app.js` requires `src/routes/hello.js`, and nothing
requires upwards — the route module has no idea a server exists, and the
assembly module has no idea a port does. All four JavaScript files use
`require` and `module.exports`, which is legal because the manifest declares
`"type": "commonjs"` [src/nodejs-tutorial/package.json:7].

The hop-by-hop path a request takes across those modules is drawn once, as a
sequence diagram in [the request path](api-reference.md#the-request-path).
This document defines no diagram of its own; it explains the code the diagram
summarises.

The two-file split of assembly from listener is the one structural decision a
single-endpoint service cannot justify on its own size, so it is worth naming
the two reasons it exists. First, the test suite drives the object
`createApp()` returns, so it needs an application that is not already bound to
a socket. Second, the Python Flask sibling in this repository is split exactly
the same way — assembly in a `create_app()` factory [src/backend/app.py:63],
listener and shutdown lifecycle in [src/backend/wsgi.py:192] — and the
tutorial keeps the correspondence visible rather than inventing its own shape.

## `src/routes/hello.js` — one route, one body constant

The module declares its dependency, builds a router, and names the response
body. Quoted with the file's own comments left out:

```js
const express = require('express');

const router = express.Router();

const HELLO_BODY = 'Hello world';
```

`express.Router()` returns a mountable request handler of its own
[src/nodejs-tutorial/src/routes/hello.js:14]. Using one keeps route
registration out of application assembly: this file decides what `/hello`
answers, and `src/app.js` decides only where the router is mounted.

The route itself is a single synchronous arrow function. Quoted with the
handler's explanatory comment left out, this is the whole of the rest of the
file:

```js
router.get('/hello', (req, res) => {
  res.status(200).type('text/plain').send(HELLO_BODY);
});

module.exports = { router, HELLO_BODY };
```

`router.get('/hello', ...)` registers the full path rather than a bare `'/'`,
which is why `src/app.js` can mount the router at the application root without
the path being nested twice [src/nodejs-tutorial/src/routes/hello.js:28].

### The status-type-send chain, link by link

The one line inside the handler is three method calls, each returning the
response object so the next can be chained onto it:

- `res.status(200)` sets the status code and nothing else. It writes no
  header and sends no byte; on its own it would leave the request hanging.
- `.type('text/plain')` sets the `Content-Type`. The short form is expanded by
  Express into the full media type with its charset parameter, which is why
  the code never spells the parameter out.
- `.send(HELLO_BODY)` writes the body and ends the response. Passing a string
  is what makes Express derive `Content-Length` from the body's byte length
  and compute its default weak `ETag` over those same bytes.

The `ETag` is left enabled deliberately rather than switched off as noise: a
repeat request carrying a matching validator then answers `304`, which is the
conditional-request lesson [the API reference](api-reference.md) documents with
a captured transcript.

### Why the body is a constant rather than an inline literal

`HELLO_BODY` is the one and only definition of the response body in the whole
codebase [src/nodejs-tutorial/src/routes/hello.js:19]. Nothing else declares
the string: the assembly module never mentions it, and the server module never
sees it. A single definition is what makes the body unable to drift between
the handler, the documentation and the byte counts — change the constant and
every response changes with it, in one edit with a known blast radius.

The test file is the deliberate exception. It compares against its own
literal, rather than importing `HELLO_BODY`, because an assertion that
imported the constant would be comparing the constant with itself and could
never fail. Exporting the constant alongside the router keeps that choice
available to any future consumer that wants the value rather than the bytes.

### What the route module deliberately leaves out

It defines no second route and no health endpoint. It registers no `HEAD` and
no `OPTIONS` handler, because Express derives both from the one `GET`
registration — those responses are documented as behaviours in
[the API reference](api-reference.md), not implemented here. It sends no `405`
and no `Allow` header, declares no terminal not-found handler, reads no
environment variable, contains no port literal, and carries no logging or
timing instrumentation.

That last omission is a deliberate divergence from a variant this repository
already published. The router at [CONTRIBUTING.md:435-465] shows the same
`res.status(200).type('text/plain')` chain, but registers `router.get('/', ...)`
at [CONTRIBUTING.md:447] and wraps the handler in `process.hrtime.bigint()`
timing with a `console.log` of the elapsed milliseconds at
[CONTRIBUTING.md:448-459]. The delivered module drops the instrumentation: a
learner reading an eleven-byte response handler should see the response, not a
stopwatch. The project tree at [CONTRIBUTING.md:491-504] likewise names
`health.js`, three `middleware/` modules and two `utils/` modules that no
longer exist; the three modules described here are the whole service.

## `src/app.js` — assembly, hardening, and the terminal handler

This is the entire module, quoted with its comments left out:

```js
const express = require('express');

const { router } = require('./routes/hello');

const NOT_FOUND_BODY = 'Not Found';

function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(router);

  app.use((req, res) => {
    res.status(404).type('text/plain').send(NOT_FOUND_BODY);
  });

  return app;
}

module.exports = { createApp };
```

Note what the require line destructures: only `router` is taken from
`{ router, HELLO_BODY }` [src/nodejs-tutorial/src/app.js:14]. The body string
is the route module's business, so this file never restates it.

Requiring this module has no side effects at all. It binds no socket, reads no
environment variable and starts nothing — everything happens inside
`createApp()`, and only when something calls it.

### Why a factory instead of a shared application

`module.exports = { createApp }` exports a function, never a ready-made
application instance [src/nodejs-tutorial/src/app.js:60]. Each call assembles
and returns a fresh Express application
[src/nodejs-tutorial/src/app.js:31-58].

That single decision is what makes the test suite cheap. Every test calls
`createApp()` and hands the result straight to `supertest`, which drives the
application object directly and manages the transport itself. No test starts a
server, no test knows a port number, and no two tests share state. Had this
module exported a singleton — or worse, called `listen()` itself — every run
would have to bind and release a socket, and two tests could no longer be
trusted to be independent.

### The one-line hardening

`app.disable('x-powered-by')` switches off the header Express would otherwise
add to every response, advertising the framework serving it
[src/nodejs-tutorial/src/app.js:37]. Removing framework fingerprinting is the
cheapest hardening available to a Node service — one call, applied once during
assembly, effective on every path and every method. This repository's
contribution guide already documented this exact call, under the comment
"Framework fingerprinting prevention" [CONTRIBUTING.md:421-422], and the
delivered module adopts it verbatim.

### Middleware order, and how a terminal handler differs from a route

Express runs what you register in the order you register it, so the two
`app.use()` calls above are ordered on purpose.

- `app.use(router)` mounts the router at the application root, with no path
  prefix, because the route module already declares the full path
  [src/nodejs-tutorial/src/app.js:41].
- The function registered after it is the terminal handler
  [src/nodejs-tutorial/src/app.js:50-55]. It is registered last, and that
  position is load-bearing rather than tidy.

The difference between the two is worth stating plainly. A route matches a
specific method and a specific path, and answers only requests that match
both. The terminal handler matches nothing in particular: it is plain
middleware with no path, so it is reached for any request that has travelled
past every route above it without a response being sent. Registered before the
router, the same function would answer everything and the route would never
run. Registered last, it runs only when nothing else has, which is exactly the
definition of "not found".

It takes `(req, res)` and no `next`, because it is the end of the line — there
is nothing after it to hand the request on to. Its body is the same chain the
route uses, with a different status and a different constant. That constant,
`NOT_FOUND_BODY`, is named once for the same reason `HELLO_BODY` is
[src/nodejs-tutorial/src/app.js:18].

### What the assembly module deliberately leaves out

There is no `405` and no `Allow` header: Express 5 falls through to the
terminal handler for an unsupported method on a matched path, so the tutorial
documents the real fall-through rather than dressing it up. There is no
security-header middleware, no body parser, no CORS layer, no per-request
logging, no error-handling middleware with an `(err, req, res, next)`
signature, and no `listen()` call.

Both protocol-level omissions — the absent `405` and the absent security
headers — are documented as observable behaviours, with the production
alternative named, in [the API reference](api-reference.md). They are recorded
there rather than here because they are properties of the contract, and this
document describes the code that produces it.

## `src/server.js` — binding, the listen callback, and signals

This module turns the assembled application into a running service. Quoted
with its comments left out, the configuration reads and the bind are four
lines:

```js
const { createApp } = require('./app');

const HOST = process.env.HOST || '127.0.0.1';

const PORT = process.env.PORT || 3000;

const server = createApp().listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT} (GET /hello)`);
});
```

`createApp()` is called exactly once here, and the value `listen()` returns is
kept in `server` because the shutdown handler below needs it
[src/nodejs-tutorial/src/server.js:36].

### Reading configuration from the environment with a literal default

`process.env.HOST || '127.0.0.1'` and `process.env.PORT || 3000` are the whole
of this service's configuration handling
[src/nodejs-tutorial/src/server.js:24], [src/nodejs-tutorial/src/server.js:34].
The pattern is worth reading slowly, because it is the one a learner will
reuse everywhere: read the variable, and fall back to a literal when it is
absent or empty. No configuration library, no schema, no validation layer.

Two consequences follow from the literals being *here*. The default binding
has exactly one definition in the source tree, and this file owns the only
`process.env.PORT` read in it — so a change to the default port is a
one-line change. And because the fallback is a literal rather than a lookup,
the documented commands work on a clean clone with nothing exported and no
file copied.

`127.0.0.1` is the loopback interface, so the tutorial server is deliberately
unreachable from the network. That is a property of the default, not of the
code: exporting `HOST` binds elsewhere, and the startup line interpolates
whatever was set, so an override is visible in the URL the server announces.

### What the listen callback proves

`listen()` starts binding the socket and returns immediately — the server is
*not* ready when the call returns. The callback passed as its third argument
runs once the socket is actually bound and accepting connections, which makes
the line it prints a genuine readiness signal rather than an optimistic
announcement [src/nodejs-tutorial/src/server.js:36-41].

That line is the only output this application ever writes to stdout during
normal operation: no startup banner, no per-request log. It is built from the
same `HOST` and `PORT` values the bind used, by template interpolation, so it
cannot claim a URL the process is not serving.

### Why the signal handlers matter

The shutdown path is one function and two registrations, quoted with the
file's comments left out:

```js
function shutdown(signalName) {
  console.log(`${signalName} received: closing server`);

  server.closeIdleConnections();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

Exactly two signals are handled, and both arrive in normal use.
`Ctrl-C` in the terminal running the server sends `SIGINT`; an automated run's
`kill` of the recorded process id sends `SIGTERM`
[src/nodejs-tutorial/src/server.js:64-65]. One shared handler serves both, so
neither path can drift from the other.

Without these handlers the default signal disposition would tear the process
down mid-flight. `server.close()` instead stops accepting new connections and
fires its callback once the last in-flight request has drained, and the
process exits `0` from there — a clean close that releases the port rather
than leaving it held. `server.closeIdleConnections()` is called first because
an idle keep-alive socket would otherwise hold a closing server open until it
timed out, which is what turns a clean shutdown into a puzzling five-second
pause [src/nodejs-tutorial/src/server.js:57].

The Flask sibling solves the same problem the same way, with Python signal
handlers registered for `SIGTERM` and `SIGINT` around a graceful shutdown
[src/backend/wsgi.py:192-224]. Reading the two side by side is the clearest
demonstration that signal handling is a property of running a service, not of
a language.

### Why this file is absent from the coverage report

`npm run test:coverage` reports full line, branch and function coverage for
`src/app.js` and `src/routes/hello.js`, and lists no row for `src/server.js`
at all. That is a consequence of the factory export rather than a gap: the
suite requires `../src/app` and drives the object `createApp()` returns, so
this module is never loaded, never binds a port, and has no coverage to
report. A suite that required it instead would bind a real socket, occupy a
port, and have to shut the server down again — which is precisely the coupling
the two-file split exists to avoid.

## `test/hello.test.js` — what each of the four assertions proves

Four flat, top-level `test()` declarations, using the runner and the assertion
library that ship with Node. The imports are the whole of the setup:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
```

There is no `describe` block, no `beforeEach`, and no shared fixture. Each
test builds its own application and makes its own request, which is what the
first test shows in full — quoted with its comments left out:

```js
test('GET /hello responds 200', async () => {
  const res = await request(createApp()).get('/hello');

  assert.strictEqual(res.status, 200);
});
```

`request(createApp())` hands a freshly assembled application to `supertest`,
which manages the transport itself. No socket is bound at a known address and
no port is occupied, so the suite runs while a server is already running on
the default port, and two runs never collide
[src/nodejs-tutorial/test/hello.test.js:37-43].

### The four test names and the property each one pins

The names are published output — the runner prints each one verbatim — so
they are reproduced here exactly as they are declared.

| Test name | What that assertion proves |
| --- | --- |
| `GET /hello responds 200` | the route exists and is reachable |
| `GET /hello body is exactly "Hello world"` | the body is byte-exact |
| `GET /hello Content-Type is text/plain; charset=utf-8` | the media type |
| `unknown path responds 404` | unmatched paths reach the terminal |

Each one carries its own meaning, and the four together are the reason the
published contract can be stated as fact:

- **`GET /hello responds 200`** proves the route exists and is reachable. It
  asserts `res.status` only, so it fails if the router was never mounted, if
  the path was registered as something other than `/hello`, or if the request
  fell through to the terminal handler
  [src/nodejs-tutorial/test/hello.test.js:42].
- **`GET /hello body is exactly "Hello world"`** proves the bytes, not a
  resemblance. It compares `res.text` against its own literal and then asserts
  `Buffer.byteLength(res.text)` is `11`
  [src/nodejs-tutorial/test/hello.test.js:56-61]. The length is measured on
  the received body rather than read from a header, so it proves the bytes
  instead of trusting the claim — and eleven of them means one interior space
  and no trailing newline. The literal is spelled out rather than imported
  from the route module on purpose: an assertion that imported the constant
  would compare it with itself and could never fail.
- **`GET /hello Content-Type is text/plain; charset=utf-8`** proves the media
  type is the one the contract fixes. It compares the header value in full,
  charset parameter included, so a handler that dropped the parameter or sent
  JSON fails here rather than silently serving a different representation
  [src/nodejs-tutorial/test/hello.test.js:73]. The header name is read in
  lower case because Node normalises response header names.
- **`unknown path responds 404`** proves unmatched paths reach the terminal
  handler. It is the only test that does not request `/hello`, and it is what
  keeps the fall-through in `src/app.js` covered: a terminal handler that had
  been registered before the router, or not at all, fails this assertion
  [src/nodejs-tutorial/test/hello.test.js:80-86].

### How the runner finds this file

The `test` script is bare `node --test`, with no path argument. When
`node --test` walks the project and meets a directory named `test`, every
`.js`, `.cjs` and `.mjs` file inside it is treated as a test file without
having to match any naming convention. `test/hello.test.js` therefore needs no
glob, no configuration file and no registration anywhere.

Adding a path argument to tidy the script up is a trap worth naming, because
it is not a silent no-op. `node --test test/` and `node --test test` both fail
on Node 24.21.0 — the directory is resolved as an entry module, and the run
ends with `Error: Cannot find module '<project>/test'` and exit status `1`.
Only the bare form, or an explicit file path such as
`node --test test/hello.test.js`, works.

### Running the suite

**Command:**

```bash
npm test
```

**Output (per-test and total durations vary between runs):**

```text
> nodejs-hello-tutorial@1.0.0 test
> node --test

✔ GET /hello responds 200 (12.519074ms)
✔ GET /hello body is exactly "Hello world" (2.303861ms)
✔ GET /hello Content-Type is text/plain; charset=utf-8 (1.911449ms)
✔ unknown path responds 404 (1.957418ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 128.611019
```

`suites 0` is the visible consequence of the flat declarations: there is no
nesting to report. Read `tests 4` and `pass 4` rather than the exit status
alone — `node --test` exits `0` on an empty suite too, so a run that
discovered nothing looks like a pass if only the status is checked.

### Why the suite never requires the server module

Nothing in the file requires `../src/server`, and nothing should. Requiring it
would execute that module's top-level code, which calls `listen()` — the suite
would bind the default port, collide with any server already running, and
leave a process to shut down. It would also pull `src/server.js` into the
coverage report, where its listener and signal handlers could only ever show
as uncovered lines. Driving the exported factory instead is what keeps the
suite portable and the coverage report honest.

## `package.json` — scripts, packages, and the runtime pin

Four scripts, quoted exactly as the manifest declares them
[src/nodejs-tutorial/package.json:11-16]:

```json
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test",
    "test:coverage": "node --test --experimental-test-coverage"
  },
```

| Script | Command | What it is for |
| --- | --- | --- |
| `start` | `node src/server.js` | run the server |
| `dev` | `node --watch src/server.js` | run with restart-on-change |
| `test` | `node --test` | run the suite, no path argument |
| `test:coverage` | `node --test --experimental-test-coverage` | add coverage |

Every one of them is a plain Node invocation. There is no build step, no
pre-script, and no task runner: what the script line says is exactly what runs.
The coverage flag is marked experimental by Node, and is named as such here
rather than presented as a stable interface.

Three other fields carry weight. `"private": true` marks the package as
unpublishable, which is right for a tutorial that is read rather than
installed [src/nodejs-tutorial/package.json:4]. `"type": "commonjs"` is what
makes `require` and `module.exports` legal in all four JavaScript files
[src/nodejs-tutorial/package.json:7] — under `"module"` the same files would
need `import`/`export` and would fail as written. And the dependency
declarations are deliberately small: `express` at `5.2.1` under `dependencies`
because the service needs it at runtime, and `supertest` at `7.2.2` under
`devDependencies` because only the suite does
[src/nodejs-tutorial/package.json:17-22]. Both are exact versions with no
range operator, and the committed `package-lock.json` pins the resulting
eighty-nine-package tree at `lockfileVersion` 3, which is what makes an
install reproducible rather than merely successful.

### The runtime pin, and why it appears in two places

The pinned runtime is Node 24.21.0, and it is declared twice because the two
declarations do different jobs. Neither is a hard gate, and it is worth being
precise about that rather than comfortable.

- `.nvmrc` holds the exact string `24.21.0`
  [src/nodejs-tutorial/.nvmrc:1]. This is **selection, not enforcement**: a
  version manager reads the file and activates that version. Nothing else
  consults it — not Node, not npm, not the scripts.
- `engines.node` is `">=24.21.0 <25"`
  [src/nodejs-tutorial/package.json:8-10]. This is a **compatibility range,
  not an exact pin**, and npm only **warns** on a mismatch by default;
  `engine-strict` is off unless it has been configured. It states the
  supported major and the floor. It does not prevent an install, and it does
  not prevent the scripts from running, on a different version.

Together they make the intended version the one a learner gets by default, and
make a mismatch visible when it happens: the version manager picks 24.21.0 up
automatically, and an install on anything else prints an `EBADENGINE` warning
naming both the required range and the version in use. Neither step stops a
mismatched run, which is why the enforcement a learner can actually rely on is
the verification step — `node --version` reporting `v24.21.0` before anything
else is attempted. The tutorial README's prerequisites section makes that
check the first command for exactly this reason.

## Why the built-ins

The most consequential dependency decision in this project is what it leaves
out. Four packages a reader would expect in a Node tutorial are absent, each
replaced by something the runtime already provides.

| Expected package | Replaced by | Why the built-in suffices |
| --- | --- | --- |
| jest | `node --test` | stable since Node 20, needs no config |
| nodemon | `node --watch` | built into Node 24 |
| dotenv | `node --env-file` | built into the runtime |
| chai or `expect` | `node:assert/strict` | ships with the runtime |

The cost of the conventional choice is measurable, so it is measured rather
than asserted. On **Node 24.21.0 with npm 11.19.0**, the manifest as delivered
— `express@5.2.1` plus `supertest@7.2.2` — locks **89 packages**. Adding
`jest@30.5.1` to that same manifest locks **403**, and makes npm report that
two packages have install scripts, `@parcel/watcher@2.6.0` and
`unrs-resolver@1.12.2`, on every install. The figure belongs to that exact
manifest and those exact versions: an older Jest line resolves a smaller tree,
so the number should be re-measured rather than quoted if any of the three
versions changes. What does generalise is the shape of the comparison — the
test framework would be several times the size of the service it tests.

`node --watch` gives `npm run dev` its restart-on-change behaviour with no
watcher dependency at all, and Node 24.21.0 offers `--watch-path` and
`--watch-kill-signal` alongside it for the cases where the default is not
enough. `node:assert/strict` supplies the assertions the suite uses, which is
why no matcher library appears in `devDependencies`. And `node --env-file`
loads a whole environment file, which is the capability `dotenv` is usually
installed for; it was verified loading `PORT` and `HOST` from this project's
template on 24.21.0, and the exact invocation is documented once, in
[the README's configuration section](../README.md#configuration), rather than
repeated here.

This repository has form here, which is why the decision is easier to trust
than it looks. Its Python suite records in its own docstring that it "Replaces
app.test.js Jest test suite" [src/backend/tests/test_app.py:4] and "Shows
pytest assertion patterns replacing Jest expect() syntax"
[src/backend/tests/test_app.py:16] — the test style has already been migrated
once. One difference in shape is worth noticing while reading the two suites
together: the Flask tests are organised into classes
[src/backend/tests/test_app.py:59], while the Node suite is four flat
top-level `test()` calls with no grouping at all.

### How `.env.example` is consumed

This is the one place a precise statement matters more than a convenient one.
`npm start` runs `node src/server.js` and `npm run dev` runs
`node --watch src/server.js` [src/nodejs-tutorial/package.json:12-13].
**Neither passes `--env-file`.** Neither script reads `.env`, and neither
reads `.env.example`; both see only variables already exported in the shell,
and `src/server.js` applies its literal defaults for anything absent.

So `.env.example` is a reference and export template: it documents the two
variables, their defaults and their effects, and nothing loads it implicitly.
The documented way to change one value for a run is to export it on the
command line — `PORT=3001 npm start` — and the way to load the template as a
whole is Node's own loader, the invocation
[the README's configuration section](../README.md#configuration) carries.

## What this service deliberately does not have

A learner arriving from a framework tutorial with a database attached needs
the absences here stated positively, because every one of them is a decision
rather than an unfinished edge.

What runs is **one Node process, binding one TCP port on the loopback
interface**. That is the entire runtime topology: `npm start` starts it, a
signal stops it, and nothing else participates.

- **No datastore and no cache.** Nothing is persisted, nothing is read, and
  there is no schema, migration or connection string anywhere in the project.
- **No outbound network call.** The process makes no request of its own, so it
  works offline once the dependencies are installed.
- **No second process.** No worker, no queue, no scheduler, no sidecar, and no
  container — a single `node` process is the whole service.
- **No authentication, API versioning or rate limiting.** No credentials are
  required and none are checked, on any path or method.
- **No UI.** The response is eleven plain-text bytes, so there is nothing to
  render and no client to build.
- **No logging framework, ORM, bundler, template engine or TypeScript.** The
  only output is the one startup line, the only data is a string constant, and
  the four files run as written with no transpile step.

Two omissions sit at the protocol level rather than the architectural one: the
absent `405` with its `Allow` header, and the absent security-header
middleware. Both are observable in responses, so both are documented as
behaviours — with the production alternative named — in
[the API reference](api-reference.md), which is the single authority for
everything a client can see. This document stops at the code that produces
them.
