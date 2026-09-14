'use strict';

const { createApp } = require('./app');
const { isIP } = require('node:net');
const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';
/** Resolves the listening configuration; the only reader of process.env here. */
function resolveConfig(env = process.env) {
  return {
    port: resolvePort(env.PORT),
    host: resolveHost(env.HOST)
  };
}

// Entry module for the tutorial: resolve the listening configuration, bind the
// HTTP listener, and bootstrap when Node was started with this file. The
// application - the routing table and the responses - lives in src/app.js and
// never opens a socket, which is what lets the integration suite drive it in
// process on a port Supertest chooses.
//
// resolveConfig takes the environment as a parameter, defaulting to the real
// process.env, so a test can supply one without mutating the process. Both of
// its values cross from the environment into a listening socket, so
// resolvePort and resolveHost decide what each one may be before app.listen
// sees it; they are declared further down, which function hoisting allows. A
// .env file, when a reader creates one, is loaded by the runtime through the
// --env-file-if-exists flag in the start script, so nothing here parses it and
// no dotenv dependency is declared.

// PORT must be a whole decimal number inside 1-65535, the range a TCP socket
// can be assigned. Number.parseInt is prefix-tolerant and range-blind - it
// reads `3000junk` as 3000 and `1e3` as 1, and hands -1 or 70000 on to fail at
// bind time - so the value is matched in full before it is converted. Port 0
// is excluded because it asks the operating system for any free port, which a
// configured value should never do silently.
const PORT_PATTERN = /^[0-9]{1,5}$/;
const MIN_PORT = 1;
const MAX_PORT = 65535;

// HOST must be an IP literal node:net recognises - 0.0.0.0 and :: included,
// since binding every interface is a legitimate choice as long as it is an
// explicit one - or a DNS name whose last label starts with a letter, as every
// real top-level label does. That last rule is what rejects the legacy numeric
// aliases the resolver would otherwise widen: HOST=0, HOST=0x0 and HOST=0000
// all reach 0.0.0.0 through getaddrinfo, so accepting them would replace the
// documented loopback default with an all-interface bind that nobody asked
// for. Labels are bounded at 63 characters and the whole name at 253, as DNS
// requires.
const HOST_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const MAX_HOST_LENGTH = 253;

/**
 * Trims an environment value, treating anything that is not a string - an
 * unset variable included - as absent.
 *
 * @param {unknown} value - raw value as the environment supplied it
 * @returns {string} the trimmed value, or '' when there is none
 */
function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The invalid-value policy, one policy for both variables: a value that is not
 * supported is never bound. It is reported on standard error, naming the
 * variable, the value that was ignored and the default used instead, so a
 * malformed template cannot move the listener without saying so.
 *
 * @param {string} name - environment variable being resolved
 * @param {string} candidate - value that failed validation
 * @param {string|number} fallback - documented default to use in its place
 * @returns {string|number} the fallback
 */
function useFallback(name, candidate, fallback) {
  console.warn(
    `Ignoring ${name}=${JSON.stringify(candidate)}: unsupported value. ` +
      `Using ${name}=${fallback} instead.`
  );

  return fallback;
}

/**
 * Resolves the listening port: DEFAULT_PORT when PORT is unset or blank, the
 * number PORT names when it is a whole decimal inside MIN_PORT-MAX_PORT, and
 * DEFAULT_PORT with a warning for anything else - a trailing typo, an
 * exponent, a negative value or a port that cannot be assigned.
 *
 * @param {unknown} value - raw PORT from the environment
 * @returns {number} the port to bind
 */
function resolvePort(value) {
  const candidate = normalize(value);

  if (candidate === '') {
    return DEFAULT_PORT;
  }

  const port = Number(candidate);

  if (!PORT_PATTERN.test(candidate) || port < MIN_PORT || port > MAX_PORT) {
    return useFallback('PORT', candidate, DEFAULT_PORT);
  }

  return port;
}

/**
 * Resolves the listening host: DEFAULT_HOST when HOST is unset or blank, the
 * value itself when it is an IP literal or a DNS name, and DEFAULT_HOST with a
 * warning for anything else. Falling back to loopback is the safe direction:
 * an unsupported value narrows the listener rather than widening it, so the
 * wildcard is reachable only by naming it in full.
 *
 * @param {unknown} value - raw HOST from the environment
 * @returns {string} the host to bind
 */
function resolveHost(value) {
  const candidate = normalize(value);

  if (candidate === '') {
    return DEFAULT_HOST;
  }

  if (isIP(candidate) !== 0) {
    return candidate;
  }

  if (candidate.length > MAX_HOST_LENGTH || !HOST_PATTERN.test(candidate)) {
    return useFallback('HOST', candidate, DEFAULT_HOST);
  }

  return candidate;
}

/**
 * Starts the HTTP listener for the given application.
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
  return app.listen(config.port, config.host, (error) => { if (error) throw error;
    console.log(`Server listening on: http://${config.host}:${config.port}`);
  });
}

module.exports = { resolveConfig, start, DEFAULT_PORT, DEFAULT_HOST };

// Bootstrap. require.main is the module Node was started with, so this guard
// holds when this file is the one run - `npm start` runs
// `node --env-file-if-exists=.env src/server.js` - and not when Jest or any
// other module requires it, which is why a require opens no socket. Stop the
// process with Ctrl+C: no SIGTERM or SIGINT handler is installed, because
// draining keep-alive connections needs a policy and a timeout that a
// single-endpoint tutorial leaves to its Next Steps.
/* istanbul ignore next */
if (require.main === module) {
  start(createApp(), resolveConfig());
}
