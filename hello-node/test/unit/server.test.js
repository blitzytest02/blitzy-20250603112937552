/**
 * Unit suite for the hello-node listener module: configuration resolution, socket
 * binding, and the graceful-termination path of `server.js`.
 *
 * Educational Focus: Testing the parts of a Node service that reach outside the
 * process — the environment, a socket, a signal, the process's own exit — without
 * letting them escape the test run. Three side effects are spied rather than
 * merely observed: `process.exit`, because `closeServer()` really calls it with 0
 * and the failed-bind path with 1, so an unspied call would end the Jest worker
 * mid-run; `console.log` and `console.error`, because the startup banner and the
 * failure report are observable nowhere else. Nothing is faked — the application,
 * the sockets and the EADDRINUSE are all real.
 *
 * Key Learning Concepts:
 * - `readConfig(env = process.env)` takes its environment as a parameter, so a test
 *   can supply any environment and every branch of the PORT and HOST policies
 *   stays reachable.
 * - Port 0 asks the operating system for a free port, which is why the banner's
 *   port comes from `server.address()` — what was bound — and not from the config.
 *   It is a testing affordance only: `readConfig` treats a zero PORT as absent.
 * - Graceful shutdown is asynchronous, so the suite waits on the 'close' event.
 * - The signal test emits the process's signal event in-process with
 *   `process.emit(signal)`, sending no operating-system signal, to run the listener
 *   `startServer()` registered; teardown then removes the process-global listeners
 *   that appeared while the test ran.
 */

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
 * Educational Note: Restated here rather than imported, so that dropping a signal
 * from the module's own list breaks the loop below instead of quietly agreeing
 * with it. Widening the module's five-name export shape to make a test easier
 * would be the wrong trade.
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
 * Removes every signal listener that is attached now but absent from the snapshot.
 *
 * Educational Note: `startServer()` registers a handler per termination signal on
 * every call and never removes one, so a suite that left them attached would fire
 * a stale handler against an already-closed server in the next test. The predicate
 * is identity against the snapshot, so it proves "added since the snapshot" rather
 * than "added by this suite" — the two coincide only while nothing else registers
 * a SIGTERM or SIGINT listener on this worker in between, which is the assumption
 * this helper rests on. It is still far narrower than
 * `process.removeAllListeners()`, which would drop the runner's listeners too.
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
 * were already there keeps an emission from reaching a handler this suite does not
 * own, whose side effects would otherwise be attributed to the assertions that
 * follow it.
 *
 * @param {string} signal Signal whose pre-existing listeners should step aside.
 * @param {Function[]} known Listeners recorded for that signal by the snapshot.
 * @returns {() => void} Restores every listener this call detached, appended in
 *   their original relative order.
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
 * Educational Note: Always called in the same synchronous turn as the startServer()
 * it follows, which makes the ordering deterministic: Node defers the 'listening'
 * emit to a later tick, so the event cannot have been missed, and the module's own
 * listen callback — registered on that event first — has already printed the banner
 * by the time this promise settles. The 'error' listener turns a bind failure into
 * an awaitable rejection.
 *
 * The two handlers remove each other before settling, because a promise settles
 * once: an 'error' handler left attached after 'listening' resolved would reject an
 * already-settled promise, where a later failure is silently discarded instead of
 * failing a test.
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
 * Educational Note: Registered AFTER the call that triggers the close, for the same
 * ordering reason as above: the callback closeServer() handed to server.close() is
 * already on the 'close' event, so it runs first and this promise settles only once
 * the completion line has been logged. `server.listening` is no substitute — it
 * flips to false synchronously inside close(), long before the socket is closed.
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
   * A single test here opens three sockets, so ownership is a list rather than one
   * variable.
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
    // SIGINT listener on every call and never removes them, so left in place they
    // accumulate, fire a stale handler against an already-closed server in the
    // next test, and eventually trip Node's max-listeners warning. What is removed
    // is every listener attached now but absent from the snapshot above — "added
    // since the snapshot", which is this suite's own handlers as long as nothing
    // else registers one while the test runs — rather than every listener on the
    // signal, so whatever was already attached stays attached.
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

      expect(DEFAULT_HOST).toBe('localhost');
      expect(DEFAULT_PORT).toBe(3002);
      expect(typeof DEFAULT_PORT).toBe('number');
    });

    it('should honour ordinary HOST and PORT overrides, treat a zero, empty or non-numeric PORT as absent, and refuse every out-of-policy PORT and wildcard-alias HOST', () => {
      const config = readConfig({ HOST: '127.0.0.1', PORT: '4010' });

      expect(config.host).toBe('127.0.0.1');

      // Environment variables are always strings, and listen() needs a number.
      // The assertion is on the number 4010, so the string '4010' would fail it.
      expect(config.port).toBe(4010);
      expect(typeof config.port).toBe('number');

      // The documented "absent" class, asserted rather than assumed: an unset,
      // empty or zero PORT resolves to 3002, and an empty HOST to localhost.
      // PORT=0 is worth stating because it is not a request for an ephemeral
      // port — the reader treats a zero as absent, and only a direct
      // startServer({ port: 0 }) asks the operating system for one.
      expect(readConfig({ PORT: '0' }).port).toBe(3002);
      expect(readConfig({ PORT: '' }).port).toBe(3002);
      expect(readConfig({ HOST: '' }).host).toBe('localhost');

      // The absent class is also the SILENT class: an unconfigured tutorial is
      // the normal case, so nothing is reported for it. '00' belongs here too,
      // because it is a base-10 zero however it is spelled.
      expect(readConfig({}).port).toBe(3002);
      expect(readConfig({ PORT: '00' }).port).toBe(3002);
      expect(errorSpy).not.toHaveBeenCalled();

      // The enforced PORT boundary, asserted at its edges with literals rather
      // than a pattern, because a boundary is a pair of exact numbers. 1024 is
      // the lowest non-privileged port and 65535 the highest a 16-bit port field
      // can express; the surrounding values are outside the policy.
      expect(readConfig({ PORT: '1024' }).port).toBe(1024);
      expect(readConfig({ PORT: '65535' }).port).toBe(65535);
      expect(readConfig({ PORT: ' 4010 ' }).port).toBe(4010);
      expect(errorSpy).not.toHaveBeenCalled();

      // Every one of these reached listen() before the parser existed, and each
      // failed in its own way: '65536', '-1' and '1.5' threw ERR_SOCKET_BAD_PORT
      // synchronously — out of startServer, before the callback that reports
      // startup errors could run — while '0x50' and '1e3' coerced to the
      // privileged port 80 and to 1000. Now each resolves to the documented
      // default, and each is reported rather than ignored in silence.
      const refusedPorts = [
        '-1',
        '1.5',
        '1023',
        '65536',
        '0x50',
        '1e3',
        'Infinity',
        '+4010',
        '4010abc',
        'not-a-port'
      ];

      for (const refused of refusedPorts) {
        errorSpy.mockClear();

        expect(readConfig({ PORT: refused }).port).toBe(3002);

        // One line, on stderr, naming the variable, the value and the default
        // that replaced it — and a single line, so a value carrying a newline
        // cannot add a second one.
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(
          `Ignoring PORT=${refused}: ${
            /^\d+$/.test(refused)
              ? 'outside the non-privileged range 1024-65535'
              : 'not a base-10 integer'
          }. Using the default PORT=3002 instead.`
        );
      }

      // Binding every interface is an opt-in with exactly two canonical
      // spellings, and both are honoured: a container needs one of them, and the
      // repository's own template recommends 0.0.0.0 for exactly that
      // (src/backend/.env.example:46-49). Nothing else about a host is filtered,
      // so an ordinary address is passed through untouched.
      errorSpy.mockClear();

      expect(readConfig({ HOST: '0.0.0.0' }).host).toBe('0.0.0.0');
      expect(readConfig({ HOST: '::' }).host).toBe('::');
      expect(readConfig({ HOST: '  192.168.1.10  ' }).host).toBe('192.168.1.10');

      // Addresses that merely LOOK like the wildcard family are passed through,
      // because the policy is about which address a value denotes rather than
      // which characters it contains. '::1' is loopback; '::ffff:192.168.1.5'
      // names one specific IPv4 host through IPv6 notation; '0:0' and '0b0' are
      // not addresses in any family, so the resolver rejects them and the
      // startup diagnostic reports that failure.
      expect(readConfig({ HOST: '::1' }).host).toBe('::1');
      expect(readConfig({ HOST: '::ffff:192.168.1.5' }).host).toBe('::ffff:192.168.1.5');
      expect(readConfig({ HOST: '0:0' }).host).toBe('0:0');
      expect(readConfig({ HOST: '0b0' }).host).toBe('0b0');
      expect(errorSpy).not.toHaveBeenCalled();

      // The same exposure reached by accident, refused — and the list is long
      // because one wildcard has many spellings, every one of them measured by
      // binding a real socket and reading back server.address(). The first group
      // is what getaddrinfo(3) zero-fills from a bare or partial numeric form.
      // The second is IPv6 notation for the unspecified address, including the
      // compressed, fully written, dotted-tail and zone-suffixed forms. The
      // third is its IPv4-mapped equivalent, which listens on every IPv4
      // interface just as 0.0.0.0 does: a socket bound to ::ffff:0.0.0.0
      // accepted a connection to this host's own routable address. Before the
      // policy existed each of these bound a wildcard, so the documented
      // "explicit wildcard opt-in" was not in fact required to publish the
      // server on every interface.
      const wildcardAliases = [
        '0',
        '00',
        '0x0',
        '0.0',
        '0.0.0',
        '000.000.000.000',
        '0x0.0x0.0x0.0x0',
        '::0',
        '0:0:0:0:0:0:0:0',
        '::0.0.0.0',
        '0::0.0.0.0',
        '0:0:0:0:0:0:0.0.0.0',
        '::%eth0',
        '::ffff:0.0.0.0',
        '::ffff:0:0'
      ];

      for (const alias of wildcardAliases) {
        errorSpy.mockClear();

        expect(readConfig({ HOST: alias }).host).toBe('localhost');

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(
          `Ignoring HOST=${alias}: an ambiguous spelling of the wildcard address ` +
            '(set HOST=0.0.0.0 or HOST=:: to bind every interface deliberately). ' +
            'Using the default HOST=localhost instead.'
        );
      }
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
    it('should bind the requested host on a fresh ephemeral port each time, log the bound port, and report a failed bind in one sanitized line without masking its cause', async () => {
      // The failure path sets process.exitCode rather than calling process.exit,
      // so the status has to be read off the process and put back at once. Jest
      // runs these tests in a worker whose own exit status is that same value: a
      // 1 left behind here would fail `npm test` with every assertion passing.
      const exitCodeBefore = process.exitCode;

      // Port 0 is the whole point of this test: the requested value and the bound
      // value differ, so a banner built from the wrong one is visibly wrong.
      const first = track(startServer({ host: '127.0.0.1', port: 0 }));

      await onceListening(first);

      // The socket's own view of what it bound, and the only authority on it: the
      // banner interpolates config.host as a literal, so a module that stopped
      // passing the host to listen() would bind the wildcard interface — reachable
      // from every network this machine is on — and still print
      // "http://127.0.0.1:...". Only address() distinguishes the two, reporting
      // '0.0.0.0' or '::' rather than the loopback address that was asked for.
      const address = first.address();

      expect(first.listening).toBe(true);
      expect(address.address).toBe('127.0.0.1');
      expect(address.family).toBe('IPv4');
      expect(typeof address.port).toBe('number');
      expect(address.port).toBeGreaterThan(0);

      expect(logSpy).toHaveBeenCalledWith(`Server listening on http://127.0.0.1:${address.port}`);
      expect(logSpy).toHaveBeenCalledWith(`Try: curl http://127.0.0.1:${address.port}/hello`);
      expect(logSpy).toHaveBeenCalledTimes(2);

      // The assertion that stops the two above being tautological: had the module
      // logged config.port instead of server.address().port, both lines would read
      // "http://127.0.0.1:0" — an address no client can call.
      expect(logSpy.mock.calls[0][0]).not.toContain(':0');
      expect(logSpy.mock.calls[1][0]).not.toContain(':0');

      // A second server asking for port 0 exactly as the first did, while the first
      // still holds its port. Two distinct ports from two identical requests is
      // what an ephemeral allocation looks like and what a fixed port cannot
      // produce: a regression to listen(config.port || DEFAULT_PORT, ...) would
      // send both requests to 3002, so this bind would fail outright.
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
      // listening on: a real EADDRINUSE from the operating system with nothing
      // mocked. Express 5 delivers the failure to the same callback that would
      // otherwise print the banner, which is why the module branches on that
      // callback's error argument — without the branch it would read
      // server.address().port off a null address and report a TypeError instead.
      logSpy.mockClear();

      const failing = track(startServer({ host: '127.0.0.1', port: address.port }));

      let caught = null;

      try {
        // onceListening() rejects with the server's Error, so the failure is
        // awaited rather than raced.
        await onceListening(failing);
      } catch (error) {
        caught = error;
      }

      expect(caught).not.toBeNull();
      expect(caught.code).toBe('EADDRINUSE');

      expect(failing.address()).toBeNull();
      expect(failing.listening).toBe(false);

      // The failure is reported on stderr in ONE line and ONE argument: the
      // address that was requested (there is no bound one to name) and the
      // error's code token. The Error object is deliberately absent from the
      // call — passing it printed four stack frames plus errno, syscall, address
      // and port, and a stack names absolute paths from the machine it ran on.
      // The cause still reaches the operator, because EADDRINUSE is the part of
      // that Error that says what to do about it.
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]).toHaveLength(1);

      const reported = errorSpy.mock.calls[0][0];

      expect(reported).toBe(
        `Failed to start server on http://127.0.0.1:${address.port} (EADDRINUSE)`
      );

      // The negative half of the contract, stated explicitly so a regression to
      // logging the Error — or to interpolating its message — fails here: no
      // stack frame, no path from this checkout, no dependency directory, and no
      // control character that could break the line in two.
      expect(reported).not.toContain('    at ');
      expect(reported).not.toContain('Error:');
      expect(reported).not.toContain(__dirname);
      expect(reported).not.toContain('node_modules');
      expect(reported.split('\n')).toHaveLength(1);
      expect(reported).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/);

      // Non-zero, because `npm start`, a CI step and a process manager all read
      // the exit status, and a server that never bound must not report success.
      // It is SET rather than forced: process.exit() would tear the process down
      // before an asynchronous write to stderr had flushed, which would lose the
      // diagnostic asserted above. Read it, restore it, then assert — restoring
      // first means a failing assertion cannot leak a failing status either.
      const exitCodeAfterFailedBind = process.exitCode;

      process.exitCode = exitCodeBefore;

      expect(exitCodeAfterFailedBind).toBe(1);
      expect(exitSpy).not.toHaveBeenCalled();

      expect(logSpy).toHaveBeenCalledTimes(0);

      // A fourth server, asked to bind a HOST carrying a newline. Two properties
      // are under test. The diagnostic must stay ONE line: an unescaped value
      // ends the line early and starts a second one that reads exactly like a
      // genuine startup banner, which is how a log gets forged (CWE-117) —
      // measured on the unsanitized form, which printed "Server listening on
      // http://attacker.invalid:443" as a line of its own. And the control
      // character must be escaped rather than dropped, so the diagnostic still
      // shows a reader what was actually set.
      errorSpy.mockClear();

      const forgedBanner = 'Server listening on http://attacker.invalid:443';
      const hostile = track(startServer({ host: `127.0.0.1\n${forgedBanner}`, port: 0 }));

      let hostileError = null;

      try {
        await onceListening(hostile);
      } catch (error) {
        hostileError = error;
      }

      const exitCodeAfterHostileHost = process.exitCode;

      process.exitCode = exitCodeBefore;

      // The host cannot resolve, so the bind fails and the failure arm runs.
      expect(hostileError).not.toBeNull();
      expect(exitCodeAfterHostileHost).toBe(1);
      expect(hostile.address()).toBeNull();

      expect(errorSpy).toHaveBeenCalledTimes(1);

      const sanitized = errorSpy.mock.calls[0][0];

      expect(sanitized.split('\n')).toHaveLength(1);
      expect(sanitized).toContain(`127.0.0.1\\x0a${forgedBanner}`);
      expect(sanitized).not.toContain(`\n${forgedBanner}`);
      expect(sanitized).toMatch(/ \([A-Z0-9_]+\)$/);

      // Further servers, proving the HOST policy by what gets BOUND rather than
      // by what readConfig returned — the assertion the configuration-level
      // checks cannot make. Each of these spellings, measured before the policy
      // existed, bound a wildcard and reached every network this machine is on:
      // the bare numeric form bound 0.0.0.0, the three IPv6 forms bound ::, and
      // the IPv4-mapped form bound ::ffff:0.0.0.0. Port 0 keeps the checks off
      // the project's default port, and the canonical wildcards are asserted at
      // the configuration level above rather than bound here, because binding
      // every interface is not something a test suite should do on a shared
      // machine.
      const refusedHosts = ['0', '::0.0.0.0', '0:0:0:0:0:0:0.0.0.0', '0::0.0.0.0', '::ffff:0.0.0.0'];

      for (const refusedHost of refusedHosts) {
        errorSpy.mockClear();
        logSpy.mockClear();

        const aliasConfig = readConfig({ HOST: refusedHost });

        expect(aliasConfig.host).toBe('localhost');

        const loopback = track(startServer({ host: aliasConfig.host, port: 0 }));

        await onceListening(loopback);

        // 'localhost' resolves to either loopback address depending on how the
        // machine orders its families, and both are loopback-only; what matters
        // is that it is neither wildcard, `0.0.0.0` or `::`, and neither the
        // IPv4-mapped wildcard `::ffff:0.0.0.0`.
        expect(['127.0.0.1', '::1']).toContain(loopback.address().address);
      }
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
      // fresh server, because coverage cannot do this job: startServer() registers
      // both handlers from a single arrow function, so the first emission marks it
      // covered whether the module's list holds one signal or two. process.emit
      // returns true only when the signal had a listener, so a signal the module
      // stopped registering fails this loop rather than the coverage report.
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

        // Any handler this suite does not own steps aside for the emission below,
        // so nothing it does is attributed to the assertions that follow, and goes
        // back in the `finally`. The previous iteration's own handler is not among
        // them — it was removed at the foot of that iteration.
        const restoreSignalListeners = detachSignalListeners(signal, before.get(signal));

        try {
          // Emits the process's signal event in-process: no operating-system signal
          // is sent, and what runs is the listener startServer() registered rather
          // than a handler this test reached into the module for. The return value
          // is the registration assertion — true means the process had a listener
          // for this exact signal name.
          expect(process.emit(signal)).toBe(true);
        } finally {
          restoreSignalListeners();
        }

        await onceClosed(server);

        expect(logSpy.mock.calls).toEqual([
          [`${signal} received: closing server...`],
          ['Server closed. Goodbye!']
        ]);
        expect(exitSpy).toHaveBeenCalledWith(0);
        expect(exitSpy).toHaveBeenCalledTimes(1);

        expect(server.listening).toBe(false);

        // Leave the process's listener list exactly as this iteration found it,
        // so the next one starts from the same state rather than from a growing
        // pile of handlers pointing at closed servers.
        removeSignalListenersAddedSince(before);
      }
    });
  });
});
