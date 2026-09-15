/**
 * Executable entry point of the Node.js tutorial service: HTTP server
 * initialization.
 *
 * This module has one job — bind the assembled application to a validated host
 * and port, announce the URL it actually reached, and shut down cleanly when
 * signalled. Assembling the application is src/app.js's job, and keeping the
 * two apart is what lets the test suite drive the application object through
 * supertest, with no server started beforehand and no fixed port. The Flask
 * sibling in this repository is split the same way: assembly in
 * src/backend/app.py, the listener and its lifecycle in src/backend/wsgi.py.
 *
 * The network binding is the only contract this file owns; the endpoint's own
 * contract is documented in ../docs/api-reference.md.
 */

const { createApp } = require('./app');

// The two defaults below are the single source of truth for the binding: they
// appear as literals here and nowhere else in the source tree.
//
// 127.0.0.1 is the loopback interface, so the tutorial server is deliberately
// not reachable from the network. Export HOST in the shell to bind elsewhere.
const DEFAULT_HOST = '127.0.0.1';

// 3000 is the port the official Express 5 starter uses, so it is the port a
// learner arriving from that material expects. Nothing here reads a .env file:
// neither npm script passes --env-file, so this process sees only variables
// already exported in the shell.
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

// How much of an untrusted value one line of standard error may carry: its
// length is chosen by whoever exported it, not by this process.
const MAX_LOGGED_CHARS = 120;

// The code points JSON.stringify leaves exactly as they arrived and a log line
// cannot afford to pass on: DEL and the C1 controls, the line and paragraph
// separators U+2028 and U+2029, and the bidi and invisible formatting
// controls. None is visible in a terminal, and between them they can start
// what reads as a new record, reverse the text around them, or hide it.
const UNSAFE_LOG_CHARS = new RegExp(
  '[\\u007f-\\u009f\\u00ad\\u061c\\u180e\\u200b-\\u200f\\u2028\\u2029' +
    '\\u202a-\\u202e\\u2060-\\u206f\\ufeff\\ufff9-\\ufffb]',
  'g',
);

// A value shaped like a credential is never printed, whichever variable carried
// it: its text names a secret, or it carries the user:password component of a
// URL. Exporting the wrong variable is how either reaches this process.
const SECRET_LIKE =
  /secret|token|password|passwd|pwd|api[-_]?key|credential|bearer/i;
const USERINFO_LIKE = /[^\s:/@]+:[^\s/@]*@/;

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
 * Render untrusted text as one field of a line of standard error.
 *
 * Everything this process reports but did not write itself — an environment
 * value, an errno, an error message — passes through here, so no line it
 * prints can be forged, reordered or padded out by what it reports. In order:
 * a credential-shaped value is replaced rather than shown, the text is cut to
 * MAX_LOGGED_CHARS with its original length stated, and JSON.stringify quotes
 * it and escapes the controls below U+0020 before the replacement escapes the
 * code points it leaves intact. A rendered field is always quoted, which is
 * what makes the untrusted part of a line obvious.
 *
 * @param {unknown} value Text to render, of any type.
 * @returns {string} A quoted, bounded, escaped rendering of the value.
 */
function renderForLog(value) {
  const text = String(value);

  if (SECRET_LIKE.test(text) || USERINFO_LIKE.test(text)) {
    return `"[redacted, ${text.length} characters]"`;
  }

  const head = text.slice(0, MAX_LOGGED_CHARS);
  const quoted = JSON.stringify(head).replace(
    UNSAFE_LOG_CHARS,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );

  return text.length > head.length
    ? `${quoted} (truncated from ${text.length} characters)`
    : quoted;
}

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
  const offender = `${variableName}=${renderForLog(rawValue)}`;
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
  const isIpv6 = address.address.includes(':');
  const host = isIpv6 ? `[${address.address}]` : address.address;
  return `${host}:${address.port}`;
}

// Configuration is resolved before anything is bound, so an unusable value
// costs no socket. Both values are resolved even when the first one is refused,
// so a learner who got both wrong is told about both in one run.
const HOST = resolveHost();
const PORT = resolvePort();

// Listener and shutdown state, at module scope because signals and listener
// errors arrive repeatedly and can interleave. Each flag answers a different
// question — has the one bind attempt settled, did it ever reach the accepting
// state, has a failure been reported, were connections cut rather than drained
// — and keeping them apart is what lets a shutdown decide from what the
// listener is doing now instead of from what went wrong earlier.
let listenSettled = false;
let listenerUp = false;
let failureReported = false;
let forcedClose = false;

// Null until a shutdown starts, then 'drain' for a listener that came up and is
// being closed, or 'cancel' for a bind that never completed. The two escalate
// differently under a second signal, so this is a mode, not a boolean.
let shutdownMode = null;

/**
 * Report a listener failure once, on standard error, and fail the process.
 *
 * The two failures are named apart rather than in the same words: a bind that
 * never succeeded is about the port or the address, a listener that failed
 * after startup is about neither, and the first one's remedy would be
 * misdirection for the second.
 *
 * @param {NodeJS.ErrnoException} error Error raised by the listener.
 * @returns {void}
 */
function reportListenerFailure(error) {
  if (failureReported) {
    return;
  }
  failureReported = true;

  // The status is set rather than exited on, so the message below is flushed
  // before the drained event loop ends the process.
  process.exitCode = 1;

  const code = renderForLog(error.code ?? error.name ?? 'unknown');

  if (listenerUp) {
    const message = renderForLog(error.message);
    console.error(`Listener failed after startup: ${code} - ${message}`);
    return;
  }

  // Only an own property can supply a remedy: an inherited one would put a
  // member of Object's prototype on the line in place of guidance.
  const remedy = Object.hasOwn(BIND_FAILURE_REMEDIES, error.code)
    ? BIND_FAILURE_REMEDIES[error.code]
    : renderForLog(error.message);
  const attempted = `http://${formatAuthority({ address: HOST, port: PORT })}`;
  console.error(
    `Cannot listen on ${renderForLog(attempted)}: ${code} - ${remedy}`,
  );
}

/**
 * Handle an error raised by the listener, whether at startup or long after it.
 *
 * @param {NodeJS.ErrnoException} error Error raised by the listener.
 * @returns {void}
 */
function handleListenerError(error) {
  // Read before anything is reported, because the report is worded from it.
  const afterStartup = listenerUp;

  reportListenerFailure(error);
  listenSettled = true;

  if (!afterStartup || shutdownMode !== null) {
    return;
  }

  // An error after startup does not close the listening handle: Node emits the
  // event and leaves the socket accepting. Without this the process would go on
  // serving after recording itself as failed, and a later signal would find a
  // listener nothing intends to close. The handle is asked, not assumed.
  if (!server.listening) {
    return;
  }

  console.error('Closing the listener after the failure above');
  drainAndClose();
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
 * It reads the `server` binding declared below, which is safe because `listen`
 * is asynchronous: this callback cannot run before the listener exists.
 *
 * @param {NodeJS.ErrnoException} [error] Startup error, when the bind failed.
 * @returns {void}
 */
function announceListening(error) {
  // Settled either way, which is what tells a socket still coming up from one
  // that never arrived.
  listenSettled = true;

  if (error) {
    handleListenerError(error);
    return;
  }

  listenerUp = true;

  // A signal that arrived while the socket was coming up called the bind off
  // there and then, and on this runtime a bind called off that way does not
  // reach this callback at all. If the socket won that race, there is still no
  // readiness to announce: close it instead.
  if (shutdownMode !== null) {
    if (server.listening) {
      server.close();
    }
    return;
  }

  // The only line written to standard output at startup, and the only one
  // written while the server runs — there is no per-request logging. The
  // shutdown notice is the one other line standard output can carry, and every
  // failure goes to standard error instead.
  //
  // The address is taken from the listener rather than from the input, so the
  // URL names the host and port the kernel actually assigned.
  const authority = formatAuthority(server.address());
  console.log(`Listening on http://${authority} (GET /hello)`);
}

const server =
  HOST === null || PORT === null
    ? null
    : createApp().listen(PORT, HOST, announceListening);

if (server !== null) {
  // The callback above is once()-wrapped, so it can report only the first event
  // it sees. A listener error arriving after startup would then be an unhandled
  // 'error' event, which crashes the process, so the same handler stays
  // registered for the listener's whole life. Its report is latched, so the two
  // paths still produce a single message between them.
  server.on('error', handleListenerError);
}

/**
 * Stop serving, let in-flight requests finish within a bounded grace period,
 * and let the process end on its own once the listener has closed.
 *
 * @returns {void}
 */
function drainAndClose() {
  shutdownMode = 'drain';

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
    // it is reported and never normalized into a successful exit. The handle
    // check made before this call makes it unlikely rather than impossible: the
    // listening state can still change between that check and this call.
    if (closeError) {
      const code = renderForLog(closeError.code ?? closeError.name);
      const message = renderForLog(closeError.message);
      console.error(`Server did not close cleanly: ${code} - ${message}`);
      process.exitCode = 1;
      return;
    }

    // Zero only for a shutdown that was clean in both senses: connections
    // drained on their own rather than being cut mid-flight, and no listener
    // failure was reported earlier in this process's life. A clean close cannot
    // erase a failure that already happened.
    //
    // Setting the status here rather than exiting on it is what guarantees the
    // lines above are flushed: the drained event loop ends the process by
    // itself. The only paths that end it directly are the two below that
    // follow a bind called off, where nothing else can.
    process.exitCode = forcedClose || failureReported ? 1 : 0;
  });
}

/**
 * Call off a bind that has not completed yet, because a signal arrived while
 * the socket was still coming up.
 *
 * @param {string} signalName Name of the signal that triggered the shutdown.
 * @returns {void}
 */
function cancelPendingListen(signalName) {
  shutdownMode = 'cancel';

  // Nothing was ever served, so this goes to standard error rather than
  // announcing a server closing on standard output.
  console.error(
    `${signalName} received before the listener was up: ` +
      'the pending bind has been called off',
  );

  // close() is what calls the bind off. Measured on Node 24.21.0, it increments
  // the server's internal listening id, and the host name lookup behind the
  // pending listen abandons its own callback once that id has changed: no
  // socket is bound, no readiness is announced, no 'error' event follows. No
  // callback is passed, because a server that was never open closes with
  // ERR_SERVER_NOT_RUNNING — expected here, not a failure to report.
  server.close();

  // That does not end the process. The host name lookup cannot be cancelled
  // and keeps the event loop alive until the resolver answers, so a stalled
  // resolver would defer the exit for as long as it stalls. This deadline holds
  // the shutdown to the bound a drain gets. It and the second-signal branch of
  // escalateShutdown() are the only two paths here that exit directly, and both
  // are reached only after a bind has been called off.
  const deadline = setTimeout(() => {
    forcedClose = true;
    const expiry = `Shutdown grace period of ${SHUTDOWN_GRACE_MS} ms expired`;
    console.error(`${expiry} with the bind still pending: exiting now`);
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  // unref() so the deadline cannot hold the process open by itself: once the
  // lookup has settled there is nothing left to wait for.
  deadline.unref();
}

/**
 * Shorten a shutdown that is already under way, because a second signal means
 * whoever sent the first is no longer waiting.
 *
 * @param {string} signalName Name of the signal that arrived.
 * @returns {void}
 */
function escalateShutdown(signalName) {
  forcedClose = true;

  if (shutdownMode === 'drain') {
    // Closing every open connection releases a request holding the drain open.
    console.error(
      `${signalName} received during shutdown: closing open connections now`,
    );
    server.closeAllConnections();
    return;
  }

  // A bind that was called off has no connections to cut and no drain to
  // shorten, and the lookup behind it still holds the event loop open, so
  // honouring this second signal means ending the process here.
  console.error(`${signalName} received during shutdown: exiting now`);
  process.exit(1);
}

/**
 * Stop serving in response to a signal.
 *
 * What happens next is decided from what the listener is doing now, not from
 * what went wrong earlier: a listener that is up is drained, a bind still in
 * flight is called off, and a process with nothing listening keeps the exit
 * status it has already recorded.
 *
 * @param {string} signalName Name of the signal that triggered the shutdown,
 *   logged so it is visible which one arrived.
 * @returns {void}
 */
function shutdown(signalName) {
  // A shutdown already under way is escalated rather than re-entered. This
  // check comes first because a server that is already closing no longer
  // reports itself as listening, and an escalation must not be mistaken for a
  // missing listener.
  if (shutdownMode !== null) {
    escalateShutdown(signalName);
    return;
  }

  // A signal can arrive when there is nothing to close at all: the
  // configuration was refused, so no listener was ever created. That is not a
  // shutdown, so the note goes to standard error rather than claiming a server
  // is closing, close() is not called, and the failure status already recorded
  // is left exactly as it is.
  if (server === null) {
    console.error(`${signalName} received: no listener to close`);
    return;
  }

  // The socket can still be coming up: `listen` is asynchronous, so the server
  // exists before it is listening, and that window lasts as long as a host name
  // takes to resolve. The bind is called off there and then, rather than
  // deferred to a callback a stalled resolver may keep from running.
  if (!listenSettled) {
    cancelPendingListen(signalName);
    return;
  }

  // Settled, and nothing is accepting: the bind failed, or a listener that did
  // come up has closed since. Asking the handle rather than a flag recording an
  // earlier failure is what keeps this branch right in the second case.
  if (!server.listening) {
    console.error(`${signalName} received: no listener to close`);
    return;
  }

  console.log(`${signalName} received: closing server`);
  drainAndClose();
}

// Both signals reach the same clean close, because both arrive in normal use:
// Ctrl-C in the learner's terminal sends SIGINT, while an automated run's
// `kill "$SERVER_PID"` sends SIGTERM.
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
