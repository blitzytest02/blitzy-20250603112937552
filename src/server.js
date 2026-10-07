// Entry point, started by npm start: reads PORT and HOST from the environment, starts the
// server built by ./app.js and reports on the terminal whether it is listening.

// Relative imports in ES modules name the file in full, .js extension included, and resolve
// against this file rather than the working directory.
import { createApp } from './app.js';

const DEFAULT_PORT = 3000;
// The loopback address: only programs on this machine can reach the server.
const DEFAULT_HOST = '127.0.0.1';

// Startup failures go to stderr with exit code 1, so a caller can tell the start failed.
function fail(message) {
  // A line break or a terminal control such as ESC, in PORT or in a HOST quoted by an error,
  // is shown escaped: the message stays on one line and the terminal cannot act on it.
  const shown = message.replace(/\p{Cc}/gu, (character) => {
    if (character === '\r') return '\\r';
    if (character === '\n') return '\\n';
    return `\\x${character.charCodeAt(0).toString(16).padStart(2, '0')}`;
  });
  console.error(shown);
  // stderr can be asynchronous on a pipe; the empty write's callback waits for earlier writes.
  process.stderr.write('', () => process.exit(1));
}

// Environment variables are strings, or undefined when unset. A blank value counts as unset.
const portValue = process.env.PORT ?? '';
const portText = portValue.trim();
const port = portText === '' ? DEFAULT_PORT : Number(portText);

// Port 0 is allowed: it asks the operating system for any free port. fail returns before the
// process exits, so the server is created and started only in the else branch.
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  fail(`Invalid PORT "${portValue}": use a whole number from 0 to 65535.`);
} else {
  // 0.0.0.0 listens on all IPv4 interfaces. IPv6 literals such as ::1 are given without brackets.
  const host = (process.env.HOST ?? '').trim() || DEFAULT_HOST;

  const server = createApp();

  // A failed listen arrives as an 'error' event, so the listener is attached before listen is
  // called. With no listener, Node.js throws the error as an uncaught exception and a stack trace.
  // An error after listening is not a startup failure, so it is rethrown to that default path.
  server.on('error', (error) => {
    if (server.listening) throw error;
    if (error.code === 'EADDRINUSE') {
      fail(
        `Port ${port} is already in use. ` +
          'Stop the other process or set the PORT environment variable to a free port.',
      );
    } else {
      fail(`Server failed to start: ${error.message}`);
    }
  });

  server.listen(port, host, () => {
    // server.address() reports the port actually bound, which differs from PORT when it is 0.
    const { port: boundPort } = server.address();
    // An IPv6 literal contains colons, so it needs square brackets to form a valid URL.
    const urlHost = host.includes(':') ? `[${host}]` : host;
    console.log(`Server listening on http://${urlHost}:${boundPort}`);
  });
}
