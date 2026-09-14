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
 * application testable in-process, because a test can require `./app` and let
 * supertest bind a short-lived ephemeral loopback listener (port 0, assigned by
 * the operating system) without starting `server.js` and without reserving a
 * configured port. A socket is still involved; what the split removes is the need
 * for a pre-running server and for a port someone has to choose.
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
 * // What a test does, asking the OS for any free port. startServer() returns
 * // before the bind has completed, and address() is null until the 'listening'
 * // event fires, so wait for the event before reading the port:
 * const ephemeral = startServer({ host: '127.0.0.1', port: 0 });
 * ephemeral.once('listening', () => {
 *   console.log(ephemeral.address().port); // e.g. 39451
 * });
 */

const { createApp } = require('./app');

/**
 * Network interface the server binds when HOST is not set.
 *
 * Educational Note: `localhost` resolves to the loopback interface, so an
 * unconfigured tutorial server is reachable from this machine and from nowhere
 * else — the safe default for code a learner runs on a laptop. This follows the
 * direct-development convention the repository's existing environment template
 * documents: the `HOST` entry in `src/backend/.env.example` defaults to
 * `localhost` for local development and reserves `0.0.0.0` for container
 * deployment. The sibling Python module `src/backend/wsgi.py` defaults its own
 * `HOST` lookup to `0.0.0.0` because a containerized process must accept traffic
 * on every interface to be reachable at all; that is the container convention,
 * not this one.
 *
 * @constant {string}
 */
const DEFAULT_HOST = 'localhost';

/**
 * TCP port the server binds when PORT is not set.
 *
 * Educational Note: 3002 rather than the more familiar 3000, because 3000 is not
 * free in this repository: the development service in
 * `infrastructure/docker/docker-compose.yml` publishes it on the host through its
 * `ports` mapping, and `infrastructure/docker/Dockerfile` sets `ENV PORT=3000`
 * and exposes it, so binding it would fail for anyone running `docker compose
 * up`. 3001, 5678 and 8000 are taken by the same stack — 8000 is the fallback of
 * the `PORT` lookup in `src/backend/wsgi.py`. 3002 collides with none of them and
 * stays close enough to be recognizable.
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
 * from this one list below. Only these two are handled: the signal registration
 * in the Python sibling `src/backend/wsgi.py` also traps SIGUSR1 and SIGUSR2 for
 * advanced process management, which a tutorial does not need.
 *
 * @constant {string[]}
 */
const TERMINATION_SIGNALS = ['SIGTERM', 'SIGINT'];

/**
 * Resolves the server's listening configuration from an environment.
 *
 * Educational Focus: Configuration resolution is kept in its own function,
 * separate from the act of binding a socket, and it is a pure function of its
 * argument: it reads two keys, returns an object, and does nothing else at all.
 * Because the environment arrives as a defaulted parameter rather than being
 * read from the global `process.env` inside the body, a test can call
 * readConfig({ PORT: '4010' }) and assert the result without mutating the
 * environment of the whole test process — and both sides of each `||` fallback
 * stay reachable, which is what keeps this module at full branch coverage.
 *
 * Key Learning Concepts:
 * - Default parameter values (`env = process.env`) let one function serve both
 *   the real caller and the test caller.
 * - `||` falls back on every falsy value, which is exactly the "absent" rule
 *   this server documents: an unset, empty or non-numeric PORT resolves to the
 *   default, because `Number(undefined)` and `Number('abc')` are both NaN and
 *   NaN is falsy. `PORT=0` resolves to 3002 for the same reason — this reader
 *   treats a zero as absent. An ephemeral port is a testing affordance reached
 *   only by calling startServer({ port: 0 }) directly, never an operator option.
 * - Environment variables are always strings, so PORT is converted with
 *   Number() before it reaches listen(), which needs a number.
 * - HOST is passed through to listen() as given; nothing about it is filtered
 *   here. An operator who sets HOST=0.0.0.0 does bind every interface, which
 *   the repository's own `src/backend/.env.example` documents as legitimate for
 *   container deployment. The default is therefore the safe one and the
 *   override is the operator's decision.
 *
 * @param {Object<string, string|undefined>} [env=process.env] Environment to read
 *   HOST and PORT from. Defaults to this process's own environment.
 * @returns {{host: string, port: number}} The host and port to bind. A falsy
 *   value — unset, empty, zero or non-numeric — is replaced by its documented
 *   default; anything else is taken as given.
 * @example
 * readConfig({});                              // { host: 'localhost', port: 3002 }
 * readConfig({ HOST: '0.0.0.0' });             // { host: '0.0.0.0',  port: 3002 }
 * readConfig({ PORT: '4010' });                // { host: 'localhost', port: 4010 }
 * readConfig({ PORT: '0' });                   // { host: 'localhost', port: 3002 }
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
 * inside the listen callback, in the invocation form that reports a successful
 * bind, and reads its port from server.address().
 *
 * Key Learning Concepts:
 * - app.listen() is a thin wrapper over http.createServer(app).listen(); the
 *   value it returns is a Node http.Server, not an Express application.
 * - The callback has two possible invocation forms and runs once: with no
 *   argument after a successful bind, or with the bind error after a failure.
 *   Only the first form describes a socket that exists, which is why the banner
 *   is printed from the no-argument form and why nothing on the failure path
 *   reads an address.
 * - server.address().port is the bound port. With port 0 the operating system
 *   chooses a free one, and only the bound value is callable.
 * - Express 5 supplies this callback with either no argument, once the socket is
 *   listening, or the bind error if the bind failed; a plain Node http listen
 *   callback receives no error at all, which is why an Express one takes the
 *   parameter. Branch on that argument before reading server.address(), which is
 *   null whenever the bind failed.
 * - The host in the config is passed through to listen() exactly as it arrived:
 *   readConfig() validates nothing, because which interfaces a server binds is
 *   the operator's decision rather than this module's. An operator who sets
 *   HOST=0.0.0.0 binds every interface, which the repository's own
 *   `src/backend/.env.example` documents as legitimate for container
 *   deployment; the default `localhost` is the safe one, and the override is a
 *   deliberate act.
 * - Signal handlers are registered here rather than at module scope, so merely
 *   importing this module never installs process-wide handlers.
 *
 * @param {{host: string, port: number}} config Host and port to bind, normally
 *   produced by readConfig(). A port of 0 asks the OS for any free port.
 * @returns {import('http').Server} The HTTP server, returned before the socket
 *   has finished binding. By the time the callback above has run it is either
 *   listening, with the banner printed, or the bind has failed — and in that
 *   case one line naming the requested address and the failure's code has been
 *   written to stderr, this server's address() is null, and the process's exit
 *   status is left untouched.
 * @example
 * const server = startServer({ host: 'localhost', port: 3002 });
 * // Server listening on http://localhost:3002
 * // Try: curl http://localhost:3002/hello
 */
function startServer(config) {
  const server = createApp().listen(config.port, config.host, (error) => {
    if (error) {
      // stderr, not stdout: a startup failure must not land in the same stream a
      // reader — or a script — scans for the success banner. One line, naming
      // the address that was requested and the error's `code` (EADDRINUSE,
      // EACCES, ENOTFOUND), which is the part that says what to do about it.
      // The Error object itself is deliberately not passed as a second
      // argument, because console.error would print its stack. Nothing reads
      // server.address() on this path, because there is no address to read.
      console.error(
        `Failed to start server on http://${config.host}:${config.port} (${error.code})`
      );
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

    // Exiting explicitly keeps shutdown prompt and deterministic if an unrelated
    // handle is still open — a timer, an idle keep-alive socket — which would
    // otherwise hold the process open past the point where its work is done, and
    // status 0 reports an orderly requested shutdown rather than a failure. It is
    // not required merely to close this server: closing the last listening socket
    // already leaves the event loop with nothing to do.
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
