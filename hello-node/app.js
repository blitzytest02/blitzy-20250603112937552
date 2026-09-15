/**
 * Assembles the Express application for the hello-node tutorial and registers every
 * route it serves, without ever binding a socket.
 *
 * Educational Focus: Demonstrates why application *assembly* is separated from the
 * HTTP *server*. This module's only job is to build a fully configured Express
 * application and hand it back; it never calls listen(), never reads process.env and
 * never chooses a port — `server.js` owns all three. That separation is what lets the
 * test suites exercise these routes in-process: a test calls createApp() and drives
 * the returned application through supertest, which binds it to an ephemeral loopback
 * port (port 0, assigned by the operating system) for the duration of a request and
 * closes that listener again once the response completes. So a test needs no
 * pre-running server, no fixed or configured port to reserve, and no teardown the
 * test author has to write — because supertest manages that throwaway listener,
 * rather than because no socket is involved. A module that both registered routes and
 * bound a port could still keep its binding behind a `require.main === module` guard,
 * exactly as `server.js` does at its foot, so the gain here is not that importing such
 * a module would be impossible: it is that requiring this one has no listener side
 * effect at all, and that host and port configuration stays out of the module that
 * defines the routes.
 *
 * Key Learning Concepts:
 * - The Express application factory pattern: a named function returning a brand-new,
 *   fully configured app, so each caller (and each test) gets an isolated instance
 *   with no shared state.
 * - Route registration order is load-bearing, not cosmetic: the GET handler, then the
 *   method guard on the same path, then the terminal unmatched-path handler. Express
 *   walks registrations in the order they were added, so moving any one of the three
 *   changes the status a client receives.
 * - Setting a media type explicitly with res.type() instead of trusting the
 *   framework's content-type inference.
 * - Exact-path matching: case sensitivity is a routing *setting*, not a default, so a
 *   service that documents one path has to ask for it.
 * - The difference between 405 Method Not Allowed (the path exists, the method does
 *   not) and 404 Not Found (there is no such path at all).
 *
 * @module app
 * @returns {express.Application} Through its createApp() factory: a configured
 *   Express application instance with every route registered and no socket bound.
 * @example
 * const { createApp } = require('./app');
 * const app = createApp();
 */

const express = require('express');

/**
 * The exact greeting the service returns to the calling HTTP client.
 *
 * Educational Note: This is the literal response body, not a message *about* the
 * response — eleven bytes, capital `H`, lowercase `w`, a single space, no punctuation
 * and no trailing newline. It MUST NOT be reworded, reformatted, localized or wrapped
 * in a JSON envelope: a client that receives `{"message":"Hello world",...}` has
 * received a document describing the greeting rather than the greeting itself. (The
 * sibling Flask service in this repository does exactly that at the same path; this
 * module deliberately does not imitate it.)
 *
 * The literal is held in one module-level constant and exported so that the route
 * below and any consumer needing the greeting read this single canonical value rather
 * than keeping a copy of their own.
 *
 * @constant {string}
 */
const GREETING = 'Hello world';

/**
 * The one and only path this service serves successfully.
 *
 * Educational Note: Declared once and reused by both registrations below, so the
 * successful route and its method guard can never drift apart.
 *
 * @constant {string}
 */
const HELLO_PATH = '/hello';

/**
 * The value advertised in the `Allow` header of a 405 response.
 *
 * Educational Note: HTTP requires a 405 to name the methods the target resource does
 * support, and this value names both of them. `HEAD` appears alongside `GET` because
 * Express services HEAD requests through the registered GET handler (see below), so
 * the path genuinely accepts both — even though the guard that sends this header is
 * only ever reached by the *other* methods.
 *
 * @constant {string}
 */
const ALLOWED_METHODS = 'GET, HEAD';

/**
 * Creates and configures the Express application that serves `GET /hello`.
 *
 * Educational Focus: Shows the whole surface of a single-endpoint service in one
 * readable factory — two application settings followed by three registrations, in an
 * order that decides what a client gets back. The returned application is inert until
 * something binds it, which is precisely what makes it testable.
 *
 * Key Learning Concepts:
 * - Application settings (app.set / app.disable) configure the router and the
 *   response, and must be applied before requests are served.
 * - A successful route, a method guard on the same path, and a terminal catch-all
 *   together define a closed contract: every request receives a definite answer.
 * - Response helpers chain: res.status().type().send() and res.status().set().json().
 *
 * Educational Note: This module holds no conditional at all, by design — the factory
 * body is a straight run of settings then registrations, and each handler below runs
 * top to bottom for the request it answers, so no line here is ever taken instead of
 * another. Coverage consequently measures 0 of 0 branches for app.js and prints that
 * as 100% in the branch column: a vacuous figure rather than a demonstrated one, which
 * is the expected reading and not a gap to close. A conditional must never be
 * introduced here to make that number look earned; jest.config.js records where this
 * project's branch floor is enforced against real branches.
 *
 * @returns {express.Application} Configured Express application instance, with all
 *   routes registered and no socket bound.
 * @example
 * const app = createApp();
 * // Exercised in-process by the tests: supertest binds an ephemeral loopback
 * // listener for each request and closes it afterwards, so no pre-running server and
 * // no reserved port are needed:
 * //   await request(app).get('/hello').expect(200);
 * // Bound to the configured, long-lived socket only by server.js:
 * //   app.listen(3002, 'localhost', () => console.log('listening'));
 */
function createApp() {
  const app = express();

  // Educational Note: Express matches route paths CASE-INSENSITIVELY unless this
  // setting is enabled — that is the framework default, not an accident of this code.
  // Measured on Express 5.1.0: with the setting left alone, GET /HELLO, /Hello and
  // /hELLo each returned 200 and the greeting, which would make the single documented
  // endpoint reachable at an unbounded number of paths. With it enabled, those same
  // three requests fall through to the terminal 404 below.
  app.set('case sensitive routing', true);

  // Educational Note: `strict routing` is deliberately left DISABLED (its default), so
  // the one registration below serves both /hello and /hello/ — measured: identical
  // status, body and media type. The asymmetry with case sensitivity is intentional: a
  // trailing slash is a typing convention for the same resource, whereas a different
  // casing is a different path.

  // Security Enhancement: Remove Express's `X-Powered-By` response header so the
  // service does not advertise its framework to every client.
  // Educational Note: Framework fingerprinting tells an attacker which CVEs to try.
  // This is the only piece of production hygiene a tutorial this small needs.
  app.disable('x-powered-by');

  // Registration 1 of 3 — the only endpoint that answers successfully.
  // Express services `HEAD /hello` through this same handler (returning these headers
  // with no body), because HTTP requires HEAD to be identical to GET minus the body.
  // That is why HEAD is never rejected by the guard below.
  app.get(HELLO_PATH, (req, res) => {
    // Educational Note: `.type('text/plain')` is required, not cosmetic. Express infers
    // `text/html` for a string handed to res.send(), so without this call the client
    // would be told to render the greeting as markup. The explicit call produces
    // `Content-Type: text/plain; charset=utf-8`, and Express derives
    // `Content-Length: 11` from the eleven-byte body.
    res.status(200).type('text/plain').send(GREETING);
  });

  // Registration 2 of 3 — the method guard for the same path.
  // Educational Note: Its position is load-bearing. It must come AFTER the app.get
  // above (otherwise it would swallow the successful GET) and BEFORE the terminal
  // handler below. Measured: a bare app.get followed only by a catch-all answers
  // POST /hello with 404, because no registration claimed the path for that method —
  // the 405 exists only because this handler does.
  app.all(HELLO_PATH, (req, res) => {
    res
      .status(405)
      .set('Allow', ALLOWED_METHODS)
      .json({
        status: 405,
        message: 'Method Not Allowed',
        path: HELLO_PATH,
        method: req.method,
        timestamp: new Date().toISOString()
      });
  });

  // Registration 3 of 3 — the terminal unmatched-path handler.
  // Educational Note: Registered with app.use() and no path, it matches everything
  // that reached this point, which is every request the two registrations above did
  // not answer: `/`, `/health`, `/HELLO` and anything else. Its position last is what
  // makes it terminal; registered earlier it would shadow the greeting.
  // The error bodies are JSON while the success body is plain text, and that contrast
  // is deliberate: the greeting is a literal string because a literal string is what
  // was asked for, whereas an error is a structured report best read by a machine.
  app.use((req, res) => {
    res.status(404).json({
      status: 404,
      message: 'Not Found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

// Educational Note: CommonJS exports (this project declares "type": "commonjs").
// The shape is contract: server.js requires createApp to bind it, and the test suites
// require both names — createApp to drive the routes, GREETING to assert the literal.
module.exports = { createApp, GREETING };
