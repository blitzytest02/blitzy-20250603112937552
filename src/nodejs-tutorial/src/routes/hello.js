/**
 * The tutorial's only route module: it registers GET /hello, the single
 * endpoint this service serves.
 */

const express = require('express');

const router = express.Router();

// The only definition of the response body in source: 11 bytes, one interior
// space, no trailing newline. test/hello.test.js asserts its own literal, not
// this constant, so a typo here fails the suite instead of matching itself.
const HELLO_BODY = 'Hello world';

/**
 * Hello world endpoint demonstrating Express.js v5 routing.
 * Educational focus: basic HTTP GET handling and response generation.
 *
 * @route GET /hello
 * @returns {void} Nothing; the handler sends the 200 plain-text response itself.
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
