/**
 * Unit suite for the hello-node listener module: configuration resolution, socket
 * binding, and the graceful-termination path of `server.js`.
 *
 * Educational Focus: Shows how to test the parts of a Node service that reach
 * outside the process — the environment, a real TCP socket, a POSIX signal and the
 * process's own exit — without letting any of them escape into the test run.
 * Exactly three of those side effects are replaced with Jest spies rather than
 * merely observed, and each for a different reason. `process.exit` is intercepted
 * because `closeServer()` genuinely calls it with 0 and the failed-bind path
 * genuinely calls it with 1: left alone, the very first of those assertions would
 * terminate the Jest worker mid-run and the suite would report a crashed worker
 * instead of a result. `console.log` is captured because the log output is the
 * only place the startup banner's correctness is observable — the requirement is
 * that the banner reports the port that was actually BOUND rather than the one
 * that was requested, and the difference between those two values exists nowhere
 * except in the text that was printed. `console.error` is captured because the
 * startup-failure report goes to stderr, which is likewise observable nowhere
 * else, and because an uncaptured call would print a full EADDRINUSE stack trace
 * into the middle of a passing run and read as a broken suite. Everything else
 * here is the real thing: a real Express application, real http.Servers on real
 * ephemeral ports, a real failed bind against a port this suite already holds,
 * and a real signal delivered through the process event emitter. Nothing is
 * mocked at module level and no fake server or fake application is used.
 *
 * The sibling Python suite solves the same problem from the opposite direction:
 * `src/backend/tests/test_wsgi.py:458-520` drives SIGTERM with
 * `subprocess.send_signal` against a Gunicorn child process, because a Python test
 * cannot intercept its own interpreter's exit and so must put the server in
 * another process to survive killing it. Spying on `process.exit` is what makes
 * the cheaper in-process approach available in Node — no subprocess, no sleeps,
 * and no fixed port to collide over.
 *
 * Key Learning Concepts:
 * - A pure configuration function is a testable configuration function.
 *   `readConfig(env = process.env)` receives its environment as a defaulted
 *   parameter instead of reading the global inside its body, so a test can hand it
 *   any environment at all. That is what keeps both sides of each `||` fallback
 *   reachable, and the defaulted parameter itself is covered by the one test that
 *   calls the function with no argument.
 * - Binding port 0 asks the operating system for any free port, which is how a
 *   test starts a real server without picking a number that might already be in
 *   use. This is a testing affordance only: `readConfig` treats a numeric zero as
 *   absent, so PORT=0 resolves to the documented default 3002 and never requests
 *   an ephemeral port.
 * - server.address() reports the address that was really bound, and it is the only
 *   honest source of the port number once port 0 is in play. The same is true of
 *   the interface: the banner prints the host it was CONFIGURED with, so only
 *   address().address shows which interface the socket is really on.
 * - Graceful shutdown is asynchronous. server.close() announces completion through
 *   a callback, so a test has to wait on the 'close' event before asserting what
 *   that callback printed — and must wait on the event itself rather than papering
 *   over the gap with a timer, which would be both slower and unreliable.
 * - Process-level handlers have a cost worth understanding. Every startServer()
 *   call adds SIGTERM and SIGINT listeners that the module never removes, so this
 *   suite removes them in teardown; without that, a handler left over from one
 *   test fires during the next one and tries to close a server that is long gone.
 *   Teardown removes only the handlers this suite installed, identified by
 *   comparing the process's current listeners against a snapshot taken before the
 *   test ran, and leaves every inherited listener attached. `process` is a shared
 *   emitter: a test that cleaned up with removeAllListeners() would also delete
 *   handlers belonging to the runner or to a later suite, which is cleanup by
 *   demolition and makes the result depend on which tests ran first.
 */

// The single module under test. From `hello-node/test/unit/` this path resolves
// two levels up to `hello-node/server.js`, and it is the only import in the file.
// The application module needs no import of its own — the listener pulls it in
// itself — and supertest has no place here, because this suite asserts the
// listener rather than the HTTP contract, which belongs to the integration suite.
const {
  startServer,
  closeServer,
  readConfig,
  DEFAULT_HOST,
  DEFAULT_PORT
} = require('../../server');

/**
 * The signals `server.js` registers a graceful-shutdown handler for.
 *
 * Educational Note: This list is restated here rather than imported, because the
 * module's export shape is a contract of exactly five names — startServer,
 * closeServer, readConfig, DEFAULT_HOST and DEFAULT_PORT — and widening the
 * public API of the thing under test to make a test easier is the wrong trade.
 * Restating it also makes the assertion below meaningful: the test iterates the
 * signals the AAP requires, so dropping one from the module's own list breaks a
 * test instead of quietly agreeing with it.
 *
 * @constant {string[]}
 */
const TERMINATION_SIGNALS = ['SIGTERM', 'SIGINT'];

/**
 * Records which signal listeners exist right now, per termination signal.
 *
 * Educational Note: `process.rawListeners()` is used rather than
 * `process.listeners()` because the two differ for a handler registered with
 * `once()`: listeners() unwraps it and returns the original function, while
 * rawListeners() returns the one-shot wrapper that is actually in the emitter's
 * list. Only the wrapper can be removed and re-added without losing its
 * fire-once behaviour, so the snapshot has to hold the raw form for a foreign
 * once-listener to survive this suite intact.
 *
 * @returns {Map<string, Function[]>} Listener arrays keyed by signal name.
 */
function snapshotSignalListeners() {
  return new Map(
    TERMINATION_SIGNALS.map((signal) => [signal, process.rawListeners(signal)])
  );
}

/**
 * Removes only the signal listeners that appeared after a snapshot was taken.
 *
 * Educational Note: This is the difference between isolating a test and
 * vandalising the process. `startServer()` registers a handler per termination
 * signal on every call and never removes one, so a suite that left them attached
 * would fire a stale handler against an already-closed server in the next test.
 * The fix is to remove exactly those handlers by identity — everything the
 * snapshot did not already contain — and never to touch a listener this suite
 * did not install. Node's own documentation warns that removeAllListeners() is
 * bad practice when other components may own listeners on the same emitter, and
 * `process` is the most shared emitter there is.
 *
 * @param {Map<string, Function[]>} snapshot Result of snapshotSignalListeners().
 * @returns {void}
 */
function removeSignalListenersAddedSince(snapshot) {
  snapshot.forEach((known, signal) => {
    process
      .rawListeners(signal)
      .filter((listener) => !known.includes(listener))
      .forEach((listener) => process.removeListener(signal, listener));
  });
}

/**
 * Temporarily detaches the listeners a snapshot recorded for one signal.
 *
 * Educational Note: `process.emit(signal)` fans out to EVERY listener for that
 * signal, not just the one the running test registered. Detaching the ones that
 * were already there keeps a real emission from reaching a handler this suite
 * does not own — the runner's, an instrumentation hook's, one an earlier suite
 * left attached — whose side effects would otherwise be attributed to the
 * assertions that follow the emission. They go back in the `finally` of the
 * emitting test, so the failure of an assertion cannot strand them.
 *
 * Note what this helper is NOT for: a handler installed by an earlier iteration
 * of the caller's own loop never reaches it, because each iteration removes what
 * it added before the next one begins.
 *
 * @param {string} signal Signal whose pre-existing listeners should step aside.
 * @param {Function[]} known Listeners recorded for that signal by the snapshot.
 * @returns {() => void} Restores every listener this call detached. Restoring
 *   appends them, so their order relative to each other is preserved and they
 *   end up after any handler added in between — which is then removed by
 *   removeSignalListenersAddedSince(), leaving the emitter exactly as found.
 */
function detachSignalListeners(signal, known) {
  const detached = process
    .rawListeners(signal)
    .filter((listener) => known.includes(listener));

  detached.forEach((listener) => process.removeListener(signal, listener));

  return () => {
    detached.forEach((listener) => process.on(signal, listener));
  };
}

/**
 * Waits for a server to finish binding its socket.
 *
 * Educational Note: This is always called in the same synchronous turn as the
 * startServer() call it follows, which makes the ordering deterministic in two
 * ways. Node never emits 'listening' from inside listen() — the emit is deferred
 * to a later tick — so the event cannot have been missed. And because the module's
 * own listen callback was registered on that same event first, it has already run
 * (and already printed the banner) by the time this promise settles. The 'error'
 * listener turns a bind failure into an awaitable rejection, which is how the
 * failed-bind test below observes the error.
 *
 * It is deliberately NOT what keeps that failure from becoming an unhandled
 * 'error' event. Express has already registered the module's own listen callback
 * as `server.once('error', ...)`, so the event always has a listener whether or
 * not this helper adds one — measured, with the server's error-listener count
 * sitting at 1 the instant listen() returns and the process surviving a failed
 * bind with no listener of ours attached at all.
 *
 * The two handlers are named and paired, each removing the other before it
 * settles the promise, and that is not tidiness. A promise settles once: had the
 * 'error' handler stayed attached after 'listening' resolved, a later error on
 * that server would call reject() on an already-settled promise, where it is
 * silently discarded — the failure would vanish instead of failing a test, and
 * the dead listener would keep the socket's error path pointing at a closure
 * nothing can observe for the rest of the server's life.
 *
 * @param {import('http').Server} server The server returned by startServer().
 * @returns {Promise<void>} Resolves once the socket is listening; rejects with
 *   the server's own Error if the bind fails first.
 */
function onceListening(server) {
  return new Promise((resolve, reject) => {
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };

    const onError = (error) => {
      server.removeListener('listening', onListening);
      reject(error);
    };

    server.once('listening', onListening);
    server.once('error', onError);
  });
}

/**
 * Waits for a server's socket to finish closing.
 *
 * Educational Note: Registered immediately AFTER the call that triggers the close,
 * for the same ordering reason as above: the callback closeServer() handed to
 * server.close() is already on the 'close' event, so it runs first and this
 * promise settles only once the completion line has been logged and process.exit
 * has been called. Note what cannot be used as a shortcut here — `server.listening`
 * flips to false synchronously inside close(), long before the socket is actually
 * closed, so checking it would resolve far too early.
 *
 * @param {import('http').Server} server The closing server.
 * @returns {Promise<void>} Resolves once the 'close' event has been emitted.
 */
function onceClosed(server) {
  return new Promise((resolve) => {
    server.once('close', resolve);
  });
}

describe('HTTP Server Module (server.js)', () => {
  /** @type {jest.SpyInstance} Records every console.log call, printing none. */
  let logSpy;
  /** @type {jest.SpyInstance} Records every console.error call, printing none. */
  let errorSpy;
  /** @type {jest.SpyInstance} Intercepts process.exit so the worker survives. */
  let exitSpy;
  /** @type {import('http').Server[]} Every server the running test opened. */
  let servers;
  /** @type {Map<string, Function[]>} Signal listeners present before the test. */
  let signalListenersBefore;

  /**
   * Registers a server for teardown and hands it straight back.
   *
   * A single test here opens three sockets, so ownership is a list rather than
   * one variable: every server that reaches teardown still listening is closed,
   * and one that never bound at all is skipped.
   *
   * @param {import('http').Server} opened Server returned by startServer().
   * @returns {import('http').Server} The same server, for use in an expression.
   */
  function track(opened) {
    servers.push(opened);

    return opened;
  }

  beforeEach(() => {
    // Suppressing the output keeps the report readable while still recording
    // every call, which is what the banner and shutdown assertions read back.
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // The failed-bind path reports to stderr, so console.error is captured for
    // the same reason console.log is: the report is the only place that
    // behaviour is observable, and an unspied call would print a full EADDRINUSE
    // stack trace into the middle of a passing test run.
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // The replacement implementation is not optional. closeServer() really does
    // call process.exit(0) and the failed-bind path really does call
    // process.exit(1), so without this the first test to reach either would end
    // the Jest worker instead of completing.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    servers = [];

    // Taken before the test runs so teardown can tell the handlers this suite
    // installed from the handlers it inherited.
    signalListenersBefore = snapshotSignalListeners();
  });

  afterEach(async () => {
    // Release the socket of any test that opened one and did not close it, so
    // Jest exits cleanly with no open handle and no need for --forceExit. The
    // listening guard skips both the servers a test already closed and the one
    // whose bind deliberately failed.
    for (const opened of servers) {
      if (opened.listening) {
        await new Promise((resolve) => opened.close(resolve));
      }
    }
    servers = [];

    // Load-bearing, not boilerplate: startServer() registers a SIGTERM and a
    // SIGINT listener on every call and never removes them. Left in place they
    // accumulate across tests, so the signal test would fire a stale handler
    // against an already-closed server and repeated runs would trip Node's
    // max-listeners warning. Only the listeners added during this test are
    // removed, matched by identity against the snapshot above: every listener
    // that was already attached — Jest's own, an instrumentation hook's, a
    // future suite's — is left exactly where it was found. Symmetric isolation
    // is the point; a process-wide removeAllListeners() would leave the worker
    // in a state this suite never had the right to create.
    removeSignalListenersAddedSince(signalListenersBefore);

    jest.restoreAllMocks();
  });

  describe('readConfig()', () => {
    it('should resolve the documented defaults when the environment is empty', () => {
      // An explicit empty environment, rather than the ambient one, is what makes
      // this deterministic on a machine that happens to have HOST or PORT set.
      const config = readConfig({});

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(3002);

      // The same two values as exported constants, so the defaults the README
      // documents and the defaults the code applies cannot drift apart.
      expect(DEFAULT_HOST).toBe('localhost');
      expect(DEFAULT_PORT).toBe(3002);
      expect(typeof DEFAULT_PORT).toBe('number');
    });

    it('should honour ordinary HOST and PORT overrides and treat a zero, empty or non-numeric PORT as absent', () => {
      const config = readConfig({ HOST: '127.0.0.1', PORT: '4010' });

      expect(config.host).toBe('127.0.0.1');

      // Environment variables are always strings, and listen() needs a number.
      // The assertion is on the number 4010, so the string '4010' would fail it.
      expect(config.port).toBe(4010);
      expect(typeof config.port).toBe('number');

      // The documented fallback class, asserted rather than assumed. readConfig
      // falls back with `||`, so every falsy result of Number() lands on the
      // default: an empty PORT, a non-numeric PORT (Number('not-a-port') is NaN)
      // and PORT=0 (Number('0') is 0) all resolve to 3002.
      //
      // PORT=0 is the one that needs stating, because it is the one a reader
      // might expect to mean something else. It is deliberately NOT a request
      // for an ephemeral port: this reader treats a zero as absent, so the
      // server binds the documented default instead of whatever the operating
      // system happened to hand out. An ephemeral port is a testing affordance
      // reached only by calling startServer({ port: 0 }) directly, never through
      // the environment. These four assertions are what make that rule break a
      // test if the fallback is ever loosened, since both `||` branches are
      // already covered by the two tests around this one and a coverage report
      // would therefore stay green.
      expect(readConfig({ PORT: '0' }).port).toBe(3002);
      expect(readConfig({ PORT: '' }).port).toBe(3002);
      expect(readConfig({ PORT: 'not-a-port' }).port).toBe(3002);
      expect(readConfig({ HOST: '' }).host).toBe('localhost');
    });

    it('should read process.env when called with no argument', () => {
      // Covers the defaulted `env = process.env` parameter, which no call that
      // passes an environment can reach. The sentinels are an RFC 5737
      // documentation address and an arbitrary port: neither is ever bound here,
      // because this test calls readConfig() and nothing else.
      const hadHost = 'HOST' in process.env;
      const hadPort = 'PORT' in process.env;
      const originalHost = process.env.HOST;
      const originalPort = process.env.PORT;

      try {
        process.env.HOST = '203.0.113.7';
        process.env.PORT = '4321';

        const config = readConfig();

        expect(config.host).toBe('203.0.113.7');
        expect(config.port).toBe(4321);
      } finally {
        // try/finally so a failed assertion above cannot leak the mutation into
        // the tests that follow. A key that was absent is deleted rather than set
        // to undefined: assigning undefined to a process.env key stores the
        // literal string "undefined", which would defeat every default.
        if (hadHost) {
          process.env.HOST = originalHost;
        } else {
          delete process.env.HOST;
        }

        if (hadPort) {
          process.env.PORT = originalPort;
        } else {
          delete process.env.PORT;
        }
      }
    });
  });

  describe('startServer()', () => {
    it('should bind the requested host on a fresh ephemeral port each time, log the bound port, and report a failed bind without masking its error', async () => {
      // Port 0 is the whole point of this test: the requested value and the bound
      // value differ, so a banner built from the wrong one is visibly wrong.
      const first = track(startServer({ host: '127.0.0.1', port: 0 }));

      await onceListening(first);

      // The socket's own view of what it bound, read once. This is the only
      // authority on the question: the banner interpolates config.host as a
      // literal, so a module that stopped passing the host to listen() — and so
      // bound the wildcard interface, reachable from every network this machine
      // is on — would keep printing "http://127.0.0.1:..." and every log
      // assertion below would still pass. Only address() distinguishes them, and
      // it reports '0.0.0.0' or '::' in that case rather than the loopback
      // address that was asked for.
      const address = first.address();

      expect(first.listening).toBe(true);
      expect(address.address).toBe('127.0.0.1');
      expect(address.family).toBe('IPv4');
      expect(typeof address.port).toBe('number');
      expect(address.port).toBeGreaterThan(0);

      // The two banner lines, built from the port the operating system chose.
      expect(logSpy).toHaveBeenCalledWith(`Server listening on http://127.0.0.1:${address.port}`);
      expect(logSpy).toHaveBeenCalledWith(`Try: curl http://127.0.0.1:${address.port}/hello`);
      expect(logSpy).toHaveBeenCalledTimes(2);

      // The assertion that stops the two above being tautological: had the module
      // logged config.port instead of server.address().port, both lines would read
      // "http://127.0.0.1:0" — an address no client can call.
      expect(logSpy.mock.calls[0][0]).not.toContain(':0');
      expect(logSpy.mock.calls[1][0]).not.toContain(':0');

      // A second server, asking for port 0 exactly as the first did, while the
      // first still holds its port. A positive bound port on its own proves very
      // little — a regression to listen(config.port || DEFAULT_PORT, ...) would
      // send both of these requests to the fixed default 3002, so this second
      // bind would fail outright and the port could not possibly differ. Two
      // distinct ports from two identical requests is what an ephemeral
      // allocation looks like and what a fixed port cannot produce.
      logSpy.mockClear();

      const second = track(startServer({ host: '127.0.0.1', port: 0 }));

      await onceListening(second);

      const secondPort = second.address().port;

      expect(second.listening).toBe(true);
      expect(second.address().address).toBe('127.0.0.1');
      expect(typeof secondPort).toBe('number');
      expect(secondPort).not.toBe(address.port);

      expect(logSpy).toHaveBeenCalledWith(`Server listening on http://127.0.0.1:${secondPort}`);
      expect(logSpy).toHaveBeenCalledWith(`Try: curl http://127.0.0.1:${secondPort}/hello`);
      expect(logSpy).toHaveBeenCalledTimes(2);

      // A third server, deliberately asking for the port the FIRST one is still
      // listening on. This is a real EADDRINUSE from the operating system with
      // nothing mocked: no fake listen, no stubbed error, no module-level fake.
      // Express 5 delivers the failure to the same callback that would otherwise
      // print the banner (express/lib/application.js:598-606), which is why the
      // module has to branch on the callback's error argument — without that
      // branch it reaches server.address().port on a null address and dies with a
      // TypeError, and the EADDRINUSE never gets reported at all.
      logSpy.mockClear();

      const failing = track(startServer({ host: '127.0.0.1', port: address.port }));

      let caught = null;

      try {
        // The repaired onceListening() rejects with the server's own Error, so
        // the failure is awaited here rather than raced against.
        await onceListening(failing);
      } catch (error) {
        caught = error;
      }

      expect(caught).not.toBeNull();
      expect(caught.code).toBe('EADDRINUSE');

      // Nothing bound, and the module knew better than to read a port off it.
      expect(failing.address()).toBeNull();
      expect(failing.listening).toBe(false);

      // The failure is reported on stderr, naming the address that was REQUESTED
      // (there is no bound one to name), and carrying the original Error by
      // identity. The identity comparison is the load-bearing part: it is what
      // proves the cause that reached the operator is the operating system's
      // EADDRINUSE and not a secondary TypeError raised while formatting it.
      expect(errorSpy).toHaveBeenCalledWith(
        `Failed to start server on http://127.0.0.1:${address.port}`,
        caught
      );
      expect(errorSpy).toHaveBeenCalledTimes(1);

      // Non-zero, because `npm start`, a CI step and a process manager all read
      // the exit status, and a server that never bound must not report success.
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(exitSpy).toHaveBeenCalledTimes(1);

      // And no banner: a failed bind announces no address, so the success arm
      // did not run at all.
      expect(logSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('closeServer()', () => {
    it('should log shutdown and exit 0 when called with a signal name', async () => {
      const server = track(startServer({ host: '127.0.0.1', port: 0 }));
      await onceListening(server);

      // Discard the startup banner so the shutdown output can be asserted as a
      // complete, ordered sequence below.
      logSpy.mockClear();

      closeServer(server, 'SIGTERM');

      // The first line is logged synchronously, before the socket starts closing.
      expect(logSpy).toHaveBeenCalledWith('SIGTERM received: closing server...');
      expect(logSpy).toHaveBeenCalledTimes(1);

      // The second line and the exit happen in server.close()'s callback, so they
      // are not observable until the 'close' event has been emitted. Waiting on
      // the event is exact; a timer would only be a guess about how long it takes.
      await onceClosed(server);

      expect(logSpy).toHaveBeenCalledWith('Server closed. Goodbye!');

      // Status 0 says this was a requested, orderly shutdown rather than a
      // failure. The call is what makes termination prompt and deterministic when
      // another handle is still open; it is not what stops the process hanging,
      // which closing the last listening socket already does on its own.
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(exitSpy).toHaveBeenCalledTimes(1);

      // "Announce the signal, then close, then announce completion" is the
      // behaviour being taught, so the order is asserted and not just the content.
      expect(logSpy.mock.calls).toEqual([
        ['SIGTERM received: closing server...'],
        ['Server closed. Goodbye!']
      ]);
    });
  });

  describe('signal handling', () => {
    it('should close the server when each of SIGTERM and SIGINT is emitted on the process', async () => {
      // Both signals are exercised behaviourally, one at a time against its own
      // fresh server, and the loop is the assertion. Coverage cannot do this job:
      // startServer() registers both handlers from a single arrow function in one
      // loop, so the first emission marks that function covered and Istanbul
      // reports 100% whether the module's list holds one signal or two. Drop
      // 'SIGINT' from it and nothing about the coverage report changes — but
      // process.emit returns true only when the signal had a listener, so the
      // iteration for a signal the module stopped registering returns false and
      // fails here. That is the only place in this suite where the second half of
      // the AAP's graceful-termination requirement is actually held.
      for (const signal of TERMINATION_SIGNALS) {
        // Taken before the startServer() call so the handlers it is about to add
        // can be told apart from everything that was already attached — both for
        // the isolated emission below and for this iteration's own cleanup.
        const before = snapshotSignalListeners();

        const server = track(startServer({ host: '127.0.0.1', port: 0 }));
        await onceListening(server);

        // Discard this iteration's startup banner and its predecessor's exit, so
        // both are asserted as complete, per-signal sequences.
        logSpy.mockClear();
        exitSpy.mockClear();

        // process.emit() fans out to every listener for the signal, so any
        // handler this suite does not own — the runner's, an instrumentation
        // hook's, one left attached by a suite that ran earlier — would run on
        // this emission too, and whatever it did would be attributed to the
        // assertions below. Those handlers step aside for the duration of the
        // emission and go back in the finally, where a failed assertion cannot
        // strand them. The previous iteration's own handler is not among them:
        // it was removed at the end of that iteration by the call at the foot of
        // this loop, which is what keeps each signal's assertions about exactly
        // one server and one handler.
        const restoreSignalListeners = detachSignalListeners(signal, before.get(signal));

        try {
          // A real signal through the real event emitter, which runs the listener
          // startServer() registered rather than a handler this test reached into
          // the module for. The return value is the registration assertion: true
          // means the process had a listener for this exact signal name.
          expect(process.emit(signal)).toBe(true);
        } finally {
          restoreSignalListeners();
        }

        await onceClosed(server);

        // The signal's own name in the first line, so a handler wired to the
        // wrong signal name would fail rather than pass on a generic message.
        expect(logSpy.mock.calls).toEqual([
          [`${signal} received: closing server...`],
          ['Server closed. Goodbye!']
        ]);
        expect(exitSpy).toHaveBeenCalledWith(0);
        expect(exitSpy).toHaveBeenCalledTimes(1);

        // The socket is genuinely gone, not merely reported as closing.
        expect(server.listening).toBe(false);

        // Leave the process's listener list exactly as this iteration found it,
        // so the next one starts from the same state rather than from a growing
        // pile of handlers pointing at closed servers.
        removeSignalListenersAddedSince(before);
      }
    });
  });
});
