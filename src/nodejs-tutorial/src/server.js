/**
 * Executable entry point of the Node.js tutorial service: HTTP server
 * initialization.
 *
 * This module has one job — bind the assembled application to a host and port,
 * announce the URL it is listening on, and shut down cleanly when signalled.
 * Assembling the application is src/app.js's job, and keeping the two apart is
 * what lets the test suite drive the application object directly, through
 * supertest, without binding a port at all. The Flask sibling in this
 * repository is split the same way: assembly in src/backend/app.py, the
 * listener and its lifecycle in src/backend/wsgi.py.
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
const HOST = process.env.HOST || '127.0.0.1';

// 3000 is the port the official Express 5 starter uses, so it is the port a
// learner arriving from that material expects. Export PORT in the shell to
// override it — the README's troubleshooting section documents that escape for
// a port that is already taken.
//
// Nothing here reads a .env file: neither npm script passes --env-file, so this
// process sees only variables already exported in the shell. Applying the
// .env.example template is the learner's step, not this file's.
const PORT = process.env.PORT || 3000;

const server = createApp().listen(PORT, HOST, () => {
  // The only line this application ever writes to stdout — no startup banner
  // and no per-request logging. It is interpolated rather than hardcoded so it
  // stays truthful when HOST or PORT is overridden.
  console.log(`Listening on http://${HOST}:${PORT} (GET /hello)`);
});

/**
 * Stop serving and exit once the server has finished closing.
 *
 * @param {string} signalName Name of the signal that triggered the shutdown,
 *   logged so it is visible which one arrived.
 * @returns {void}
 */
function shutdown(signalName) {
  console.log(`${signalName} received: closing server`);

  // Idle keep-alive sockets hold a closing server open until they time out, so
  // they are dropped first (Node 18.2+) to keep the exit prompt. In-flight
  // requests are still allowed to finish: close() stops accepting new
  // connections and fires its callback once the last one has drained.
  server.closeIdleConnections();
  server.close(() => process.exit(0));
}

// Both signals reach the same clean close, because both arrive in normal use:
// Ctrl-C in the learner's terminal sends SIGINT, while an automated run's
// `kill "$SERVER_PID"` sends SIGTERM.
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
