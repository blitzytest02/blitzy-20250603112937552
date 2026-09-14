/**
 * Integration suite for the delivered HTTP contract of this project's one endpoint,
 * `GET /hello`, together with the boundary that makes "exactly one endpoint" a claim
 * anyone can verify rather than a claim anyone has to trust.
 *
 * Educational Focus: Demonstrates in-process HTTP testing. Every test here drives a
 * real Express application over a real socket, yet the suite needs no server to be
 * running and binds no configured port. That works because the module this suite
 * imports is the application module, never the listener module: it hands back a
 * factory rather than a bound server, so `request(createApp())` lets supertest bind
 * the application to an ephemeral loopback port (port 0, assigned by the operating
 * system) for the duration of a single request and close it again once the response
 * completes. This suite therefore cannot collide with a developer who already has
 * `npm start` running, and it never has to be told which port that developer chose.
 * That is precisely the property the `app.js` / `server.js` split exists to enable — a
 * module that both registered routes and bound a port could not be imported by a test
 * without binding one — and it is why the listener is deliberately never imported
 * here, even though this suite exercises the routes it would serve.
 *
 * The second theme is assertion strength. No automated CI job runs this suite, so
 * this file *is* the gate on the contract, which raises the bar rather than lowering
 * it: every value below is compared with a literal, because a permissive pattern such
 * as `/Hello/` would happily accept `Hello, world!` and report success while the
 * contract was broken.
 *
 * Key Learning Concepts:
 * - In-process HTTP testing with supertest: an application factory, no fixed port, no
 *   teardown to write, no pre-running server.
 * - Asserting a byte-exact response body: the greeting is eleven characters, so its
 *   length and its `Content-Length` header are asserted alongside its text.
 * - Why literal assertions beat permissive patterns, and why a regular expression may
 *   only ever supplement a literal comparison, never replace one.
 * - How a route's *boundary* — 404 for unknown paths, 405 for unsupported methods,
 *   404 for the wrong path casing, 200 for HEAD — is what turns "exactly one
 *   endpoint" into something a test can prove.
 * - Testing without mocks: a real `createApp()` instance and real requests, because a
 *   stateless service with no external dependencies has nothing worth faking.
 */

const request = require('supertest');
const { createApp } = require('../../app');

describe('Hello Endpoint Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Educational setup: build one fresh application instance for the whole suite.
    // The factory keeps this cheap and isolated — no socket is bound here, and no
    // state is shared with any other suite.
    app = createApp();
  });

  describe('GET /hello', () => {
    // The contract itself, asserted in one place: status, media type, the exact body,
    // its length, the derived Content-Length header, and the absence of the framework
    // banner that `app.disable('x-powered-by')` suppresses. The regular expression on
    // Content-Type is inherited from the repository's model test and is only a coarse
    // pre-check; the literal comparison below it is what actually pins the media type.
    it('returns 200 with the exact plain-text greeting and its content headers', async () => {
      const response = await request(app)
        .get('/hello')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');

      // The greeting is the response body, not a document describing it: capital H,
      // lowercase w, one space, eleven characters, no punctuation, no trailing
      // newline. `toBe` compares the whole string, so any extra byte fails here.
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

    // This is the test that proves `app.set('case sensitive routing', true)` is in
    // place. Express routing is case-INSENSITIVE by default — that is the framework's
    // behaviour, not a bug in this project — so without that setting all three paths
    // below return 200 and the greeting, and the one documented endpoint becomes
    // reachable at an unbounded number of paths. With it enabled they fall through to
    // the terminal handler and are answered 404, like any other unknown path.
    it('returns 404 for every casing variant of the path', async () => {
      for (const path of ['/HELLO', '/Hello', '/hELLo']) {
        const response = await request(app).get(path);

        expect(response.status).toBe(404);
        expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(response.body).toMatchObject({
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
    // Every path that is not `/hello` gets one definite answer from the terminal
    // handler. The two paths looped at the end are load-bearing rather than filler:
    // the sibling Flask service in this repository does serve `/health`, and the
    // predecessor specification promised a browser visiting `/` would see the
    // greeting. Asserting 404 for both is how "exactly one endpoint" is demonstrated
    // instead of assumed. Note also that the error body is JSON while the success
    // body is plain text — an error is a structured report, whereas the greeting is a
    // literal string because a literal string is what was asked for.
    it('returns the JSON 404 envelope for every unmatched path', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404)
        .expect('Content-Type', /application\/json/);

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');

      expect(response.body).toMatchObject({
        status: 404,
        message: 'Not Found',
        path: '/nonexistent',
        method: 'GET'
      });

      // The timestamp is generated per response, so its value cannot be asserted —
      // but its presence and its format can be.
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);

      // Exactly five keys. The envelope is deliberately close to, but not the same as,
      // the sibling Flask service's six-key shape: Flask adds an `error` key and puts
      // a whole sentence in `message`, whereas here `message` carries the short reason
      // and there is no `error` key at all.
      expect(response.body).not.toHaveProperty('error');
      expect(Object.keys(response.body).sort()).toEqual([
        'message',
        'method',
        'path',
        'status',
        'timestamp'
      ]);

      for (const path of ['/', '/health']) {
        const unmatched = await request(app).get(path);

        expect(unmatched.status).toBe(404);
        expect(unmatched.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(unmatched.body).toMatchObject({
          status: 404,
          message: 'Not Found',
          path,
          method: 'GET'
        });
        expect(unmatched.body).toHaveProperty('timestamp');
        expect(unmatched.body).not.toHaveProperty('error');
      }
    });

    // 405 rather than 404 is what distinguishes "this path exists, that method does
    // not" from "there is no such path", and it exists only because `app.js`
    // registers a method guard on `/hello` *after* the GET handler and *before* the
    // terminal handler. Remove the guard and these five methods would be answered 404
    // by the catch-all, because no registration would have claimed the path for them.
    // The Allow header names every method the path really does accept — GET, and HEAD
    // through the same registration — even though this guard is never reached by
    // either of them.
    it('returns 405 with an Allow header for every non-GET method on /hello', async () => {
      for (const method of ['post', 'put', 'patch', 'delete', 'options']) {
        const response = await request(app)[method]('/hello');

        expect(response.status).toBe(405);
        expect(response.headers.allow).toBe('GET, HEAD');
        expect(response.headers['content-type']).toBe('application/json; charset=utf-8');

        expect(response.body).toMatchObject({
          status: 405,
          message: 'Method Not Allowed',
          path: '/hello',
          method: method.toUpperCase()
        });
        expect(response.body).toHaveProperty('timestamp');
        expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);

        // Five keys again. Flask reports its permitted methods inside the body as an
        // `allowed_methods` field and sets no Allow header of its own; this service
        // does the opposite, because HTTP asks for the header.
        expect(response.body).not.toHaveProperty('allowed_methods');
        expect(response.body).not.toHaveProperty('error');
        expect(Object.keys(response.body).sort()).toEqual([
          'message',
          'method',
          'path',
          'status',
          'timestamp'
        ]);
      }
    });
  });
});
