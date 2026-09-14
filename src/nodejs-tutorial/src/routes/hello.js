/**
 * Single route module of the Node.js tutorial service.
 *
 * Registers the one endpoint this tutorial serves, GET /hello, and holds the
 * single definition of its response body. src/app.js mounts this router at the
 * application root, so the path declared below is the path a client requests.
 * The endpoint contract itself is documented in docs/api-reference.md.
 */

const express = require('express');

// A router keeps route registration separate from application assembly, leaving
// src/app.js the single job of wiring the pieces together.
const router = express.Router();

// The single definition of the response body: 11 bytes, one interior space and
// no trailing newline. Every byte count and assertion in the tutorial resolves
// to this constant, so the string has exactly one source of truth.
const HELLO_BODY = 'Hello world';

/**
 * Hello world endpoint demonstrating Express.js v5 routing.
 * Educational focus: basic HTTP GET handling and response generation.
 *
 * @route GET /hello
 * @returns {string} Plain text "Hello world" response
 */
router.get('/hello', (req, res) => {
  // Passing the short form 'text/plain' lets Express expand it into the full
  // Content-Type: text/plain; charset=utf-8 response header, and Express
  // derives Content-Length from the body. Express also computes a default weak
  // ETag over the fixed body; that stays enabled deliberately, because a
  // repeat request carrying a matching If-None-Match then answers
  // 304 Not Modified, the conditional-request lesson documented in
  // docs/api-reference.md.
  res.status(200).type('text/plain').send(HELLO_BODY);
});

module.exports = { router, HELLO_BODY };
