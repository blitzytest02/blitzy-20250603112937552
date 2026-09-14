'use strict';

/**
 * Unit tests for the two properties the integration suite cannot observe from
 * the outside: the application factory's own contract, and the configuration
 * and listener in src/server.js.
 *
 * The integration suite drives the application through Supertest, which
 * proves what a client receives but says nothing about how the process got
 * there. These three cases cover the rest: that createApp() hands back a
 * request handler and never reaches the socket-bind boundary, that
 * resolveConfig resolves the documented defaults and honours the PORT and
 * HOST overrides, and that start binds a real listener, prints the one line
 * the tutorial documents when the bind succeeds, rethrows the error Express 5
 * hands the same callback when it fails, and closes again.
 *
 * Three of the project's eight test cases live here; the other five prove the
 * GET /hello contract in test/integration/hello-endpoint.test.js. This file is
 * the only suite that requires src/server.js, so whatever of that module these
 * cases do not execute is not covered anywhere - which is why case 7 calls
 * resolveConfig with no argument as well as with an explicit environment, and
 * why case 8 drives the listener callback down both of its paths.
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

// node:http is required for one reason: http.Server.prototype.listen is the
// method every route to a listening socket in Node ends at, and case 6 masks
// it to prove the application factory never gets there.
const http = require('node:http');

describe('Application Factory and Server Lifecycle Unit Tests', () => {
  it('should return a request handler from createApp() and bind no port', () => {
    // An Express application is itself the (req, res) function that Node's
    // http.Server calls, which is the single property the integration suite's
    // request(app) pattern depends on: Supertest accepts either a listening
    // http.Server or an unbound handler, and binds the latter to an ephemeral
    // port of its own.
    //
    // Proving that no port was bound takes the bind boundary itself, not
    // properties of the object handed back. app.listen() builds a *separate*
    // http.Server and returns that, so a factory that called it could leak a
    // listening socket while the application still looked untouched - which is
    // precisely what asserting app.address or app.listening would miss. Every
    // route to a socket ends at http.Server.prototype.listen, so that method
    // is masked for the duration of the call and then asked whether it ever
    // ran. Masking rather than passing through means such a regression cannot
    // open a port even while this case fails. The method is inherited from
    // net.Server.prototype rather than owned by http.Server.prototype, so
    // restoring it means deleting the property this case added - done in a
    // finally, so an exception from the factory cannot leave the mask behind.
    const listen = jest.fn();
    const descriptor = Object.getOwnPropertyDescriptor(
      http.Server.prototype,
      'listen'
    );

    http.Server.prototype.listen = listen;

    let app;

    try {
      app = createApp();
    } finally {
      if (descriptor === undefined) {
        delete http.Server.prototype.listen;
      } else {
        Object.defineProperty(http.Server.prototype, 'listen', descriptor);
      }
    }

    // Nothing reached the bind boundary: the factory opened no socket, took no
    // port, and left nothing to leak into the next case.
    expect(listen).not.toHaveBeenCalled();

    // The application contract itself: a callable request handler that still
    // carries the listen method src/server.js calls later.
    expect(typeof app).toBe('function');
    expect(typeof app.listen).toBe('function');
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
    // with anything else on the host. The host is the loopback literal
    // 127.0.0.1 rather than the DEFAULT_HOST the module publishes: a value
    // that differs from the default is what proves the configuration is
    // forwarded, instead of a hard-coded `localhost` being bound and printed.
    const config = { port: 0, host: '127.0.0.1' };
    const app = createApp();

    // app.listen is the call start makes to bind, and the bind outcome has to
    // be observed from inside that call rather than from a listener added
    // after it: Express registers the callback start passes as the server's
    // first 'error' listener before app.listen returns, and that callback
    // rethrows a bind error, so EventEmitter unwinds at the throw and an
    // 'error' listener attached afterwards never runs - leaving an await on it
    // pending until Jest's timeout instead of reporting the failure. The spy
    // therefore stands in for app.listen: it records the arguments start
    // forwarded and delegates to the real implementation through a wrapper
    // that settles the promise below either way - resolved once the production
    // callback has returned from a successful bind, rejected with whatever it
    // threw when the bind failed.
    let settleBind;
    const bound = new Promise((resolve, reject) => {
      settleBind = { resolve, reject };
    });
    const realListen = app.listen;
    const listen = jest
      .spyOn(app, 'listen')
      .mockImplementation((port, host, callback) =>
        realListen.call(app, port, host, (error) => {
          try {
            callback(error);
            settleBind.resolve();
          } catch (thrown) {
            settleBind.reject(thrown);
          }
        })
      );

    // The startup line is observable output, so it is captured rather than
    // printed. Both spies are installed before the call under test, and start
    // is invoked inside the try, so the finally restores them even if start
    // throws or the bind fails.
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    let server;

    try {
      server = start(app, config);

      // The configuration reached the bind call verbatim: both values, in the
      // documented order, with the listener callback last.
      expect(listen).toHaveBeenCalledTimes(1);
      expect(listen).toHaveBeenCalledWith(
        config.port,
        config.host,
        expect.any(Function)
      );

      // Nothing has been printed yet. app.listen binds asynchronously, so a
      // line written at this point would announce a server that has not bound
      // and might still fail to.
      expect(log).not.toHaveBeenCalled();

      // Wait for the bind. This promise resolves when the startup line has
      // been written and rejects with the bind error when the socket never
      // comes up, so an EADDRINUSE here fails the case with the diagnostic
      // instead of stalling it.
      await bound;

      expect(server.listening).toBe(true);

      // The socket honoured both values it was handed: the address is the
      // loopback host this case asked for, and the port is a real one the
      // operating system assigned in place of the 0 that requested it.
      const address = server.address();

      expect(address.address).toBe('127.0.0.1');
      expect(address.port).toBeGreaterThan(0);

      // Exactly one line, compared in full rather than by substring: a banner,
      // an added prefix or suffix, a timestamp, a different host or a mangled
      // port all fail here. The line names what the caller asked for - the
      // contract src/server.js documents - so with port 0 it names port 0.
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenNthCalledWith(
        1,
        'Server listening on: http://127.0.0.1:0'
      );

      // The line a reader actually compares against the tutorial is the one
      // the documented defaults produce. A stand-in application calls the
      // callback the way Express does on a successful bind, which pins that
      // string character for character without claiming port 3000 on the
      // machine running the suite, and hands back the listener that start must
      // return to its own caller.
      const listener = { listening: false };
      const succeeding = {
        listen: (port, host, callback) => {
          callback();
          return listener;
        }
      };

      expect(
        start(succeeding, { port: DEFAULT_PORT, host: DEFAULT_HOST })
      ).toBe(listener);
      expect(log).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenNthCalledWith(
        2,
        'Server listening on: http://localhost:3000'
      );

      // The same callback's failure path. Express 5 registers it with
      // server.once('error', done) as well as passing it to the socket, so a
      // bind that fails - EADDRINUSE on a port something else already holds,
      // in practice - calls it with an Error rather than empty-handed. The
      // error must come straight back out of start, unchanged and with its
      // code intact, and nothing may be logged: a success URL for a server
      // that never bound would hide the diagnostic Troubleshooting promises.
      const failure = Object.assign(
        new Error('listen EADDRINUSE: address already in use 127.0.0.1:3000'),
        { code: 'EADDRINUSE' }
      );
      const failing = {
        listen: (port, host, callback) => callback(failure)
      };
      let thrown;

      try {
        start(failing, { port: DEFAULT_PORT, host: DEFAULT_HOST });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBe(failure);
      expect(thrown.code).toBe('EADDRINUSE');
      expect(log).toHaveBeenCalledTimes(2);

      // Closing is the last part of the contract: the server start returns is
      // the handle that releases the port again.
      await new Promise((resolve) => server.close(resolve));

      expect(server.listening).toBe(false);
    } finally {
      // Whatever the assertions did, release the socket and restore both
      // spies: a listener left open would leak into the next case and hold the
      // runner open at exit, and an unrestored console.log would silence the
      // reporter's own output. The close is guarded only on the server having
      // been created, and its callback argument is discarded: closing a server
      // that is already closed, or one still completing its bind, reports
      // ERR_SERVER_NOT_RUNNING rather than failing, and releasing the handle
      // is the only thing that matters here.
      if (server !== undefined) {
        await new Promise((resolve) => server.close(() => resolve()));
      }

      log.mockRestore();
      listen.mockRestore();
    }
  });
});
