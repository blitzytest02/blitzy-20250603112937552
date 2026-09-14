'use strict';

const { createApp } = require('./app');

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';
/** Resolves the listening configuration; the only reader of process.env here. */
function resolveConfig(env = process.env) {
  return {
    port: Number.parseInt(env.PORT, 10) || DEFAULT_PORT,
    host: env.HOST || DEFAULT_HOST
  };
}

// Entry module for the Node.js Hello World tutorial. It does three things and
// nothing else: resolve the listening configuration, bind the HTTP listener,
// and bootstrap itself when this file is the one Node was started with. The
// application itself - the routing table and the responses - lives in
// src/app.js, which never opens a socket; that split is what lets the
// integration suite drive the application in process on a port Supertest
// chooses, and it is the layout the project's module naming prescribes.
//
// The declarations above are kept inside thirteen lines deliberately. The
// environment template and the tutorial cite the default constants at lines
// 5-6 and the two process.env reads at lines 10-11, so a conventional
// multi-line header comment here would silently break those citations; the
// longer explanation belongs from this point down instead.
//
// resolveConfig holds both defaults in one place and is the only place in the
// runtime code that touches process.env. Number.parseInt yields NaN for
// an absent or non-numeric PORT and NaN is falsy, so one || fallback covers
// both cases; HOST is already a string and needs only an empty-value
// fallback. Taking the environment as a parameter - defaulting to the real
// process.env - is what lets the unit suite assert the documented defaults
// and the PORT/HOST overrides without mutating the process it runs in, while
// `PORT=3100 npm start` still works unchanged. A .env file, when a reader
// creates one, is read by the runtime through the --env-file-if-exists flag in
// package.json's start script, so no module here parses it and no dotenv
// dependency is declared.

/**
 * Starts the HTTP listener for the given application.
 *
 * Both arguments are required on purpose: as default parameters - start(app =
 * createApp(), config = resolveConfig()) - they would add branches that no
 * test executes, and jest.config.js gates branch coverage at 95%.
 *
 * Express 5 gives the callback both outcomes: app.listen registers it with
 * server.once('error', done) as well as handing it to the socket, so an Error
 * arrives as its first argument when the bind fails. Rethrowing it leaves the
 * diagnostic Troubleshooting documents - the stack, `code: 'EADDRINUSE'`, a
 * non-zero exit - rather than a success URL for a server that never bound.
 * A successful bind writes `Server listening on: http://localhost:3000` with
 * the defaults and nothing else: no banner, no timestamp, no request logging.
 * The line names the config handed in rather than server.address(), and the
 * http.Server is returned so that a caller can close it again.
 *
 * @param {import('express').Application} app - application from createApp()
 * @param {{port: number, host: string}} config - resolved listening config
 * @returns {import('http').Server} the listening HTTP server
 */
function start(app, config) {
  return app.listen(config.port, config.host, (error) => { if (error) throw error;
    console.log(`Server listening on: http://${config.host}:${config.port}`);
  });
}

// CommonJS module boundary. The two functions are what the unit suite drives;
// the two constants are published so that a test, or a reader, can assert the
// documented defaults against the source of truth rather than against a copy
// of the numbers.
module.exports = { resolveConfig, start, DEFAULT_PORT, DEFAULT_HOST };

// Bootstrap. require.main is the module Node was started with, so this guard
// is true for `node src/server.js` - what `npm start` runs - and false when
// Jest or any other module requires this file, which is why requiring it
// never opens a socket. The two factory calls sit here at the call site, not
// in start's parameter list, for the coverage reason noted above. Stop the
// process with Ctrl+C: no SIGTERM or SIGINT handler is installed, because
// draining keep-alive connections needs a policy and a timeout that a
// single-endpoint tutorial deliberately leaves to its Next Steps.
/* istanbul ignore next */
if (require.main === module) {
  start(createApp(), resolveConfig());
}
