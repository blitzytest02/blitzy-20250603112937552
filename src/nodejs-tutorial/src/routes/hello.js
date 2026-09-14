/**
 * Route handler for the tutorial's single endpoint, GET /hello.
 *
 * The smallest useful Express route: a synchronous function that receives
 * the request and response objects and sends a plain-text body. Exporting it
 * rather than registering it here keeps routing separate from response logic:
 * src/app.js owns the routing table, this module only the reply. The endpoint
 * is tested with no server of its own - createApp returns an application that
 * never calls listen, and Supertest binds it to an ephemeral port per request.
 *
 * The module deliberately requires nothing. A route handler only ever touches
 * the objects Express hands it, so it needs neither the framework itself nor
 * any configuration; src/server.js is the one module that reads the
 * environment.
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
 * Three chained calls do all the work. .status(200) sets the status code;
 * .type('text/plain') sets Content-Type, which Express normalises so a text
 * type carries charset=utf-8; .send() writes the body as UTF-8 and takes
 * Content-Length from its byte length. Neither header is written by hand here.
 * Express answers HEAD /hello from this same handler with identical headers
 * and an empty body, which is why no second route is registered for it.
 *
 * @param {express.Request} req Incoming request. Unused: this response never
 *   varies, but Express passes the request to every handler.
 * @param {express.Response} res Response used to send the payload.
 * @returns {void}
 */
function helloRoute(req, res) {
  res.status(200).type('text/plain').send(HELLO_BODY);
}

// CommonJS export boundary: these two names are what another module receives
// when it requires this file, so src/app.js can destructure the handler and
// the payload keeps a single published home rather than a copy wherever it is
// mentioned.
module.exports = { helloRoute, HELLO_BODY };
