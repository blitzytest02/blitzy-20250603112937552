/**
 * Unit test suite for the Express application module: it asserts the surface that
 * `app.js` exports — the createApp() factory, the GREETING constant and the
 * framework settings the factory applies — without issuing a single HTTP request.
 *
 * Educational Focus: Demonstrates the payoff of separating application *assembly*
 * from the HTTP *server*. Because `app.js` builds a fully configured Express
 * application but never calls listen(), its exports can be imported and asserted
 * directly: there is no server to start, no port to reserve, no socket to close and
 * nothing to tear down between tests. Every assertion below is a synchronous
 * statement about a value in memory, which is what makes this suite fast, isolated
 * and immune to a port already being in use.
 *
 * Key Learning Concepts:
 * - The application factory pattern: createApp() is a named function that returns a
 *   brand-new instance on every call, so each test (and each suite) works with an
 *   isolated application instead of shared module-level state.
 * - Asserting an exported constant BYTE-EXACTLY rather than by pattern. The greeting
 *   is compared with toBe() against the literal, and its character count and UTF-8
 *   byte count are asserted separately, because a permissive pattern would happily
 *   accept text the contract forbids.
 * - Inspecting framework configuration through the application object itself
 *   (app.disabled()) instead of inferring it from a response header — the setting is
 *   the cause, the header is only the effect.
 * - The division of labour between test layers: this unit suite covers the module's
 *   exported shape and configuration, while the integration suite drives the same
 *   application over HTTP to cover status codes, media types, bodies and headers.
 *   Each fact is asserted in exactly one place, so a change breaks one test, not ten.
 *
 * @module test/unit/app.test
 */

// The one and only import this suite needs. From `hello-node/test/unit/`, two levels
// up is the project root, so '../../app' resolves to `hello-node/app.js`.
// Educational Note: `require`, not `import` — package.json declares
// "type": "commonjs", which is the module system this whole project uses. Destructuring
// the exports here is also why the greeting literal is never duplicated in a test:
// GREETING comes from the module under test, and the assertions pin it to the
// contract's literal value.
const { createApp, GREETING } = require('../../app');

describe('Express Application Module (app.js)', () => {
  // Educational Note: There is deliberately no beforeEach/afterEach in this file.
  // createApp() allocates nothing that has to be released — no listening socket, no
  // timer, no file handle, no database connection — so there is no state to reset
  // between tests and no handle that could keep the Jest worker alive. Each test
  // simply calls the factory for itself. (The suite that DOES need setup and
  // teardown is server.test.js, because binding a socket is exactly the kind of
  // resource that must be closed again.)

  describe('createApp()', () => {
    it('should return a distinct, fully configured Express application when called', () => {
      const app = createApp();

      // Educational Note: An Express application IS a function — specifically a
      // request handler with the signature (req, res, next). That is what lets it be
      // handed straight to http.createServer(), mounted inside another Express app
      // with app.use(), or driven in-process by supertest. Asserting the type is
      // therefore not a trivia check: it is the property the rest of the project
      // relies on.
      expect(typeof app).toBe('function');

      // The application object also carries the API this project's assembly code
      // uses: reading/registering with .get(), mounting middleware with .use(),
      // configuring the router with .set(), and binding a socket with .listen() —
      // the last of which only server.js ever calls.
      expect(typeof app.get).toBe('function');
      expect(typeof app.use).toBe('function');
      expect(typeof app.set).toBe('function');
      expect(typeof app.listen).toBe('function');

      // Educational Note: A factory must hand back a NEW instance per call, not a
      // shared singleton. This is the property that keeps suites independent: the
      // integration suite's application and this one cannot influence each other,
      // because they are different objects. `not.toBe` compares identity (===),
      // which is precisely the question being asked here.
      expect(createApp()).not.toBe(createApp());
    });
  });

  describe('GREETING', () => {
    it('should be the exact eleven-byte greeting literal when imported', () => {
      // The contract fixes this string exactly: capital H, lowercase w, one space, no
      // punctuation and no trailing newline. It must not be reworded, reformatted,
      // localized or wrapped in an envelope.
      // Educational Note: This comparison is intentionally the strictest one
      // available. A substring or regular-expression check would also pass for
      // 'Hello, world!' or 'Hello worlds', silently admitting text the contract
      // forbids — so exact equality is a requirement here, not a style preference.
      expect(GREETING).toBe('Hello world');

      // The character count, as JavaScript sees the string.
      expect(GREETING).toHaveLength(11);

      // Educational Note: The UTF-8 BYTE count is a separate fact from the character
      // count, and asserting both is the point. In UTF-8 a single character can
      // occupy up to four bytes, so a look-alike Unicode space, a non-breaking
      // space, or a curly punctuation mark would keep the length at 11 while pushing
      // the byte count higher. Because both numbers are 11, the constant provably
      // holds eleven plain ASCII characters — which is also why the endpoint can
      // advertise Content-Length: 11.
      expect(Buffer.byteLength(GREETING, 'utf8')).toBe(11);
    });
  });

  describe('x-powered-by setting', () => {
    it('should report the x-powered-by setting as disabled when the application is created', () => {
      const app = createApp();

      // Educational Note: app.disabled(name) is the read-side counterpart of
      // app.disable(name). It answers "is this setting falsy?" and is the most
      // direct way to prove the factory applied the setting, with no request
      // involved. Express would otherwise stamp `X-Powered-By: Express` onto every
      // response, advertising the framework — and its CVE list — to any client.
      expect(app.disabled('x-powered-by')).toBe(true);

      // Express API trap worth knowing: app.get is OVERLOADED. Called with a path
      // AND a handler — app.get('/path', handler) — it registers a GET route. Called
      // with a single string, as here, it reads an application SETTING and returns
      // its value. So this line is not a route registration and defines no endpoint;
      // it is the same question as above, asked through the settings getter, and it
      // returns the falsy value that app.disable() stored.
      expect(app.get('x-powered-by')).toBeFalsy();
    });
  });
});
