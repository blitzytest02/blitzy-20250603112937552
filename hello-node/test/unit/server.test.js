/**
 * Unit suite for the hello-node listener module: configuration resolution, socket
 * binding, and the graceful-termination path of `server.js`.
 *
 * Educational Focus: Shows how to test the parts of a Node service that reach
 * outside the process — the environment, a real TCP socket, a POSIX signal and the
 * process's own exit — without letting any of them escape into the test run.
 * Exactly two of those side effects are replaced with Jest spies rather than
 * merely observed, and each for a different reason. `process.exit` is intercepted
 * because `closeServer()` genuinely calls it: left alone, the very first shutdown
 * assertion would terminate the Jest worker mid-run and the suite would report a
 * crashed worker instead of a result. `console.log` is captured because the log
 * output is the only place the startup banner's correctness is observable — the
 * requirement is that the banner reports the port that was actually BOUND rather
 * than the one that was requested, and the difference between those two values
 * exists nowhere except in the text that was printed. Everything else here is the
 * real thing: a real Express application, a real http.Server on a real ephemeral
 * port, and a real signal delivered through the process event emitter. Nothing is
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
 *   honest source of the port number once port 0 is in play.
 * - Graceful shutdown is asynchronous. server.close() announces completion through
 *   a callback, so a test has to wait on the 'close' event before asserting what
 *   that callback printed — and must wait on the event itself rather than papering
 *   over the gap with a timer, which would be both slower and unreliable.
 * - Process-level handlers have a cost worth understanding. Every startServer()
 *   call adds SIGTERM and SIGINT listeners that the module never removes, so this
 *   suite removes them in teardown; without that, a handler left over from one
 *   test fires during the next one and tries to close a server that is long gone.
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
 * Waits for a server to finish binding its socket.
 *
 * Educational Note: This is always called in the same synchronous turn as the
 * startServer() call it follows, which makes the ordering deterministic in two
 * ways. Node never emits 'listening' from inside listen() — the emit is deferred
 * to a later tick — so the event cannot have been missed. And because the module's
 * own listen callback was registered on that same event first, it has already run
 * (and already printed the banner) by the time this promise settles. The 'error'
 * listener turns a bind failure into a clean test failure instead of an unhandled
 * 'error' event, which would take the whole worker down.
 *
 * @param {import('http').Server} server The server returned by startServer().
 * @returns {Promise<void>} Resolves once the socket is listening.
 */
function onceListening(server) {
  return new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
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
  /** @type {jest.SpyInstance} Intercepts process.exit so the worker survives. */
  let exitSpy;
  /** @type {import('http').Server|null} Server opened by the running test. */
  let server;

  beforeEach(() => {
    // Suppressing the output keeps the report readable while still recording
    // every call, which is what the banner and shutdown assertions read back.
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // The replacement implementation is not optional. closeServer() really does
    // call process.exit(0), so without this the first test to reach the shutdown
    // path would end the Jest worker instead of completing.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    server = null;
  });

  afterEach(async () => {
    // Release the socket of any test that opened one and did not close it, so
    // Jest exits cleanly with no open handle and no need for --forceExit.
    if (server && server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
    server = null;

    // Load-bearing, not boilerplate: startServer() registers a SIGTERM and a
    // SIGINT listener on every call and never removes them. Left in place they
    // accumulate across tests, so the signal test would fire a stale handler
    // against an already-closed server and repeated runs would trip Node's
    // max-listeners warning.
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');

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

    it('should honour HOST and PORT when the environment overrides them', () => {
      const config = readConfig({ HOST: '127.0.0.1', PORT: '4010' });

      expect(config.host).toBe('127.0.0.1');

      // Environment variables are always strings, and listen() needs a number.
      // The assertion is on the number 4010, so the string '4010' would fail it.
      expect(config.port).toBe(4010);
      expect(typeof config.port).toBe('number');
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
    it('should log the bound port when listen is called with port 0', async () => {
      // Port 0 is the whole point of this test: the requested value and the bound
      // value differ, so a banner built from the wrong one is visibly wrong.
      server = startServer({ host: '127.0.0.1', port: 0 });

      await onceListening(server);

      const boundPort = server.address().port;

      expect(server.listening).toBe(true);
      expect(typeof boundPort).toBe('number');
      expect(boundPort).toBeGreaterThan(0);

      // The two banner lines, built from the port the operating system chose.
      expect(logSpy).toHaveBeenCalledWith(`Server listening on http://127.0.0.1:${boundPort}`);
      expect(logSpy).toHaveBeenCalledWith(`Try: curl http://127.0.0.1:${boundPort}/hello`);
      expect(logSpy).toHaveBeenCalledTimes(2);

      // The assertion that stops the two above being tautological: had the module
      // logged config.port instead of server.address().port, both lines would read
      // "http://127.0.0.1:0" — an address no client can call.
      expect(logSpy.mock.calls[0][0]).not.toContain(':0');
      expect(logSpy.mock.calls[1][0]).not.toContain(':0');
    });
  });

  describe('closeServer()', () => {
    it('should log shutdown and exit 0 when called with a signal name', async () => {
      server = startServer({ host: '127.0.0.1', port: 0 });
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
    it('should close the server when SIGTERM is emitted on the process', async () => {
      server = startServer({ host: '127.0.0.1', port: 0 });
      await onceListening(server);

      logSpy.mockClear();

      // A real signal through the real event emitter, which runs the listener
      // startServer() registered rather than a handler this test reached into the
      // module for. process.emit returns true only if a listener was present, so
      // this assertion also proves the registration happened.
      expect(process.emit('SIGTERM')).toBe(true);

      await onceClosed(server);

      expect(logSpy.mock.calls).toEqual([
        ['SIGTERM received: closing server...'],
        ['Server closed. Goodbye!']
      ]);
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(exitSpy).toHaveBeenCalledTimes(1);

      // The socket is genuinely gone, not merely reported as closing.
      expect(server.listening).toBe(false);
    });
  });
});
