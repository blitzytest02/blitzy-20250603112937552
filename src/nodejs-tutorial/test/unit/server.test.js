'use strict';

/**
 * Unit tests for the two modules the integration suite cannot reach directly:
 * the application factory's own contract, and the configuration and listener
 * in src/server.js.
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
 * GET /hello contract in test/integration/hello-endpoint.test.js.
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

describe('Application factory and server lifecycle', () => {
  it('createApp() returns a request handler and binds no port', () => {
    // An Express application is itself the (req, res) function that Node's
    // http.Server calls, which is the single property the integration suite's
    // request(app) pattern depends on: Supertest accepts either a listening
    // http.Server or an unbound handler, and binds the latter to an ephemeral
    // port of its own.
    const app = createApp();

    expect(typeof app).toBe('function');

    // listen is the method the application would need for a socket of its
    // own. It exists - this is a real Express application - but the factory
    // never calls it, so nothing here is listening. address() is the
    // observable proof: an http.Server that has bound a port returns an
    // object from it, and an application that never bound one has no such
    // method at all.
    expect(typeof app.listen).toBe('function');
    expect(app.address).toBeUndefined();
  });

  it('resolveConfig yields the documented defaults and honours PORT and HOST', () => {
    // Called with no argument, resolveConfig reads the real process.env
    // through its default parameter - the form `npm start` uses. PORT and
    // HOST are removed first and restored afterwards so that the documented
    // defaults are asserted against a known-clean environment and this case
    // cannot pass or fail on a variable the surrounding shell happened to
    // export.
    const savedPort = process.env.PORT;
    const savedHost = process.env.HOST;
    delete process.env.PORT;
    delete process.env.HOST;

    try {
      expect(resolveConfig()).toEqual({ port: 3000, host: 'localhost' });

      // The same assertion against the published constants, so that changing
      // a default in src/server.js without changing the tutorial fails here.
      expect(resolveConfig()).toEqual({
        port: DEFAULT_PORT,
        host: DEFAULT_HOST
      });
    } finally {
      // Restore exactly what was there, including the absence of a variable:
      // assigning undefined would leave the string 'undefined' behind.
      if (savedPort === undefined) {
        delete process.env.PORT;
      } else {
        process.env.PORT = savedPort;
      }
      if (savedHost === undefined) {
        delete process.env.HOST;
      } else {
        process.env.HOST = savedHost;
      }
    }

    // Taking the environment as a parameter is what lets the overrides be
    // asserted without mutating the process this suite runs in. PORT arrives
    // as a string from the environment in every case - `PORT=3100 npm start`
    // included - and is parsed to a number.
    expect(resolveConfig({ PORT: '3100', HOST: '127.0.0.1' })).toEqual({
      port: 3100,
      host: '127.0.0.1'
    });

    // A PORT that is absent or not a number falls back to the default:
    // Number.parseInt returns NaN, which is falsy, so one || covers both. The
    // same fallback applies to an empty HOST.
    expect(resolveConfig({ PORT: 'not-a-port', HOST: '' })).toEqual({
      port: DEFAULT_PORT,
      host: DEFAULT_HOST
    });
  });

  it('start binds a listening server, prints the startup line and closes cleanly', async () => {
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

      // Exactly one line, interpolating the config start was handed rather
      // than the port that was really bound - which is why it names port 0
      // here. That is the documented behaviour: with the defaults the same
      // line reads `Server listening on: http://localhost:3000`.
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(
        `Server listening on: http://${DEFAULT_HOST}:0`
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
