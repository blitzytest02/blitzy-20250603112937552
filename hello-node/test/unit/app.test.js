/**
 * Unit test suite for the Express application module: it asserts what `app.js`
 * exports — the createApp() factory, the GREETING constant and the framework
 * settings the factory applies.
 *
 * Educational Focus: Because `app.js` assembles the application but never calls
 * listen(), its exports are asserted directly — no server, no port, no socket and
 * nothing to tear down between tests.
 *
 * Key Learning Concepts:
 * - The application factory pattern: a fresh, isolated instance per call.
 * - Asserting an exported constant byte-exactly rather than by pattern.
 * - Reading framework configuration from the application object, not a response
 *   header.
 * - Layer division: shape and literals here, HTTP status, media type and body in
 *   the integration suite.
 *
 * @module test/unit/app.test
 */

const { createApp, GREETING } = require('../../app');

describe('Express Application Module (app.js)', () => {
  // Educational Note: createApp() opens no socket, timer or other handle, so this
  // file needs no beforeEach/afterEach and has nothing to release between tests.

  describe('createApp()', () => {
    it('should return a distinct, fully configured Express application when called', () => {
      const app = createApp();

      // Educational Note: An Express application IS a request-handler function with
      // the signature (req, res, next), which is what lets it be handed straight to
      // http.createServer() or driven in-process.
      expect(typeof app).toBe('function');

      expect(typeof app.get).toBe('function');
      expect(typeof app.use).toBe('function');
      expect(typeof app.set).toBe('function');
      expect(typeof app.listen).toBe('function');

      // Educational Note: A factory must return a new instance per call so suites
      // stay isolated; `not.toBe` compares identity (===).
      expect(createApp()).not.toBe(createApp());
    });
  });

  describe('GREETING', () => {
    it('should be the exact eleven-byte greeting literal when imported', () => {
      // Educational Note: Exact equality is a requirement, not a style preference: a
      // regular-expression or substring check would also pass for 'Hello, world!',
      // admitting text the contract forbids.
      expect(GREETING).toBe('Hello world');

      expect(GREETING).toHaveLength(11);

      // Educational Note: The UTF-8 byte count is a separate fact from the character
      // count: a multi-byte look-alike would keep the length at 11 while raising the
      // byte count, so both being 11 proves the eleven plain ASCII bytes the endpoint
      // advertises as Content-Length: 11.
      expect(Buffer.byteLength(GREETING, 'utf8')).toBe(11);
    });
  });

  describe('x-powered-by setting', () => {
    it('should report the x-powered-by setting as disabled when the application is created', () => {
      const app = createApp();

      // Educational Note: app.disabled(name) reports that the Boolean setting is
      // disabled — false, the state app.disable(name) puts it in — proving the
      // factory applied it with no request involved. Suppressing X-Powered-By keeps
      // the framework identifier out of every response, reducing fingerprinting.
      expect(app.disabled('x-powered-by')).toBe(true);

      // Express API trap: app.get is overloaded — a path plus a handler registers a
      // route, one string reads a setting, so this line defines no endpoint.
      expect(app.get('x-powered-by')).toBeFalsy();
    });
  });
});
