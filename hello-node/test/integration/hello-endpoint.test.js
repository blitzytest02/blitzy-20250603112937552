/**
 * Integration suite for the delivered HTTP contract of this project's one endpoint,
 * `GET /hello`, and for the boundary that makes "exactly one endpoint" verifiable:
 * 404 for unknown paths and wrong casing, 405 for disallowed methods, 200 for HEAD.
 *
 * Educational Focus: In-process HTTP testing. This suite imports the application
 * module and never the listener, so `request(createApp())` lets supertest bind the
 * application to an ephemeral loopback port for the duration of one request and close
 * it again afterwards. No server has to be running, no fixed or configured port is
 * reserved, and nothing here collides with a developer's own `npm start` — which is
 * the property the `app.js` / `server.js` split exists to enable.
 *
 * Key Learning Concepts:
 * - Driving a real Express application through supertest from an application factory:
 *   no pre-running server, no port to reserve, no teardown to write.
 * - Asserting a body byte-exactly — its text, its length and its `Content-Length`.
 * - Comparing every contract value with a literal: the pattern `/Hello/` would accept
 *   `Hello, world!` and report success while the contract was broken.
 * - Why a route's boundary, not its happy path, is what proves one endpoint is served.
 */

const request = require('supertest');
const { createApp } = require('../../app');

/**
 * Asserts one JSON error response — a 404 or a 405 — against the whole five-field
 * envelope contract, and re-labels any failure with the request case that produced it.
 *
 * Educational Note: one function rather than inline assertions, for drift and for
 * identity. Eleven requests across three tests assert this envelope, and eleven copies
 * can diverge until the weakest one is the contract. Three of those tests loop their
 * cases inside one `it()`, so a bare failure names the shared test rather than the
 * case; re-throwing with the case's own label (`GET /health`, `POST /hello`) restores
 * that, whereas `it.each` would restore it by reporting each case as its own test,
 * changing this suite's documented test count.
 *
 * Educational Note: the three timestamp assertions are ordered deliberately.
 * `Date.parse` alone is not a format check — measured on this project's Node v22.23.2
 * it returns a number for `'0'` and for `1` — so the round-trip
 * `new Date(timestamp).toISOString() === timestamp` is what pins the ISO-8601 spelling.
 * The type and parse checks precede it because the round-trip throws
 * `RangeError: Invalid time value` on a missing or nonsense value, and a thrown
 * conversion error is harder to read than a failed assertion.
 *
 * @param {object} response - A completed supertest response, read for its `status`,
 *   `headers` and parsed JSON `body`.
 * @param {object} expected - The contract values this case must have been answered with.
 * @param {number} expected.status - Expected HTTP status and `status` field: 404 or 405.
 * @param {string} expected.message - Expected `message`: 'Not Found' or 'Method Not Allowed'.
 * @param {string} expected.path - Expected `path` field; also the failure label's path.
 * @param {string} expected.method - Expected `method`, uppercase; also the label's method.
 * @param {string} [expected.allow] - Expected `Allow` header, asserted only when supplied:
 *   the 405 sites pass 'GET, HEAD', the 404 sites pass nothing because the contract
 *   makes no claim about `Allow` on an unmatched path.
 */
function expectErrorEnvelope(response, expected) {
  try {
    // Every error response is JSON, and the literal comparison — not a permissive
    // pattern — is what pins the media type, charset included.
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.status).toBe(expected.status);

    expect(response.body).toMatchObject({
      status: expected.status,
      message: expected.message,
      path: expected.path,
      method: expected.method
    });

    // Exactly five keys, on every error response without exception: comparing a sorted
    // key array is what makes an unexpected sixth field a failure rather than a silent
    // addition.
    expect(Object.keys(response.body).sort()).toEqual([
      'message',
      'method',
      'path',
      'status',
      'timestamp'
    ]);

    // Detects nothing the key set would miss; kept because it names the two fields the
    // sibling Flask envelope carries and this one must never grow — `error`, and the
    // `allowed_methods` Flask reports in the body where this service sets a header.
    expect(response.body).not.toHaveProperty('error');
    expect(response.body).not.toHaveProperty('allowed_methods');

    // The timestamp is generated per response, so its value cannot be asserted — but
    // its type, its parseability and its exact ISO-8601 spelling can be, in that order.
    const { timestamp } = response.body;

    expect(typeof timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
    expect(new Date(timestamp).toISOString()).toBe(timestamp);

    // Asserted only at the 405 sites, which are the only ones the contract gives an
    // Allow header: on an unmatched path it claims nothing, so nothing is invented.
    if (expected.allow !== undefined) {
      expect(response.headers.allow).toBe(expected.allow);
    }
  } catch (error) {
    // Re-thrown, not swallowed: the label identifies the loop iteration that failed,
    // and the original message and `cause` preserve everything Jest reported about it.
    const detail = error instanceof Error ? error.message : String(error);

    throw new Error(`${expected.method} ${expected.path}\n${detail}`, { cause: error });
  }
}

describe('Hello Endpoint Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /hello', () => {
    // The chained Content-Type regex is a coarse pre-check kept from the repository's
    // model test; the literal comparison below it is what pins the media type.
    it('returns 200 with the exact plain-text greeting and its content headers', async () => {
      const response = await request(app)
        .get('/hello')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');

      // The greeting is the body itself: `toBe` fails on any extra byte or newline.
      expect(response.text).toBe('Hello world');
      expect(response.text).toHaveLength(11);

      // Header values arrive as strings, so this is the string '11', not the number.
      expect(response.headers).toHaveProperty('content-length', '11');

      expect(response.headers).not.toHaveProperty('x-powered-by');
    });

    // A trailing slash is forgiven, and no second route was declared to forgive it:
    // Express leaves `strict routing` disabled by default, so the single
    // `app.get('/hello', ...)` registration answers `/hello/` as well. Contrast this
    // with the casing test below — a trailing slash is a typing convention for the
    // same resource, whereas a different casing is a different path.
    it('serves the trailing-slash variant /hello/ identically', async () => {
      const response = await request(app)
        .get('/hello/')
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toBe('Hello world');
      expect(response.text).toHaveLength(11);
      expect(response.headers).toHaveProperty('content-length', '11');
    });

    // Express routing is case-INSENSITIVE by default, so without
    // `app.set('case sensitive routing', true)` all three paths below would return 200
    // and the greeting. This test is what proves that setting is in place.
    it('returns 404 for every casing variant of the path', async () => {
      for (const path of ['/HELLO', '/Hello', '/hELLo']) {
        const response = await request(app).get(path);

        expectErrorEnvelope(response, {
          status: 404,
          message: 'Not Found',
          path,
          method: 'GET'
        });
      }
    });
  });

  describe('HEAD /hello', () => {
    // HEAD is served, not rejected, and nothing in `app.js` registers it: Express
    // services a HEAD request through the registered GET handler, returning that
    // handler's headers with the body suppressed. HTTP requires HEAD to be identical
    // to GET minus the body, so a service that answered GET but refused HEAD on the
    // same path would be non-conformant — which is also why the Allow header in the
    // next-but-one test advertises both methods.
    it('returns 200 with both content headers and an empty body', async () => {
      const response = await request(app)
        .head('/hello')
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');

      // Content-Length still reports the eleven bytes a GET would have returned, which
      // is the point of HEAD: a client learns the size without transferring the body.
      expect(response.headers).toHaveProperty('content-length', '11');

      // Superagent leaves `text` undefined when there is no body to parse, so the
      // value is coerced before the zero-length check to keep the assertion about the
      // body's emptiness rather than about which falsy value represents it.
      expect(response.text ?? '').toHaveLength(0);
    });
  });

  describe('Error Handling and Method Boundary', () => {
    // Every unmatched path reaches the terminal handler — `/`, `/health` and every
    // casing variant of `/hello` among them. `/hello/` is a distinct path string but is
    // not unmatched: the same GET registration serves it. The two looped paths are
    // load-bearing rather than filler, because the sibling Flask service does serve
    // `/health` and the predecessor specification promised a browser visiting `/` would
    // see the greeting.
    it('returns the JSON 404 envelope for every unmatched path', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404)
        .expect('Content-Type', /application\/json/);

      expectErrorEnvelope(response, {
        status: 404,
        message: 'Not Found',
        path: '/nonexistent',
        method: 'GET'
      });

      for (const path of ['/', '/health']) {
        const unmatched = await request(app).get(path);

        expectErrorEnvelope(unmatched, {
          status: 404,
          message: 'Not Found',
          path,
          method: 'GET'
        });
      }
    });

    // 405 distinguishes "this path exists, that method does not" from "there is no such
    // path", and it exists only because `app.js` registers a method guard on `/hello`
    // *after* the GET handler and *before* the terminal handler; without the guard the
    // catch-all would answer these five methods 404. The Allow header names every
    // method the path accepts — GET, and HEAD through that same GET registration —
    // even though this guard is reached by neither.
    it('returns 405 with an Allow header for every disallowed method on /hello', async () => {
      for (const method of ['post', 'put', 'patch', 'delete', 'options']) {
        const response = await request(app)[method]('/hello');

        expectErrorEnvelope(response, {
          status: 405,
          message: 'Method Not Allowed',
          path: '/hello',
          method: method.toUpperCase(),
          allow: 'GET, HEAD'
        });
      }
    });
  });
});
