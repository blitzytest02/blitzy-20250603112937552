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

Every snippet below is an extract of a delivered file, quoted as it ships, so
the code you read here is the code that runs. What the executed test suite
proves of it is narrower than this tour: four properties of the route and
assembly modules, set out with the test file below. `src/server.js` is never
loaded by the suite, and the contract behaviours no assertion reaches are
evidenced instead by the captured transcripts in
[the API reference](api-reference.md). Where a file's own explanatory comments
are left out of a quote to keep it short, the omission is stated before the
block; nothing is shortened, renamed or tidied.

## How the three modules fit together

The service is three source modules and one test file. Each module owns
exactly one job, and the boundaries between them are what let the test suite
run with no pre-started server and no fixed port.

| File | The one job it owns | What it exports |
| --- | --- | --- |
| `src/routes/hello.js` | the route and its body | `router`, `HELLO_BODY` |
| `src/app.js` | application assembly, fall-through | `createApp` |
| `src/server.js` | the socket and process lifecycle | nothing |

The dependency direction is strictly one way. `src/server.js` requires
`src/app.js`, `src/app.js` requires `src/routes/hello.js`, and nothing
requires upwards — the route module has no idea a server exists, and the
assembly module has no idea a port does. All four JavaScript files load what
they need with `require`, and the two that something else requires —
`src/routes/hello.js` and `src/app.js` — publish what they offer with
`module.exports`. Both constructs are legal because the manifest declares
`"type": "commonjs"` [src/nodejs-tutorial/package.json:7]. The other two
files export nothing at all: `src/server.js` is the process entry point, and
`test/hello.test.js` is loaded by the test runner, so neither has a consumer
to export to — which is why the table above ends in `nothing`.

The hop-by-hop path a request takes across those modules is drawn once, as a
sequence diagram in [the request path](api-reference.md#the-request-path).
This document defines no diagram of its own; it explains the code the diagram
summarises.

The two-file split of assembly from listener is the one structural decision a
single-endpoint service cannot justify on its own size, so it is worth naming
the two reasons it exists. First, the test suite drives the object
`createApp()` returns, so it needs an application that starts no listener of
its own. Second, the Python Flask sibling in this repository is split exactly
the same way — assembly in a `create_app()` factory [src/backend/app.py:63],
listener and shutdown lifecycle in `src/backend/wsgi.py`, where
`setup_signal_handlers()` installs the handlers
[src/backend/wsgi.py:192-240] and the development listener sits behind the
`__main__` guard [src/backend/wsgi.py:479], running only under
`FLASK_ENV=development` and reaching `application.run()` there
[src/backend/wsgi.py:495-506] — and the tutorial keeps the correspondence
visible rather than inventing its own shape.

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

`HELLO_BODY` is the single definition of one specific thing: the body of the
successful `GET /hello` response, and of the `HEAD` response Express derives
from it [src/nodejs-tutorial/src/routes/hello.js:19]. It is not the only body
a client can receive on that path — the terminal handler's `NOT_FOUND_BODY`
answers an unsupported method, and Express answers `OPTIONS` with its own
allowed-method list — and [the API reference](api-reference.md) documents both
as behaviours. What the constant fixes is the representation the endpoint
exists to serve: every byte of *that* comes from one place, which is why the
assembly module never mentions it and the server module never sees it.

One definition in the request path is what stops the served bytes drifting
away from themselves — change the constant and every 200 response changes
with it, in one edit with a known blast radius.

That is a narrower claim than "the string occurs once in the repository", and
the difference is deliberate rather than an oversight. The literal recurs, in
four distinct roles:

| Role | Example |
| --- | --- |
| the authoritative definition | `src/routes/hello.js:19` |
| an independent assertion | `test/hello.test.js:56` |
| metadata and JSDoc | `package.json:5`, `routes/hello.js:22-26` |
| quoted source and captured output | the snippets in this document |

Only the first serves a byte to a client, which is why the others take nothing
away from the single-definition argument. Those examples are illustrative
rather than a census: this document alone quotes the constant in a source
extract and reproduces a test name in a table, a bullet and a run transcript,
and counting such occurrences would be neither useful nor stable. The test's
literal is the role worth dwelling on, because it is load-bearing — an
assertion that imported `HELLO_BODY` would be comparing the constant with
itself and could never fail, while an independent literal fails the moment the
constant changes without the contract changing with it. Exporting the constant
alongside the router keeps the value available to any future consumer that
wants the string rather than the bytes
[src/nodejs-tutorial/src/routes/hello.js:39].

### How the project bounds repetition

[The API reference](api-reference.md) is the single authority for the
`GET /hello` contract; no other document restates it in full, and paraphrase
is not an alternative to linking. Alongside that authority the project permits
repetition by role rather than by count, so that an occurrence fitting none of
these roles reads as drift rather than as precedent:

- **source definitions** — the body constant here, and the port and host
  defaults in `src/server.js`, each defined exactly once;
- **independent assertions** — the status, body and media type checked in
  `test/hello.test.js`, deliberately not importing what they verify;
- **descriptive metadata** — the package description, the JSDoc beside the
  handler, and the annotated `.env.example`, which record values without
  supplying them to anything at run time;
- **quoted and captured material** — source extracts, the one complete
  `curl -i` transcript of the 200 response in the tutorial README's
  verification section, and the command output reproduced in these documents,
  each copied from the file or the run rather than composed.

Everything else links. Repetition in those roles is not a weakness in the
single-definition argument either — it is what makes it checkable. A published
transcript still showing an eleven-byte `Content-Length` after the constant
has been edited is a visible failure, and the drift sweeps this project runs
over its Markdown and its source exist to catch exactly that.

### What the route module deliberately leaves out

It defines no second route and no health endpoint. It registers no `HEAD` and
no `OPTIONS` handler, because Express derives both from the one `GET`
registration — those responses are documented as behaviours in
[the API reference](api-reference.md), not implemented here. It sends no `405`
and no `Allow` header, declares no terminal not-found handler, reads no
environment variable, contains no port literal, and carries no logging or
timing instrumentation.

That last omission is deliberate, and the repository's contributor guide says
so in as many words. Its "Modern Routing Patterns" section teaches the same
three decisions this module makes — the router declares the full path so the
application mounts it at the root, the response body is produced in exactly
one place, and the response is one status-type-send chain — but it teaches
them on a route module for an endpoint the tutorial does not serve, labelled
illustrative only, and cites the delivered module by path instead of
reproducing it, so that no value of the published contract is restated there
[CONTRIBUTING.md:984-998]. The rationale for the absent instrumentation is
annotated on that illustrative handler: "No timing instrumentation either: an
endpoint that publishes no performance target gains nothing from measuring
one here" [CONTRIBUTING.md:1014-1017]. A learner reading an eleven-byte
response handler should see the response, not a stopwatch.

The same guide's "Module Organization" section documents the identical
three-module split — the route declares the endpoint, the application
assembles it, the server binds it — and names all three delivered modules by
path rather than reproducing any of them there; the sketch beneath that
prose is labelled illustrative only and mounts a router for an endpoint the
tutorial does not serve [CONTRIBUTING.md:718-728]. The three modules
described in this document are therefore the whole service: there is no
fourth module, no health route and no middleware or utility directory
anywhere in the project.

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
application object directly and manages the transport itself. No test starts
or manages a server of its own, no test knows a port number, and no two tests
share state: the transient listener `supertest` starts per request lands on a
port the OS picks. Had this module exported a singleton — or worse, called
`listen()` itself — every run would have to bind the default port and shut the
listener down again, and two tests could no longer be trusted to be
independent.

### The one-line hardening

`app.disable('x-powered-by')` switches off the header Express would otherwise
add to every response, advertising the framework serving it
[src/nodejs-tutorial/src/app.js:37]. Removing framework fingerprinting is the
cheapest hardening available to a Node service — one call, applied once during
assembly, effective on every path and every method. This repository's
contributor guide reaches for the same call in two different registers, in
both cases inside illustrative code rather than as a quotation of this
module. In its "Module Organization" section the call carries the inline
comment "Security: Remove framework fingerprinting" [CONTRIBUTING.md:744],
within the sketch that section labels illustrative only
[CONTRIBUTING.md:720-728]. In its "Security Features Utilization" section it
appears again under the comment "Framework fingerprinting prevention"
[CONTRIBUTING.md:972-973], as the one measure in that illustrative block the
tutorial actually applies — and the lead-in that says so cites the delivered
call, the one quoted above at `src/app.js:37` [CONTRIBUTING.md:951-954].

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
headers — are documented in [the API reference](api-reference.md), the first
as a behaviour its transcripts capture and the second as an absence from the
header set it publishes, each with the production alternative named. They are
recorded there rather than here because they are properties of the contract,
and this document describes the code that produces it.

## `src/server.js` — binding, the listen callback, and signals

This module turns the assembled application into a running service. It is the
only file in the tree that reads the environment, binds a socket or handles a
signal, and `node src/server.js` runs it as the process entry point
[src/nodejs-tutorial/package.json:12].

It requires the factory rather than a ready-made application —
`const { createApp } = require('./app')`
[src/nodejs-tutorial/src/server.js:26] — calls it once, and keeps the object
`listen()` returns, because the shutdown path needs that object to close
[src/nodejs-tutorial/src/server.js:274-277]. That call is conditional: the
factory runs, and a socket is opened, only when both configuration values
survive the validation described next.

### Reading configuration from the environment with a literal default

This service's whole configuration surface is two environment variables, and
the template is where their contract is written down. `PORT` is the TCP port
to bind, an integer in the unprivileged range 1024-65535, defaulting to
`3000` [src/nodejs-tutorial/.env.example:38-48]. `HOST` is the interface to
bind, defaulting to `127.0.0.1`
[src/nodejs-tutorial/.env.example:69-81]. Each is read once, in this module
and nowhere else [src/nodejs-tutorial/.env.example:49],
[src/nodejs-tutorial/.env.example:81], so there is no configuration library,
no schema file and no second place to look: the contract those two blocks
state is enforced by the two resolvers in this file, a few lines each, and
nowhere else.

Both defaults are literals *in the source*, and each is a named constant
applied by the resolver that reads its variable rather than a fallback spelled
inline at the point of use: `DEFAULT_HOST`
[src/nodejs-tutorial/src/server.js:33] and `DEFAULT_PORT`
[src/nodejs-tutorial/src/server.js:43]. Two consequences follow. The default
binding has exactly one definition in the code — the template records the same
values as documentation, not as a second source — so changing the default port
is a one-line change. And because the default is a literal rather than a
lookup, the documented commands work on a clean clone with nothing exported
and no file copied.

Four more constants sit beside them, and they are there for the same
one-definition reason. `MIN_PORT` and `MAX_PORT` hold the accepted range, the
lower bound being where unprivileged ports begin, so the tutorial never has to
be run with elevated privileges
[src/nodejs-tutorial/src/server.js:48-49]. `PORT_RULE` and `HOST_RULE` hold
the rule text each refusal quotes, stated once as data so the message a
learner reads cannot drift away from the check that produced it
[src/nodejs-tutorial/src/server.js:55-60].

`127.0.0.1` is the loopback interface, so the tutorial server is deliberately
unreachable from the network. That is a property of the default rather than of
the code: exporting `HOST` binds elsewhere.

#### What the environment hands you, and why it needs checking

An environment variable always arrives as text, and `listen()` is overloaded,
which is why the bare fallback expression — `process.env.X || literal` — is
the one thing this file deliberately does *not* do. That expression has
exactly two cases: substitute the literal when the variable is absent or
empty, and pass anything else through untouched, as the string it arrived as.
It is not a parser and not a range check, and what it would let reach
`listen()` is worth seeing measured on the pinned runtime rather than assumed:

| Value of `PORT` | What `listen()` does with it |
| --- | --- |
| `'3000'` | binds TCP 3000; a numeric string is coerced |
| `' 3000 '` | binds TCP 3000 as well — padding is tolerated, not checked |
| `'0'` | asks the OS for any free port; it assigned 38777 here |
| a non-numeric string | binds a pipe: `address()` returns a path, not a port |

The last two rows are the hazard this module's resolvers exist to close.
Requesting port `0` is a legitimate thing to do — it is how a test takes a
free port — but the port the OS assigns is knowable only from
`server.address()` after the bind, so a line built by interpolating the
*requested* value announces `:0`, an address nothing is served on. And a value
that is not a number is not rejected by `listen()` itself: Node reads a
non-numeric string as a pipe or IPC path, so a process can end up serving no
TCP port at all while still printing a URL-shaped line. Both rows were
measured on Node 24.21.0.

Neither row can happen here, because both values are parsed before anything
binds. `resolvePort()` trims what arrived, takes `DEFAULT_PORT` when it is
blank or absent, and otherwise requires base-10 digits across the whole
trimmed value and a result inside `MIN_PORT`-`MAX_PORT`, so `'3000x'`,
`'0x10'`, `'3.5'`, `'+3000'`, `'0'` and `'70000'` are refused rather than
coerced, and what reaches `listen()` is a Number
[src/nodejs-tutorial/src/server.js:122-144]. `resolveHost()` applies the same
blank-or-absent rule and refuses interior whitespace and control characters,
because that value reaches both the listener and the readiness banner, where a
carriage return would let an environment value forge a line of output
[src/nodejs-tutorial/src/server.js:152-171]. Both run before the `listen()`
call is reached, and both run on every start, so a learner who got both values
wrong is told about both in one run
[src/nodejs-tutorial/src/server.js:197-198].

A refusal is reported rather than thrown, because a configuration mistake is
the learner's to fix and not a stack trace to read: one line on standard error
naming the variable, the value as it arrived and the rule it broke, then
`process.exitCode = 1` and no socket opened at all
[src/nodejs-tutorial/src/server.js:100-107]. The value is quoted with
`JSON.stringify` there, so a newline inside it cannot forge a second line of
output and an invisible character is shown as an escape instead of vanishing
from the message. Measured on Node 24.21.0, `PORT=abc`, `PORT=80`, `PORT=0`
and `PORT=70000` each wrote nothing to stdout, printed exactly one stderr line
beginning `Invalid PORT=` and ending `Nothing was bound.`, bound no socket,
and exited `1`; `HOST='bad host'` behaved the same way, beginning
`Invalid HOST=`.

Two rules follow, and they are the transferable lesson of this file — stated
as what it does rather than as what it leaves to the reader. Parse and
range-check a value read from the environment before it reaches `listen()`,
and refuse one outside the documented range instead of binding whatever it
coerces to: the template states that range as a contract rather than as advice
[src/nodejs-tutorial/.env.example:41-48], and the resolver enforces exactly
that contract. Then announce the address the socket actually got, by reading
`server.address()` after the bind rather than the values that were asked for
[src/nodejs-tutorial/src/server.js:266-267]. The Flask sibling does the first
half the same way, which makes the two a parallel rather than a contrast: its
`validate_port_number()` parses an integer, enforces 1-65535, warns below 1024
and raises on anything else [src/backend/wsgi.py:299-333], and its docstring
records that it "Replaces Node.js port validation with Python equivalent
function" — the check is part of this project's lineage rather than an
embellishment. The one difference is where each draws the privileged-port
line: the Python function warns below 1024 and carries on, while this resolver
refuses, because the tutorial documents no path that needs elevated
privileges.

### What the listen callback proves

`listen()` starts binding the socket and returns immediately — the server is
*not* ready when the call returns. The callback passed after the host runs
once the socket is bound and accepting connections, so *on that path* the
line it prints is a genuine readiness signal rather than an optimistic
announcement [src/nodejs-tutorial/src/server.js:243-268].

That qualifier is load-bearing, because Express is not the bare `http` module
here. `app.listen()` hands its trailing callback to `server.listen()` *and*
registers it as a one-time `'error'` listener, so a failed bind — a port
already in use, an address that cannot be bound — invokes that same callback
with the error as its first argument (Express is pinned at 5.2.1
[src/nodejs-tutorial/package.json:18]). Probed on this runtime against an
occupied port, the callback was called with `EADDRINUSE`, while
`server.listening` was still `false` and `server.address()` returned `null`.

`announceListening(error)` is the pattern that follows from it, and this
module implements it rather than illustrating its absence
[src/nodejs-tutorial/src/server.js:243-268]. It declares the error parameter,
so it can tell the two cases apart. On the error path it hands the error to
`reportBindFailure()` and returns without printing anything, and that reporter
writes one line on standard error naming the errno and a remedy for it, then
sets a non-zero exit status
[src/nodejs-tutorial/src/server.js:211-225]. On the no-error path, and only
there, it writes the readiness banner
[src/nodejs-tutorial/src/server.js:267]. Measured on 24.21.0, a second
instance started against the port the first one still held printed nothing at
all on stdout, one stderr line naming `EADDRINUSE` and the remedy for it, and
exited `1`.

Two details finish the wiring, and both follow from that callback being
once-wrapped: it can report only the first event it sees. A listener error
arriving *after* startup would find it already spent, and an unhandled
`'error'` event crashes the process, so the same reporter stays registered as
a durable `'error'` listener for the listener's whole life
[src/nodejs-tutorial/src/server.js:285]. That leaves two paths able to report
one failure, which is why the reporter is latched: whichever arrives first
reports, and the other returns silently, so a single bind failure produces a
single message [src/nodejs-tutorial/src/server.js:211-215].

The callback carries one more case, and it is the one a single-endpoint
tutorial would be forgiven for missing. A signal can arrive while the socket
is still coming up — `listen()` is asynchronous, and a pending listen cannot
be cancelled — so the signal is recorded rather than acted on, and this
callback honours it the moment a listener exists by closing instead of
announcing a readiness the process is about to give up
[src/nodejs-tutorial/src/server.js:254-257].

While the service is running, that readiness banner is the only thing it
writes to stdout — there is no second banner and no per-request log. It is not
the only line the process ever prints, though: the shutdown handler logs the
signal it received, one line per run, and the next section describes it, while
every abnormal condition — a refused configuration value, a bind failure, a
forced or failed close — goes to standard error instead. Those two stdout
lines and that stderr set are the whole observability surface, because no
logging framework is installed, and the module's header comment inventories
them so the process's output can be predicted exactly
[src/nodejs-tutorial/src/server.js:19-23].

The readiness line is built from what the listener reports rather than from
what it was asked for: the address comes from `server.address()`, and
`formatAuthority()` renders it as a URL authority, bracketing an IPv6 address
so its own colons cannot run into the port separator
[src/nodejs-tutorial/src/server.js:186-192]. Reading the address back is what
makes the announcement true rather than merely consistent, and the difference
is worth stating precisely rather than comfortably: the values a bind is
*given* are not always the address it *gets* — the port-`0` row above is
exactly that case. Between them the two rules above, validate before binding
and read the bound address back, are what keep the line honest at both ends.

### Why the signal handlers matter

The shutdown path is one function and two registrations. The registrations
are the whole of the wiring:

```js
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

The `shutdown()` function they share logs the signal it received — the second
of this module's two stdout lines
[src/nodejs-tutorial/src/server.js:343] — then closes the server and lets the
drained event loop end the process
[src/nodejs-tutorial/src/server.js:304-393]. What it does *not* do is call
`process.exit()`; there is no such call anywhere in the file. The close
callback sets `process.exitCode` instead: `0` only for a shutdown that was
clean in both senses — connections drained on their own rather than being cut
mid-flight, and no listener failure was reported earlier in the run — and `1`
otherwise [src/nodejs-tutorial/src/server.js:362-388]. Setting the status
rather than exiting on it is what guarantees the lines already written are
flushed, and it leaves room for any cleanup a later lesson adds.

The drain is not unbounded either. `close()` cannot give up on its own, so one
stalled request would leave it pending forever; a ten-second grace timer is
armed alongside it, and its expiry is what keeps `Ctrl-C` responsive
[src/nodejs-tutorial/src/server.js:350-356]. The timer is `unref()`-ed so it
can never hold the process open by itself, and the close callback clears it
[src/nodejs-tutorial/src/server.js:360-363]. Measured on 24.21.0, `SIGTERM` to
a running instance printed its one shutdown line, ended the process with
status `0`, and a `curl` to the same port immediately afterwards failed to
connect — the port was released rather than left held.

Exactly two signals are handled, and both arrive in normal use.
`Ctrl-C` in the terminal running the server sends `SIGINT`; an automated run's
`kill` of the recorded process id sends `SIGTERM`
[src/nodejs-tutorial/src/server.js:395-396]. One shared handler serves both,
so neither path can drift from the other.

Without these handlers the default signal disposition would tear the process
down mid-flight. `server.close()` instead does two things in one call: it
stops the server accepting new connections, and it closes the connections that
are neither sending a request nor waiting for a response — the idle keep-alive
sockets. Its callback fires once the last in-flight request has drained, and
that is where the exit status is settled — `0` for a drain that finished on
its own — a clean close that releases the port rather than leaving it held.

#### Why `close()` alone, and not `closeIdleConnections()`

An idle keep-alive socket genuinely can hold a closing server open, and older
Node material answers that by sweeping the idle sockets with
`server.closeIdleConnections()` *before* calling `close()`. **This module
makes no such call** — `closeIdleConnections()` appears nowhere in
`src/server.js` — and on this runtime that ordering would be wrong twice over,
which is why it is absent rather than merely unmentioned. Both reasons are
worth knowing rather than inheriting.

Node's documentation settles the first. `close()` carries the history note
that as of v19.0.0 "The method closes idle connections before returning", and
`closeIdleConnections()`, added in v18.2.0, carries the note that "Starting
with Node.js 19.0.0, there's no need for calling this method in conjunction
with `server.close` to reap `keep-alive` connections", that using it "won't
cause any harm", and that it helps only where versions older than 19.0.0 must
be supported. Measured on Node 24.21.0, `close()` does more than tolerate an
idle socket: with one idle keep-alive connection held open its callback fired
in about a millisecond, and interposing on `closeIdleConnections()` shows
`close()` invoking it internally.

The second reason is about order rather than redundancy. A sweep placed before
`close()` runs while the listener is still accepting, so it closes the idle
sockets of that instant and nothing more. Measured on the same runtime, a
fresh keep-alive request issued immediately after such a sweep was accepted
and answered `200`, and the following `close()` reaped that new idle socket
anyway. Sweeping first cannot be what makes a shutdown prompt, because the
connections it closes can be replaced before `close()` is even reached.

The sequence to learn, then, is `close()` first — it is the single call that
stops accepting *and* reaps the idle sockets — with `closeIdleConnections()`
after it only where a documented reason calls for it, such as supporting a
runtime older than 19.0.0. On the pinned runtime it is redundant, which is why
this module does without it. The only close call it makes is `close()`
[src/nodejs-tutorial/src/server.js:362], and the only place it cuts
connections rather than draining them is `closeAllConnections()` — a different
method, reached only when the ten-second grace period expires
[src/nodejs-tutorial/src/server.js:354] or when a second signal arrives during
a shutdown already in progress, whoever sent the first having plainly stopped
waiting [src/nodejs-tutorial/src/server.js:316]. Both of those paths record
that connections were cut, which is what makes the exit status `1` rather than
`0`.

The Flask sibling solves the same problem the same way. Its
`setup_signal_handlers()` [src/backend/wsgi.py:192] registers one handler for
`SIGTERM` and `SIGINT` [src/backend/wsgi.py:239-240], and that handler calls
a `perform_graceful_shutdown()` whose docstring records that it "Replaces
Node.js server.close() with Python WSGI shutdown coordination"
[src/backend/wsgi.py:258-261]. Reading the two side by side is the clearest
demonstration that signal handling is a property of running a service, not of
a language.

### Why this file is absent from the coverage report

`npm run test:coverage` reports full line, branch and function coverage for
`src/app.js` and `src/routes/hello.js`, and lists no row for `src/server.js`
at all. That is a consequence of the factory export rather than a gap: the
suite requires `../src/app` and drives the object `createApp()` returns, so
this module is never loaded, never binds a port, and has no coverage to
report. A suite that required it instead would bind the default port, hold it
for the length of the run, and have to shut the server down again — which is
precisely the coupling the two-file split exists to avoid.

## `test/hello.test.js` — what each of the four tests proves

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
which manages the transport itself: it wraps the application in an HTTP server
and calls `listen(0)`, so the socket lands on whatever ephemeral port the OS
hands out rather than on a known one. That is why the suite runs while a
server is already running on the default port, and why two runs never collide
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

Each one carries its own meaning, and between them they pin four properties of
the assembled application — those four and no more. The rest of the published
contract rests on other evidence: the captured transcripts in
[the API reference](api-reference.md) for the `HEAD`, `OPTIONS`, `POST` and
conditional-`304` behaviours and for every header value, and the source itself
for the binding defaults and the shutdown path, neither of which this suite
loads. Here is what each assertion does establish:

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
  handler, and it is what keeps the fall-through in `src/app.js` covered. It
  is the only test that does not request `/hello`, and beyond the status it
  pins that handler's own plain-text `Not Found` body, its nine bytes and its
  media type in full — which is what tells the registered handler apart from
  the HTML 404 Express serves when no handler is registered. Delete the
  handler and the status is still `404`, but the body no longer matches and
  this test fails; register it ahead of the router instead and the first two
  `/hello` tests fail, because every request reaches it first
  [src/nodejs-tutorial/test/hello.test.js:80-102].

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
makes `require` legal in all four JavaScript files, and `module.exports` legal
in the two that publish anything [src/nodejs-tutorial/package.json:7] — under
`"module"` the same files would need `import`/`export` and would fail as
written. And the dependency
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
  whole of the standard output is two `console.log` lines, one at startup and
  one when a signal arrives, with every abnormal condition written to standard
  error instead; the only data is a string constant, and the four files run as
  written with no transpile step.

Two omissions sit at the protocol level rather than the architectural one: the
absent `405` with its `Allow` header, and the absent security-header
middleware. Both are observable in responses, so both are documented as
behaviours — with the production alternative named — in
[the API reference](api-reference.md), which is the single authority for
everything a client can see. This document stops at the code that produces
them.
