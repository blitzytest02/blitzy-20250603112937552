/**
 * Executable entry point of the Node.js tutorial service: HTTP server
 * initialization.
 *
 * This module has one job — bind the assembled application to a validated host
 * and port, announce the URL it actually reached, and shut down cleanly when
 * signalled. Assembling the application is src/app.js's job, and keeping the
 * two apart is what lets the test suite drive the application object directly,
 * through supertest: the suite needs no server started beforehand and no fixed
 * port, because supertest takes the application object it is handed, opens a
 * temporary listener on a port the kernel assigns, and connects to that port
 * over 127.0.0.1 for the one request. The Flask sibling in this repository is
 * split the same way: assembly in src/backend/app.py, the listener and its
 * lifecycle in src/backend/wsgi.py.
 *
 * The network binding is the only contract this file owns; the endpoint's own
 * contract is documented in ../docs/api-reference.md.
 *
 * Every byte this process writes is accounted for here, so its output can be
 * predicted exactly. Standard output carries at most two lines — the readiness
 * banner and the shutdown notice — and every abnormal condition (a refused
 * configuration value, a bind failure, a forced or failed close) is written to
 * standard error and leaves a non-zero exit status behind.
 */

const { createApp } = require('./app');

// The two defaults below are the single source of truth for the binding: they
// appear as literals here and nowhere else in the source tree.
//
// 127.0.0.1 is the loopback interface, so the tutorial server is deliberately
// not reachable from the network. Export HOST in the shell to bind elsewhere.
const DEFAULT_HOST = '127.0.0.1';

// 3000 is the port the official Express 5 starter uses, so it is the port a
// learner arriving from that material expects. Export PORT in the shell to
// override it — the README's troubleshooting section documents that escape for
// a port that is already taken.
//
// Nothing here reads a .env file: neither npm script passes --env-file, so this
// process sees only variables already exported in the shell. Applying the
// .env.example template is the learner's step, not this file's.
const DEFAULT_PORT = 3000;

// The accepted port range, and the same range .env.example documents. The lower
// bound is where unprivileged ports begin, so the tutorial never has to be run
// with elevated privileges; the upper bound is the largest 16-bit port number.
const MIN_PORT = 1024;
const MAX_PORT = 65535;

// The accepted rules, stated once each as data. The port rule is quoted by
// both of the branches that can refuse a port, and holding each rule in one
// place is what stops the message a learner reads from drifting away from the
// check the resolver below actually performs.
const PORT_RULE =
  `expected one whole number from ${MIN_PORT} to ${MAX_PORT}, so port 0 ` +
  `and the privileged ports are refused (blank or unset means ${DEFAULT_PORT})`;
const HOST_RULE =
  'expected an address or host name containing no whitespace and no control ' +
  `characters (blank or unset means ${DEFAULT_HOST})`;

// How long a signalled shutdown waits for in-flight requests before it stops
// being patient. A bounded wait is what keeps Ctrl-C responsive: an unbounded
// close() never returns while a single stalled connection is still open.
const SHUTDOWN_GRACE_MS = 10000;

// One remedy clause per failure a learner can realistically provoke, so the
// stderr line says what to do about it and not only that it happened. Any other
// errno falls back to the error's own message, which is never dropped. Each
// clause carries its own full stop, so the reporter never has to add one and
// can never double it up against a message that already ends in one.
const BIND_FAILURE_REMEDIES = Object.freeze({
  EADDRINUSE:
    'another process already holds that port, so stop it or export PORT ' +
    'with a free one.',
  EACCES:
    'that port or interface is not permitted for this user, so export ' +
    `PORT within ${MIN_PORT}-${MAX_PORT}.`,
  EADDRNOTAVAIL:
    'no local interface carries that address, so export HOST as an address ' +
    'this machine owns.',
  ENOTFOUND:
    'that host name did not resolve, so export HOST as an address or a ' +
    'resolvable name.',
});

/**
 * Refuse an environment value as unusable and mark the process as failed.
 *
 * A configuration mistake is the learner's to fix rather than a stack trace to
 * read, so it is reported instead of thrown: one line on standard error naming
 * the variable, the value that arrived and the rule it broke, a non-zero exit
 * status, and no socket opened at all.
 *
 * @param {string} variableName Environment variable that carried the value.
 * @param {string} rawValue Value as received, after trimming only.
 * @param {string} rule What the variable accepts, phrased as guidance.
 * @returns {null} Always null, so a resolver can `return refuseValue(...)`.
 */
function refuseValue(variableName, rawValue, rule) {
  // JSON.stringify quotes the value and escapes control characters, so a
  // newline inside it cannot forge a second line of output and an invisible
  // character is shown as an escape instead of disappearing from the message.
  const offender = `${variableName}=${JSON.stringify(rawValue)}`;
  console.error(`Invalid ${offender}: ${rule}. Nothing was bound.`);
  process.exitCode = 1;
  return null;
}

/**
 * Resolve the TCP port to bind from the environment.
 *
 * Environment values are always text and `listen()` is overloaded, which is why
 * this cannot be a bare read with a fallback: handed the string 'abc', `listen`
 * takes its IPC overload and creates a filesystem socket, and handed '0' it
 * binds an arbitrary free port. Both are silent, so the value is parsed
 * strictly here and a Number is what reaches the listener.
 *
 * @returns {number|null} The validated port, or null when the value is
 *   unusable — in which case the refusal has already been reported.
 */
function resolvePort() {
  const raw = (process.env.PORT ?? '').trim();

  // An exported-but-empty variable means the same thing to a learner as one
  // that was never exported, so both take the default rather than failing.
  if (raw === '') {
    return DEFAULT_PORT;
  }

  // Anchored across the whole trimmed value, so '3000x', '0x10', '3.5', '+3000'
  // and '-1' are refused rather than being quietly truncated by a parser that
  // reads as far as it can and keeps what it got.
  if (!/^\d+$/.test(raw)) {
    return refuseValue('PORT', raw, PORT_RULE);
  }

  const port = Number(raw);
  if (port < MIN_PORT || port > MAX_PORT) {
    return refuseValue('PORT', raw, PORT_RULE);
  }

  return port;
}

/**
 * Resolve the host or address to bind from the environment.
 *
 * @returns {string|null} The validated host, or null when the value is
 *   unusable — in which case the refusal has already been reported.
 */
function resolveHost() {
  const raw = (process.env.HOST ?? '').trim();

  // The same fallback rule the port follows: exported-but-empty and never
  // exported are one case, and both take the default.
  if (raw === '') {
    return DEFAULT_HOST;
  }

  // Interior whitespace and control characters are refused because this value
  // reaches both the listener and the readiness banner: a newline or carriage
  // return in it would let an environment value forge an extra line of output,
  // and any other control character would make the banner misreport where the
  // server can be reached.
  if (/[\s\u0000-\u001f\u007f-\u009f]/.test(raw)) {
    return refuseValue('HOST', raw, HOST_RULE);
  }

  return raw;
}

/**
 * Render an address as the authority component of an HTTP URL.
 *
 * An IPv6 address contains colons of its own, which would run into the port
 * separator and produce an unusable URL, so it is wrapped in brackets as
 * RFC 3986 requires: address '::1' with port 3000 renders as '[::1]:3000'.
 *
 * @param {{ address: string, port: number }} address Address information, in
 *   the shape `server.address()` returns for a TCP listener — or that same
 *   shape built from the requested values, when reporting a bind that failed
 *   and therefore has no listener to ask.
 * @returns {string} `host:port`, with the host bracketed when it is IPv6.
 */
function formatAuthority(address) {
  // A colon anywhere in the address is what identifies it as IPv6 here: an
  // IPv4 address and a host name never contain one.
  const isIpv6 = address.address.includes(':');
  const host = isIpv6 ? `[${address.address}]` : address.address;
  return `${host}:${address.port}`;
}

// Configuration is resolved before anything is bound, so an unusable value
// costs no socket. Both values are resolved even when the first one is refused,
// so a learner who got both wrong is told about both in one run.
const HOST = resolveHost();
const PORT = resolvePort();

// Latched, so that the two paths able to report a listener failure — the
// callback argument below and the 'error' listener registered after it —
// together produce exactly one message.
let bindFailureReported = false;

/**
 * Report a listener failure once, on standard error, and fail the process.
 *
 * @param {NodeJS.ErrnoException} error Error raised by the listener.
 * @returns {void}
 */
function reportBindFailure(error) {
  if (bindFailureReported) {
    return;
  }
  bindFailureReported = true;

  // The status is set rather than exited on, so the message below is flushed
  // before the drained event loop ends the process.
  process.exitCode = 1;

  const attempted = `http://${formatAuthority({ address: HOST, port: PORT })}`;
  const code = error.code ?? error.name;
  const remedy = BIND_FAILURE_REMEDIES[code] ?? error.message;
  console.error(`Cannot listen on ${attempted}: ${code} - ${remedy}`);
}

/**
 * Settle the outcome of the one bind attempt this process makes.
 *
 * Express 5 wraps this callback in once() and also registers it as the server's
 * first 'error' listener, so it is called with a startup error when the bind
 * fails and with no argument at all once the listener is up. Reading that
 * argument is the whole difference between reporting a failure and announcing a
 * success that never happened.
 *
 * It reads the `server` binding and the shutdown state declared below, which is
 * safe because `listen` is asynchronous: this callback cannot run before the
 * listener it describes exists.
 *
 * @param {NodeJS.ErrnoException} [error] Startup error, when the bind failed.
 * @returns {void}
 */
function announceListening(error) {
  if (error) {
    reportBindFailure(error);
    return;
  }

  // A signal that arrived while the socket was still coming up was recorded
  // rather than acted on, because a pending listen() cannot be cancelled. Now
  // that a listener exists, honour it: close instead of announcing a readiness
  // this process is about to give up. Declining the signal instead would leave
  // it serving after it had been asked to stop.
  if (pendingSignal !== null) {
    shutdown(pendingSignal);
    return;
  }

  // The only line written to standard output at startup, and the only one
  // written while the server runs — there is no per-request logging. The
  // shutdown notice below is the one other line this process can put on
  // standard output, and every failure goes to standard error instead.
  //
  // The address is taken from the listener rather than from the input, so the
  // URL names the host and port the kernel actually assigned.
  const authority = formatAuthority(server.address());
  console.log(`Listening on http://${authority} (GET /hello)`);
}

// Exactly one listener, created only when both values are usable. The strict
// validation above is also what keeps `listen`'s own synchronous argument
// errors unreachable: it is only ever handed a Number inside the port range and
// a host free of surprises.
const server =
  HOST === null || PORT === null
    ? null
    : createApp().listen(PORT, HOST, announceListening);

if (server !== null) {
  // The callback above is once()-wrapped, so it can report only the first event
  // it sees. A listener error arriving after startup would then be an unhandled
  // 'error' event, which crashes the process, so the same reporter stays
  // registered for the listener's whole life. It is idempotent, so the two
  // paths still produce a single message between them.
  server.on('error', reportBindFailure);
}

// Shutdown state, at module scope because signals arrive repeatedly and can
// interleave: `shuttingDown` makes the first signal the one that closes,
// `pendingSignal` holds a signal that arrived before the listener was up, and
// `forcedClose` records that connections were cut rather than drained.
let shuttingDown = false;
let pendingSignal = null;
let forcedClose = false;

/**
 * Stop serving, let in-flight requests finish within a bounded grace period,
 * and let the process end on its own once the listener has closed.
 *
 * @param {string} signalName Name of the signal that triggered the shutdown,
 *   logged so it is visible which one arrived.
 * @returns {void}
 */
function shutdown(signalName) {
  // A second signal means whoever sent the first is no longer waiting. Escalate
  // rather than re-entering: closing every open connection releases a request
  // that is holding the drain open. The note goes to standard error, because
  // standard output is reserved for the two routine lines. This check comes
  // first because a server that is already closing no longer reports itself as
  // listening, and an escalation must not be mistaken for a missing listener.
  if (shuttingDown) {
    forcedClose = true;
    console.error(
      `${signalName} received during shutdown: closing open connections now`,
    );
    server.closeAllConnections();
    return;
  }

  // A signal can also arrive when there is nothing to close: the configuration
  // was refused, so no listener was ever created, or the bind failed and no
  // listener ever came up. Neither is a shutdown, so the note goes to standard
  // error rather than claiming on standard output that a server is closing,
  // close() is not called at all, and the failure status already recorded is
  // left exactly as it is.
  if (server === null || bindFailureReported) {
    console.error(`${signalName} received: no listener to close`);
    return;
  }

  // The socket can also still be coming up. `listen` is asynchronous, so the
  // server exists before it is listening, and that window lasts as long as a
  // host name takes to resolve. A pending listen cannot be cancelled and
  // close() would not stop it, so the signal is recorded here and the listen
  // callback acts on it the moment the socket is up.
  if (!server.listening) {
    pendingSignal = signalName;
    return;
  }

  shuttingDown = true;

  console.log(`${signalName} received: closing server`);

  // close() stops accepting new connections and fires its callback once the
  // last in-flight request has drained. On this runtime it closes idle
  // keep-alive sockets by itself, so nothing needs closing ahead of it. What it
  // cannot do is give up: one stalled request leaves it pending forever, and
  // bounding that wait is this timer's only job.
  const graceTimer = setTimeout(() => {
    forcedClose = true;
    const expiry = `Shutdown grace period of ${SHUTDOWN_GRACE_MS} ms expired`;
    console.error(`${expiry}: closing open connections now`);
    server.closeAllConnections();
  }, SHUTDOWN_GRACE_MS);

  // unref() so the timer can never keep the process alive by itself. It only
  // has to fire while the server is still draining, which is the only moment it
  // matters, and the close callback below cancels it.
  graceTimer.unref();

  server.close((closeError) => {
    clearTimeout(graceTimer);

    // A close error — ERR_SERVER_NOT_RUNNING is the one Node documents, for a
    // server that was not open — is a real failure rather than a clean stop, so
    // it is reported and never normalized into a successful exit. The guard
    // above makes it unlikely rather than impossible: the listening state can
    // still change between that check and this call.
    if (closeError) {
      const code = closeError.code ?? closeError.name;
      console.error(
        `Server did not close cleanly: ${code} - ${closeError.message}`,
      );
      process.exitCode = 1;
      return;
    }

    // Zero only for a shutdown that was clean in both senses: connections
    // drained on their own rather than being cut mid-flight, and no listener
    // failure was reported earlier in this process's life. A clean close cannot
    // erase a failure that already happened.
    //
    // There is no process.exit() here or anywhere else in this file: setting
    // the status and letting the drained event loop end the process is what
    // guarantees the lines above are flushed, and it leaves room for any
    // cleanup handler a later lesson adds.
    process.exitCode = forcedClose || bindFailureReported ? 1 : 0;
  });
}

// Both signals reach the same clean close, because both arrive in normal use:
// Ctrl-C in the learner's terminal sends SIGINT, while an automated run's
// `kill "$SERVER_PID"` sends SIGTERM.
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
