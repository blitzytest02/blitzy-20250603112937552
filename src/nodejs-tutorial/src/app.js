'use strict';

/**
 * Express application factory for the Node.js Hello World tutorial.
 *
 * This module owns the routing table and nothing else: it wires the single
 * GET /hello route to its handler, suppresses the header that identifies the
 * framework, and terminates every unmatched request with a JSON 404 envelope.
 * It deliberately never opens a socket and never reads the environment -
 * src/server.js resolves the configuration and binds the listener.
 */

// Express 5.1.0 supplies the routing table and the response helpers, and the
// route handler lives in its own module. Those are the only two requires this
// file needs: the project ships no middleware, utility or configuration
// module, so there is nothing else to pull in.
const express = require('express');
const { helloRoute } = require('./routes/hello');

/**
 * Creates and configures the Express application for this tutorial.
 *
 * The application is returned without a listening socket: binding a port is
 * server.js's job. That separation is what lets the integration suite drive
 * this application in process, on a port Supertest chooses, and it is why a
 * factory is exported rather than a ready-made application constant - every
 * caller, each test included, receives a fresh instance with no shared state.
 *
 * @returns {express.Application} the configured Express application
 */
function createApp() {
  const app = express();

  // Express advertises itself in an X-Powered-By response header by default.
  // Express.js v5 security enhancement - prevents framework fingerprinting.
  app.disable('x-powered-by');

  // The project's only route. Express registers HEAD /hello alongside GET, so
  // a HEAD request is answered from this same handler with identical headers
  // and an empty body, without a second registration. Registering with
  // app.get rather than app.use is what keeps every other method on this path
  // falling through to the 404 handler below.
  app.get('/hello', helloRoute);

  // Terminal 404 handler, registered last on purpose: Express runs middleware
  // in registration order, so this only runs when no route above matched. It
  // always responds and never calls next(), which is what replaces Express's
  // own HTML error page with the envelope the tutorial documents. The keys are
  // declared in the order the documented body shows them, because
  // JSON.stringify preserves insertion order.
  app.use((req, res) => {
    res.status(404).json({
      status: 404,
      message: 'Not Found',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

// CommonJS module boundary: createApp is the single published symbol, required
// by name from src/server.js and from both test suites.
module.exports = { createApp };
