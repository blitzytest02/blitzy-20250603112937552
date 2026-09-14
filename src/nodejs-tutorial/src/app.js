/**
 * Application-assembly module of the Node.js tutorial service.
 *
 * This module owns one job: wiring an Express application together. It binds no
 * socket and starts nothing — src/server.js does that — so requiring this file
 * has no side effects at all. The endpoint contract it serves is documented in
 * ../docs/api-reference.md, which is its single authority.
 */

const express = require('express');

// Only the router is needed here. The response body is defined once, in the
// route module itself, so this file never restates it.
const { router } = require('./routes/hello');

// Body of the terminal not-found response, named once so the handler below
// reads as a single statement of intent.
const NOT_FOUND_BODY = 'Not Found';

/**
 * Build a fresh Express application.
 *
 * This is a factory, not a shared singleton: every call assembles and returns a
 * new application. That is what lets each test construct its own application
 * and drive it through supertest without binding a port — and why src/server.js
 * is absent from the coverage table while this module reports 100%.
 *
 * @returns {import('express').Express} A newly assembled Express application,
 *   ready to be handed to `listen()` or to an HTTP assertion library.
 */
function createApp() {
  const app = express();

  // Framework fingerprinting prevention: Express advertises itself with an
  // X-Powered-By header by default. Disabling it here, immediately after
  // creation, keeps the header off every response on every path and method.
  app.disable('x-powered-by');

  // Mounted at the application root, because the route module declares the
  // full path itself. Mounting it under a prefix would nest that path twice.
  app.use(router);

  // Registered last, after the route mount, because Express runs middleware in
  // registration order: a request only reaches this handler when no route above
  // it matched. Note what is deliberately missing — no 405 and no Allow header.
  // Express 5 falls through to here for an unsupported method on a matched
  // path, so an unknown path and a non-GET request to the known path receive
  // byte-identical responses. A production API would answer 405 instead; the
  // tutorial documents the real behaviour rather than dressing it up.
  app.use((req, res) => {
    // The short form 'text/plain' is what makes Express emit the full
    // Content-Type: text/plain; charset=utf-8 header, and sending a string is
    // what makes it compute Content-Length and the default weak ETag.
    res.status(404).type('text/plain').send(NOT_FOUND_BODY);
  });

  return app;
}

module.exports = { createApp };
