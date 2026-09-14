'use strict';

const { createApp } = require('./app');

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';

function resolveConfig(env = process.env) {
  return {
    port: Number.parseInt(env.PORT, 10) || DEFAULT_PORT,
    host: env.HOST || DEFAULT_HOST
  };
}

/**
 * Starts the HTTP listener for the given application and writes the one line
 * of startup output this project produces.
 *
 * This is the only function here that opens a socket. The application
 * createApp() builds is a plain (req, res) request handler that never listens,
 * so the port and the host arrive from this side, already resolved - which is
 * what lets the integration suite drive that same application in process, on
 * a port Supertest chooses.
 *
 * Both arguments are required rather than defaulted, because default
 * parameters would add branches no test executes and jest.config.js gates
 * branch coverage at 95%.
 *
 * Express 5 registers this callback with server.once('error', done) as well as
 * passing it to the socket, so a failed bind arrives as an Error argument;
 * rethrowing it leaves the diagnostic rather than a success URL for a server
 * that never bound. The server is returned so a caller can close it again.
 *
 * @param {import('express').Application} app - application from createApp()
 * @param {{port: number, host: string}} config - resolved listening config
 * @returns {import('http').Server} the listening HTTP server
 */
function start(app, config) {
  return app.listen(config.port, config.host, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Server listening on: http://${config.host}:${config.port}`);
  });
}

module.exports = { resolveConfig, start, DEFAULT_PORT, DEFAULT_HOST };

// Bootstrap. require.main is the module Node was started with, so this guard
// holds when this file is the one run - `npm start` runs
// `node --env-file-if-exists=.env src/server.js` - and not when Jest or any
// other module requires it, which is why a require opens no socket. This is
// also where the real environment is read: resolveConfig() is called with no
// argument, so its default parameter supplies it, and a .env file a reader
// created has already been loaded into it by the runtime through that flag
// rather than by a dependency. Stop the process with Ctrl+C: this file installs
// no SIGTERM or SIGINT handler, because draining keep-alive connections needs
// a policy and a timeout that a single-endpoint tutorial leaves to its Next
// Steps.
/* istanbul ignore next */
if (require.main === module) {
  start(createApp(), resolveConfig());
}
