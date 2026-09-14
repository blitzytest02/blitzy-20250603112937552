/**
 * Binds the hello-node tutorial application to a real TCP socket and owns the
 * process lifecycle around it.
 *
 * Educational Focus: Demonstrates the half of a Node service that `app.js`
 * deliberately does not do. The application module assembles routes and nothing
 * else — it never reads process.env, never chooses a port and never calls
 * listen(). This module owns all three of those, plus everything that follows
 * from holding an operating-system resource: reading configuration from the
 * environment against documented defaults, binding the socket, announcing the
 * address a client should actually call, and closing the socket cleanly when the
 * process is asked to stop. Splitting the two responsibilities is what makes the
 * application testable in-process, because a test can require `./app` and drive
 * its routes without anything ever binding a port.
 *
 * The provenance of this split is visible in the sibling Python service in this
 * repository: `src/backend/wsgi.py` opens by stating that it "Replaces Node.js
 * server.js functionality", and it owns exactly these same responsibilities —
 * HOST/PORT resolution (wsgi.py:105-106) and signal handling for graceful
 * shutdown (wsgi.py:192-256) — while `src/backend/app.py` owns the routes. The
 * two runtimes are different; the division of labour is the same one.
 *
 * Key Learning Concepts:
 * - Environment-driven configuration with documented defaults: HOST and PORT are
 *   the only two variables this server reads, both optional, both falling back to
 *   a value written down in `.env.example` rather than hidden in the code.
 * - readConfig() takes its environment as a parameter instead of reaching for the
 *   global. That single design choice is what makes configuration resolution a
 *   pure function a test can call with any environment it likes.
 * - The startup banner reports the port that was actually BOUND, read from
 *   server.address(), not the port that was requested. The two differ whenever
 *   the requested port is 0, which asks the operating system to pick a free one:
 *   printing the requested value would announce "http://localhost:0", an address
 *   no client can call.
 * - Graceful termination: on SIGTERM or SIGINT the server stops accepting new
 *   connections and lets in-flight responses finish before the process exits,
 *   instead of dropping them mid-flight the way an unhandled signal would.
 * - The `require.main === module` entry-point guard, which is how one CommonJS
 *   file can be both a runnable program (`node server.js`) and an importable
 *   module (`require('./server')`) without the import starting a server.
 *
 * @module server
 * @returns {import('http').Server} Through its startServer() function: the
 *   listening HTTP server, with SIGTERM and SIGINT handlers already registered.
 * @example
 * // What `npm start` does, spelled out:
 * const { startServer, readConfig } = require('./server');
 * const server = startServer(readConfig());
 * // Server listening on http://localhost:3002
 * // Try: curl http://localhost:3002/hello
 *
 * // What a test does, asking the OS for any free port:
 * const ephemeral = startServer({ host: '127.0.0.1', port: 0 });
 * console.log(ephemeral.address().port); // e.g. 39451
 */

// The only contact this module has with the application: a factory that hands
// back a configured Express app with no socket bound. Requiring `./app` cannot
// start a server, which is precisely the point of the split.
const { createApp } = require('./app');

/**
 * Network interface the server binds when HOST is not set.
 *
 * Educational Note: `localhost` resolves to the loopback interface, so an
 * unconfigured tutorial server is reachable from this machine and from nowhere
 * else — the safe default for code a learner runs on a laptop. This follows the
 * direct-development convention the repository's existing environment template
 * documents (src/backend/.env.example:40-52). The sibling Python module defaults
 * to `0.0.0.0` instead (src/backend/wsgi.py:105) because a containerized process
 * must accept traffic on every interface to be reachable at all; that is the
 * container convention, not this one.
 *
 * @constant {string}
 */
const DEFAULT_HOST = 'localhost';

/**
 * TCP port the server binds when PORT is not set.
 *
 * Educational Note: 3002 rather than the more familiar 3000, because 3000 is not
 * free in this repository: the development compose service publishes it on the
 * host as "3000:3000" (infrastructure/docker/docker-compose.yml:86) and the image
 * declares `ENV PORT=3000` (infrastructure/docker/Dockerfile:54), so binding it
 * would fail for anyone running `docker compose up`. 3001, 5678 and 8000 are
 * taken by the same stack (the Python default is 8000, src/backend/wsgi.py:106).
 * 3002 collides with none of them and stays close enough to be recognizable.
 *
 * @constant {number}
 */
const DEFAULT_PORT = 3002;

/**
 * The termination signals this server handles.
 *
 * Educational Note: SIGTERM is what a process manager, a container runtime or
 * `kill` sends to ask a process to stop; SIGINT is what Ctrl-C sends. Both mean
 * "please finish and exit", so both get the same graceful treatment, registered
 * from this one list below. Only these two are handled: the Python sibling also
 * traps SIGUSR1 and SIGUSR2 (src/backend/wsgi.py:243-246) for advanced process
 * management, which a tutorial does not need.
 *
 * @constant {string[]}
 */
const TERMINATION_SIGNALS = ['SIGTERM', 'SIGINT'];

/**
 * Resolves the server's listening configuration from an environment.
 *
 * Educational Focus: Configuration resolution is kept in its own pure function,
 * separate from the act of binding a socket. Because the environment arrives as a
 * defaulted parameter rather than being read from the global `process.env` inside
 * the body, a test can call readConfig({ PORT: '4010' }) and assert the result
 * without mutating the environment of the whole test process — and both sides of
 * each fallback stay reachable, which is what keeps this module at full branch
 * coverage.
 *
 * Key Learning Concepts:
 * - Default parameter values (`env = process.env`) let one function serve both
 *   the real caller and the test caller.
 * - Environment variables are always strings, so PORT needs Number() before it
 *   can be handed to listen().
 * - `||` falls back on every falsy value, not just undefined. A missing PORT, an
 *   empty PORT and a non-numeric PORT (Number('abc') is NaN) therefore all
 *   resolve to the documented default, which is the behaviour a tutorial wants:
 *   an unusable value never silently becomes an unusable server. The same rule
 *   means PORT=0 resolves to 3002 as well, because Number('0') is falsy — this
 *   reader treats a zero as absent. Asking the operating system for an ephemeral
 *   port is a testing affordance reached by calling startServer({ port: 0 })
 *   directly; it is not an operator option, and PORT=0 does not request one.
 *
 * @param {Object<string, string|undefined>} [env=process.env] Environment to read
 *   HOST and PORT from. Defaults to this process's own environment.
 * @returns {{host: string, port: number}} The host and port to bind, with every
 *   unset, empty or non-numeric value replaced by its documented default.
 * @example
 * readConfig({});                              // { host: 'localhost', port: 3002 }
 * readConfig({ HOST: '0.0.0.0' });             // { host: '0.0.0.0',  port: 3002 }
 * readConfig({ PORT: '4010' });                // { host: 'localhost', port: 4010 }
 * readConfig();                                // reads process.env
 */
function readConfig(env = process.env) {
  // These two variables are the entire configuration surface of this server.
  // Nothing else is read — no NODE_ENV, no LOG_LEVEL, no .env file (there is no
  // dotenv dependency; `.env.example` documents these two variables for a human,
  // it is not parsed by this module).
  return {
    host: env.HOST || DEFAULT_HOST,
    port: Number(env.PORT) || DEFAULT_PORT
  };
}

/**
 * Binds the application to a socket and registers graceful-termination handlers.
 *
 * Educational Focus: The idiomatic Express listening pattern in one function —
 * build the app with the factory, call listen(port, host, callback), and KEEP the
 * returned http.Server. Keeping it matters: the server object is the only handle
 * through which the socket can later be closed, and it is also the only place
 * that knows which port was really bound. The banner is therefore logged from
 * inside the listen callback, on the invocation that reports a successful bind,
 * and reads its port from server.address().
 *
 * Key Learning Concepts:
 * - app.listen() is a thin wrapper over http.createServer(app).listen(); the
 *   value it returns is a Node http.Server, not an Express application.
 * - The callback has two invocations, and only one of them describes a socket
 *   that exists. Express calls it with no argument on the 'listening' event, and
 *   with the error instead when the bind failed (the bullet below has the
 *   mechanism). That is why the banner is printed from the no-argument
 *   invocation and why nothing on the failure path reads an address.
 * - server.address().port is the bound port. With port 0 the operating system
 *   chooses a free one, and only the bound value is callable.
 * - Express 5 calls this callback on EITHER outcome, which is why it takes an
 *   error parameter. `app.listen` wraps the final function argument with once()
 *   and registers it as `server.once('error', done)` as well as passing it to
 *   server.listen() as the 'listening' callback (express/lib/application.js:
 *   598-606). This is Express-specific: a plain Node http/net listen callback
 *   receives no error at all. Measured on the version this project pins, Express
 *   5.1.0: a callback written without the parameter reaches
 *   `server.address().port` on a failed bind, where address() is null, and dies
 *   with `TypeError: Cannot read properties of null (reading 'port')` — and the
 *   TypeError thrown inside the error handler aborts the emit, so the original
 *   EADDRINUSE is never reported at all. Branching on the argument is what keeps
 *   the real cause visible.
 * - The HOST value is passed through to listen() with no validation. An operator
 *   who sets HOST=0.0.0.0 does bind every interface, which the repository's own
 *   template documents as legitimate for container deployment; rejecting a value
 *   the sibling runtime treats as valid would be a surprising restriction in a
 *   tutorial. The default is the safe one, the override is the operator's call.
 * - Signal handlers are registered here rather than at module scope, so merely
 *   importing this module never installs process-wide handlers.
 *
 * @param {{host: string, port: number}} config Host and port to bind, normally
 *   produced by readConfig(). A port of 0 asks the OS for any free port.
 * @returns {import('http').Server} The HTTP server, returned before the socket
 *   has finished binding. By the time the callback above has run it is either
 *   listening, with the banner printed, or the bind has failed — and in that
 *   case the original error has already been reported to stderr, the process has
 *   been asked to exit 1, and this server's address() is null.
 * @example
 * const server = startServer({ host: 'localhost', port: 3002 });
 * // Server listening on http://localhost:3002
 * // Try: curl http://localhost:3002/hello
 */
function startServer(config) {
  const server = createApp().listen(config.port, config.host, (error) => {
    // Two mutually exclusive outcomes, because Express 5 routes both of them
    // through this one callback (see the note above). if/else rather than an
    // early return, so the success path reads as literally "the no-error case"
    // and neither arm can be mistaken for unconditional code.
    if (error) {
      // stderr, not stdout: a startup failure must not land in the same stream a
      // reader — or a script — scans for the success banner. The original Error
      // is passed through by identity as the second argument, which is what
      // preserves its `code` (EADDRINUSE, EACCES, ENOTFOUND) and its stack;
      // re-wrapping or stringifying it here would throw both away. Nothing reads
      // server.address() on this path, because there is no address to read.
      console.error(`Failed to start server on http://${config.host}:${config.port}`, error);

      // Non-zero, because the exit status is the only thing `npm start`, a CI
      // step or a process manager can read about an outcome they did not watch
      // happen: exiting 0 here would report success for a server that never
      // bound, leaving any failure-sensitive policy — a CI job that fails the
      // build, a supervisor configured to restart only on error — with nothing
      // to act on. Status 1 communicates "startup failed"; what a particular
      // supervisor then does about it is its own configuration, not something
      // this line can decide.
      process.exit(1);
    } else {
      // Read the port back from the socket instead of trusting config.port: these
      // agree for an ordinary port and differ for port 0, where the requested
      // value would print as "http://localhost:0" and be useless to a client.
      const boundPort = server.address().port;

      console.log(`Server listening on http://${config.host}:${boundPort}`);
      console.log(`Try: curl http://${config.host}:${boundPort}/hello`);
    }
  });

  // One loop, one handler shape, for every signal that means "stop". Each
  // handler forwards the signal's own name so the shutdown log says which one
  // arrived, and does nothing else itself — the closing logic lives in exactly
  // one place below.
  TERMINATION_SIGNALS.forEach((signal) => {
    process.on(signal, () => closeServer(server, signal));
  });

  return server;
}

/**
 * Shuts the server down gracefully in response to a termination signal.
 *
 * Educational Focus: What "graceful" actually means. server.close() stops the
 * server accepting NEW connections and then waits for the responses already in
 * flight to finish; its callback runs only once the last one has. A process that
 * instead exited the moment the signal arrived would cut those responses off
 * mid-body, and the client would see a truncated read rather than an answer.
 *
 * Key Learning Concepts:
 * - Closing a listening socket is asynchronous, so completion is reported through
 *   a callback rather than by the function returning.
 * - The signal name is passed in rather than inferred, which keeps this function
 *   independent of how it was triggered — a signal handler, or a test calling it
 *   directly.
 * - Both log lines go through plain console.log. There is no logging library and
 *   no wrapper around it, which is what lets the test suite replace console.log
 *   with a spy and assert the exact shutdown output.
 *
 * @param {import('http').Server} server The listening server to close, as
 *   returned by startServer().
 * @param {string} signal Name of the signal that triggered the shutdown, e.g.
 *   'SIGTERM' or 'SIGINT'. Reported verbatim in the first log line.
 * @returns {void} Nothing; completion is announced from the close callback.
 * @example
 * closeServer(server, 'SIGTERM');
 * // SIGTERM received: closing server...
 * // Server closed. Goodbye!
 */
function closeServer(server, signal) {
  console.log(`${signal} received: closing server...`);

  server.close(() => {
    console.log('Server closed. Goodbye!');

    // Educational Note on this line, because the obvious reading of it is wrong.
    // It is NOT here to stop the process hanging: both variants of this module —
    // with the call and without it — were run and their true exit status read
    // back, and both exited 0, because closing the last listening socket leaves
    // the event loop with nothing to do. The call is kept because it makes
    // termination prompt and deterministic if any other handle happens to be
    // open, such as a timer or an idle keep-alive socket, which would otherwise
    // hold the process open past the point where its work is done. Status 0
    // says this was a requested, orderly shutdown rather than a failure.
    process.exit(0);
  });
}

// The export shape is a contract: `test/unit/server.test.js` requires exactly
// these five names, and nothing outside this list is part of the module's API.
module.exports = { startServer, closeServer, readConfig, DEFAULT_HOST, DEFAULT_PORT };

// Entry-point guard. `require.main` is the module Node was started with, so this
// comparison is true only for `node server.js` (what `npm start` runs) and false
// when some other file requires this one — which is why importing this module in
// a test binds no socket. It is excluded from coverage deliberately: a test runs
// inside Jest, where `require.main` is Jest's own entry file, so the true branch
// cannot be exercised from within the test process at all. Marking the statement
// ignored keeps the coverage report honest about what the tests really reach
// instead of leaving a permanently red line in it.
/* istanbul ignore next */
if (require.main === module) {
  startServer(readConfig());
}
