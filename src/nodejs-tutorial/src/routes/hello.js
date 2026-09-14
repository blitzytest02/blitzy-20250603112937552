'use strict';

/**
 * Route handler for GET /hello, the tutorial's single endpoint.
 *
 * Registration lives in src/app.js, so this module owns only the reply and
 * needs no imports: a handler touches just the objects Express hands it.
 */

// The response payload, declared once so that the handler and the tutorial
// quote the same eleven bytes: capital H, lower-case w, one space, no
// punctuation and no trailing newline. The integration test asserts the
// literal rather than this constant, so editing it fails the suite visibly
// instead of drifting away from the documentation.
const HELLO_BODY = 'Hello world';

/**
 * Sends the plain-text body 'Hello world' with status 200.
 *
 * Express supplies both headers: .type('text/plain') resolves to
 * 'text/plain; charset=utf-8' and .send() derives Content-Length from the
 * body. HEAD /hello runs this same handler, so it needs no route of its own.
 *
 * @param {express.Request} req Incoming request; unused, the reply is fixed.
 * @param {express.Response} res Response used to send the payload.
 * @returns {void}
 */
function helloRoute(req, res) {
  res.status(200).type('text/plain').send(HELLO_BODY);
}

module.exports = { helloRoute, HELLO_BODY };
