// Entry point, started by npm start: reads PORT and HOST from the environment, starts the
// server built by ./app.js and reports on the terminal whether it is listening.

// Relative imports in ES modules name the file in full, .js extension included, and resolve
// against this file rather than the working directory.
import { createApp } from './app.js';

const DEFAULT_PORT = 3000;
// The loopback address: only programs on this machine can reach the server.
const DEFAULT_HOST = '127.0.0.1';

// Environment variables are strings, or undefined when unset. A blank value counts as unset.
const portValue = process.env.PORT ?? '';
const portText = portValue.trim();
const port = portText === '' ? DEFAULT_PORT : Number(portText);

// Port 0 is allowed: it asks the operating system for any free port.
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  // Errors go to stderr, not stdout, and exit code 1 tells the shell and any script that the
  // start failed: echo $? (PowerShell: $LASTEXITCODE) prints 1.
  console.error(`Invalid PORT "${portValue}": use a whole number from 0 to 65535.`);
  process.exit(1);
}

// 0.0.0.0 listens on all IPv4 interfaces. IPv6 literals such as ::1 are given without brackets.
const host = (process.env.HOST ?? '').trim() || DEFAULT_HOST;

const server = createApp();

// A failed listen arrives as an 'error' event, so the listener is attached before listen is
// called. With no listener, Node.js throws the error as an uncaught exception and a stack trace.
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. ` +
        'Stop the other process or set the PORT environment variable to a free port.',
    );
  } else {
    console.error(`Server failed to start: ${error.message}`);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  // server.address() reports the port actually bound, which differs from PORT when it is 0.
  const { port: boundPort } = server.address();
  // An IPv6 literal contains colons, so it needs square brackets to form a valid URL.
  const urlHost = host.includes(':') ? `[${host}]` : host;
  console.log(`Server listening on http://${urlHost}:${boundPort}`);
});
