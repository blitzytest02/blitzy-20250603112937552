// Builds the HTTP server behind the tutorial's one endpoint, /hello.
// src/server.js (npm start) and test/hello.test.js (npm test) import it.
// It never listens on its own.

// The node: prefix marks a module that ships with Node.js, not a package installed from npm.
import http from 'node:http';

const HELLO_PATH = '/hello';
const HELLO_BODY = 'Hello world';

// Writes one complete plain-text response: the status line and headers, then the body.
function send(res, statusCode, body, extraHeaders = {}) {
  res.writeHead(statusCode, {
    // An explicit charset stops clients guessing how to decode the body.
    'Content-Type': 'text/plain; charset=utf-8',
    // Content-Length is a count of bytes. Buffer.byteLength counts UTF-8 bytes, while
    // body.length counts characters and would be wrong for any multi-byte character.
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  // For a HEAD request Node.js sends the headers above, Content-Length included, and omits
  // the body, so HEAD reports exactly what GET would send.
  res.end(body);
}

// The request listener: Node.js calls it once for every request the server receives.
function handleRequest(req, res) {
  // Splitting on '?' cannot throw, unlike new URL() on request targets such as //[ that the
  // HTTP parser accepts. An exception thrown here would crash the server.
  const path = req.url.split('?')[0]; // the query string never affects matching

  // Path before method: an unknown path is 404 whatever the method, so only /hello can be 405.
  if (path !== HELLO_PATH) return send(res, 404, 'Not Found');

  // HTTP expects a server that answers GET for a resource to answer HEAD for it too.
  if (req.method === 'GET' || req.method === 'HEAD') return send(res, 200, HELLO_BODY);

  // RFC 9110: a 405 response must list the methods the target supports in an Allow header.
  return send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
}

/**
 * Creates the tutorial's HTTP server and returns it without starting it.
 *
 * createApp never calls listen: the caller chooses the port, src/server.js from PORT and the
 * tests a free one (port 0), so importing this module never opens a socket.
 *
 * @returns {import('node:http').Server} A server that is not yet listening.
 */
export function createApp() {
  return http.createServer(handleRequest);
}
