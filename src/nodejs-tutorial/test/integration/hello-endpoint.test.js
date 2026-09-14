'use strict';

/**
 * End-to-end contract tests for the tutorial's single endpoint, GET /hello.
 *
 * This suite proves the whole published contract: that GET /hello answers 200
 * with the eleven-byte plain-text body 'Hello world', that it sends the
 * documented headers and suppresses the one that names the framework, that
 * HEAD /hello answers with the same headers and no body, and that both error
 * paths - an unknown path and a method the route does not register - fall
 * through to the JSON 404 envelope.
 *
 * It drives the real Express application in process. createApp() returns an
 * application that has never opened a socket, and Supertest binds that
 * unbound request handler to an ephemeral port of its own for the duration of
 * each request, then closes it. No listener is started, no fixed port is
 * claimed, and nothing here can collide with a reader's own `npm start` or
 * with anything else already holding the project's default port.
 *
 * Five of the project's eight test cases live here; the other three cover the
 * configuration and the listener in test/unit/server.test.js.
 */

// Supertest is the only external module this file needs: it issues the HTTP
// requests and exposes the response for assertion.
const request = require('supertest');

// The application factory is the unit under test. Only createApp is required -
// deliberately not the body constant that src/routes/hello.js also exports,
// because the body below is asserted against a literal. Asserting the literal
// is what makes an edit to that constant fail this suite visibly, rather than
// letting the code drift quietly away from the documented response.
const { createApp } = require('../../src/app');

describe('Hello Endpoint Integration Tests', () => {
  let app;

  beforeAll(() => {
    // One application, shared by all five cases. The application holds no
    // per-request state, so there is nothing for one case to leak into
    // another, and building it once keeps the suite fast.
    app = createApp();
  });

  // No teardown is needed or wanted. Supertest closes the ephemeral server it
  // opened for each request, and an Express application owns no resource that
  // could be left open, so this suite installs no teardown hook.

  describe('GET /hello', () => {
    it('should respond with status 200 and the exact eleven-byte body "Hello world"', async () => {
      // Proves the payload itself: the status line and the body, byte for byte.
      const response = await request(app)
        .get('/hello')
        .expect(200);

      // Capital H, lower-case w, a single space, no punctuation and no
      // trailing newline. Express's own canonical example sends 'Hello World!'
      // with a capital W and an exclamation mark; this project's contract is
      // the form asserted here, and the two are not interchangeable.
      expect(response.text).toBe('Hello world');

      // The length check is what catches a stray newline or trailing space:
      // such a body would still read as 'Hello world' at a glance but would no
      // longer be the eleven bytes the tutorial documents.
      expect(response.text).toHaveLength(11);
    });

    it('should respond with text/plain, Content-Length 11 and no X-Powered-By header', async () => {
      // Proves the header contract that accompanies the same 200 response.
      const response = await request(app)
        .get('/hello')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      // Node lower-cases every header name it parses, so the keys on
      // response.headers are addressed in lower case. The value is compared
      // as the string '11' rather than the number 11, because HTTP header
      // values are always text - Content-Length is no exception.
      expect(response.headers).toHaveProperty('content-length', '11');

      // Express advertises itself in an X-Powered-By header by default. Its
      // absence here is the observable proof that app.disable('x-powered-by')
      // took effect - an "Express.js v5 security enhancement - prevents
      // framework fingerprinting".
      expect(response.headers).not.toHaveProperty('x-powered-by');
    });
  });

  describe('HEAD /hello', () => {
    it('should respond with status 200, the same headers as GET and an empty body', async () => {
      // Proves that HEAD is served correctly without a second route. Express
      // registers HEAD alongside every GET route, so this response comes from
      // the same handler: correct HTTP semantics arriving for free rather than
      // a route this project had to add.
      const response = await request(app)
        .head('/hello')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      // The headers describe the body that a GET would return, which is why
      // Content-Length is still 11 even though no bytes are sent.
      expect(response.headers).toHaveProperty('content-length', '11');

      // HTTP forbids a body on a HEAD response, and superagent leaves
      // response.text undefined rather than empty when there is nothing to
      // read - measured against this application on Node.js 22.16.0 and
      // Supertest 7.2.2. Coalescing to '' asserts "no body was sent" for
      // either representation, so the case cannot pass or fail on that
      // library detail.
      expect(response.text ?? '').toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should respond with the 404 JSON envelope for an unknown path', async () => {
      // Proves the terminal 404 handler in src/app.js: registered last, it
      // runs only when no route above it matched, and it replaces Express's
      // default HTML error page with this JSON envelope.
      const response = await request(app)
        .get('/nonexistent')
        .expect(404)
        .expect('Content-Type', /application\/json/);

      // toMatchObject checks the three fixed fields without demanding that
      // the body hold nothing else, and it is insensitive to key order.
      expect(response.body).toMatchObject({
        status: 404,
        message: 'Not Found',
        path: '/nonexistent'
      });

      // timestamp records the instant of this request, so it cannot be
      // compared against a fixed value - a toEqual over the whole body would
      // check a live ISO 8601 value against a literal and fail on the next
      // millisecond. The instant is not assertable, but the shape is: the four
      // checks below pin the canonical form without pinning the moment.
      // Asserting only that the key is present would stay green if the handler
      // were changed to emit undefined, null, Date.now() or a locale string,
      // which is exactly the malformed-timestamp regression these catch.
      const { timestamp } = response.body;

      // Checked as a string first, so a missing or numeric value fails here
      // with a readable type mismatch rather than inside a later matcher.
      expect(typeof timestamp).toBe('string');

      // The canonical UTC form that Date.prototype.toISOString produces:
      // four-digit year, month, day, the literal T, a time carried to
      // milliseconds, and a literal Z. Anchored at both ends, so no extra
      // character - an offset such as +02:00 in place of the Z, or a stray
      // space - can slip past the pattern.
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Shape alone still admits an impossible instant such as
      // '2026-13-45T99:99:99.999Z'. Date.parse returns NaN for those, and
      // rejecting them here reports the failure as a plain assertion instead
      // of letting the round-trip below throw a RangeError.
      expect(Number.isNaN(Date.parse(timestamp))).toBe(false);

      // The round trip, and the assertion that carries the contract:
      // re-serialising the parsed instant reproduces the value character for
      // character only when the handler emitted exactly what toISOString
      // produces - proof of the documented ISO 8601 form, and still no claim
      // about which millisecond it names.
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should respond with 404 rather than 405 for POST /hello', async () => {
      // Proves the method behaviour of the one registered path. Express 5 does
      // not synthesise a 405 Method Not Allowed when only GET is registered,
      // and this project adds no method gate to manufacture one, so a POST
      // falls through to the same terminal handler as an unknown path.
      const response = await request(app)
        .post('/hello')
        .expect(404);

      // The envelope reports the requested path, which is /hello here: the
      // path existed for GET, and the 404 describes the request that was
      // actually made rather than the route table.
      expect(response.body).toMatchObject({
        status: 404,
        message: 'Not Found',
        path: '/hello'
      });
    });
  });
});
