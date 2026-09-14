'use strict';

/**
 * Unit tests for the two properties the integration suite cannot observe from
 * the outside: the application factory's own contract, and the configuration
 * and listener in src/server.js.
 *
 * The integration suite drives the application through Supertest, which
 * proves what a client receives but says nothing about how the process got
 * there. These three cases cover the rest: that createApp() hands back a
 * request handler and opens no socket, that resolveConfig resolves the
 * documented defaults and honours the PORT and HOST overrides, and that start
 * binds a real listener, prints the one line the tutorial documents, and
 * closes again.
 *
 * Three of the project's eight test cases live here; the other five prove the
 * GET /hello contract in test/integration/hello-endpoint.test.js. This file is
 * the only suite that requires src/server.js, so whatever of that module these
 * cases do not execute is not covered anywhere - which is why case 7 calls
 * resolveConfig with no argument as well as with an explicit environment, and
 * why case 8 really binds a listener.
 */

// The modules under test. server.js publishes both functions and both default
// constants, so the defaults below are asserted against the source of truth
// rather than against a second copy of the same numbers.
const {
  resolveConfig,
  start,
  DEFAULT_PORT,
  DEFAULT_HOST
} = require('../../src/server');
const { createApp } = require('../../src/app');

describe('Application Factory and Server Lifecycle Unit Tests', () => {
  it('should return a request handler from createApp() and bind no port', () => {
    // An Express application is itself the (req, res) function that Node's
    // http.Server calls, which is the single property the integration suite's
    // request(app) pattern depends on: Supertest accepts either a listening
    // http.Server or an unbound handler, and binds the latter to an ephemeral
    // port of its own.
    const app = createApp();

    expect(typeof app).toBe('function');

    // listen is the method the application would need for a socket of its
    // own. It exists - this is a real Express application - but the factory
    // never calls it, so nothing here is listening. The two properties an
    // http.Server would expose once it had bound a port are the observable
    // proof: address() reports the bound socket and listening reports the
    // state, and an application that never bound one has neither.
    expect(typeof app.listen).toBe('function');
    expect(app.address).toBeUndefined();
    expect(app.listening).toBeUndefined();
  });

  it('should resolve the documented defaults 3000 and localhost and honour the PORT and HOST overrides', () => {
    // An empty environment object is the state a reader's shell is in on a
    // clean clone - neither variable set - so both values fall back. Passing
    // the environment in rather than clearing the real one is what keeps this
    // assertion independent of whatever the surrounding shell exported.
    //
    // The defaults are asserted twice on purpose: once against the literals
    // the tutorial prints, so documentation drift fails here, and once against
    // the constants src/server.js publishes, so a changed constant fails here
    // too. Neither assertion alone catches both kinds of change.
    expect(resolveConfig({})).toEqual({ port: 3000, host: 'localhost' });
    expect(resolveConfig({})).toEqual({
      port: DEFAULT_PORT,
      host: DEFAULT_HOST
    });

    // The overrides. PORT arrives as a string from the environment in every
    // case - `PORT=3100 npm start` included - and Number.parseInt turns it
    // into the number asserted here; toEqual does not coerce, so a returned
    // string '3100' would fail. HOST needs no conversion and is passed
    // through, 0.0.0.0 being the value a reader reaches for when they want
    // the listener on every interface rather than on loopback alone.
    expect(resolveConfig({ PORT: '3100', HOST: '0.0.0.0' })).toEqual({
      port: 3100,
      host: '0.0.0.0'
    });

    // A PORT that is present but not a number falls back to the default:
    // Number.parseInt returns NaN, which is falsy, so the single || covers
    // the unparseable case and the absent one alike. HOST is absent from this
    // object, so it takes its own fallback at the same time.
    expect(resolveConfig({ PORT: 'not-a-number' })).toEqual({
      port: DEFAULT_PORT,
      host: DEFAULT_HOST
    });

    // Called with no argument at all, resolveConfig reads the real
    // process.env through its default parameter. That is the form `npm start`
    // uses and the only path that proves the process environment is where the
    // values come from, so it is exercised here rather than left to the
    // bootstrap: without it the default parameter is an unexecuted branch and
    // jest.config.js's 95% branch gate fails the whole run while every test
    // still reports green.
    const saved = { PORT: process.env.PORT, HOST: process.env.HOST };

    try {
      process.env.PORT = '4200';
      process.env.HOST = '127.0.0.1';

      expect(resolveConfig()).toEqual({ port: 4200, host: '127.0.0.1' });
    } finally {
      // Restore exactly what was there, whatever the assertion did. Absence
      // has to be restored by deleting the key: assigning undefined would
      // leave the string 'undefined' behind, and a later resolveConfig()
      // would then resolve the host to 'undefined' rather than to localhost.
      for (const key of ['PORT', 'HOST']) {
        if (saved[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = saved[key];
        }
      }
    }
  });

  it('should bind a listening server on an ephemeral port, print the startup line once and close cleanly', async () => {
    // Port 0 asks the operating system for any free port, so this case claims
    // no fixed port and cannot collide with a reader's own `npm start` or
    // with anything else on the host.
    const config = { port: 0, host: DEFAULT_HOST };

    // The startup line is observable output, so it is captured rather than
    // printed: the spy replaces console.log for the duration of this case and
    // is restored below.
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const server = start(createApp(), config);

    try {
      // Wait for the bind to complete. app.listen is asynchronous, so the
      // 'listening' event - or the already-listening flag, if the bind won
      // the race - is what makes the assertions below deterministic.
      await new Promise((resolve) => {
        if (server.listening) {
          resolve();
        } else {
          server.once('listening', resolve);
        }
      });

      expect(server.listening).toBe(true);

      // A bound server reports the port the operating system actually gave
      // it, which is any port but zero.
      expect(server.address().port).toBeGreaterThan(0);

      // Exactly one line, and no banner, timestamp or request log around it.
      // The line interpolates the config start was handed, so the host is
      // matched against the published constant while the port is left
      // deliberately unmatched: pinning it would assert the ephemeral 0 this
      // case happens to pass in rather than the behaviour a reader sees,
      // which with the defaults reads `Server listening on:
      // http://localhost:3000`.
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining(`Server listening on: http://${DEFAULT_HOST}:`)
      );
    } finally {
      // Close the listener and restore console.log whatever the assertions
      // did, so a failure here cannot leak a socket into the next case or
      // silence the reporter's own output.
      await new Promise((resolve) => server.close(resolve));
      log.mockRestore();
    }

    expect(server.listening).toBe(false);
  });
});
