// Contract tests for the /hello endpoint built by src/app.js, sent over real HTTP.
// Run them with npm test, which runs node --test; it finds this file without configuration.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
// The suite builds its own server and never imports src/server.js, which listens on import.
import { createApp } from '../src/app.js';

let server;
let baseUrl;

// before runs once ahead of all the tests in this file and after runs once when they have
// finished, so every test talks to the same server.
before(async () => {
  server = createApp();
  // Port 0 asks the operating system for a free port, so the suite never depends on port 3000
  // and runs even while npm start is serving.
  await new Promise((resolve, reject) => {
    // A failed listen arrives as an 'error' event, never through the callback. Rejecting on
    // it fails this hook at once with the error's message, where waiting only for the
    // callback would leave the suite hanging without one.
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  // server.address() reports the port actually bound.
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  // Since Node.js 19, close() also closes idle keep-alive connections, so the test process
  // exits and leaves nothing running.
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test('GET /hello returns 200 with exactly "Hello world"', async () => {
  // fetch is built into Node.js, as in browsers. Each test reads the whole body, so no
  // connection is still busy when after() closes the server.
  const res = await fetch(`${baseUrl}/hello`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  // Header values are strings. An 11-byte length plus the exact text proves the body is
  // exactly those bytes, with no trailing newline.
  assert.equal(res.headers.get('content-length'), '11');
  assert.equal(await res.text(), 'Hello world');
});

test('HEAD /hello returns the GET headers and no body', async () => {
  const res = await fetch(`${baseUrl}/hello`, { method: 'HEAD' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('content-length'), '11');
  assert.equal(await res.text(), '');
});

test('GET /hello ignores the query string', async () => {
  const res = await fetch(`${baseUrl}/hello?name=learner`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await res.text(), 'Hello world');
});

test('GET /hello/ with a trailing slash is 404', async () => {
  const res = await fetch(`${baseUrl}/hello/`);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await res.text(), 'Not Found');
});

test('GET / is 404 Not Found', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('content-length'), '9');
  assert.equal(await res.text(), 'Not Found');
  // The path is checked before the method and compared exactly, letter case included, so a
  // POST to an unknown path and a differently cased /hello are 404 too, not 405 or 200.
  const postRootRes = await fetch(`${baseUrl}/`, { method: 'POST' });
  assert.equal(postRootRes.status, 404);
  assert.equal(await postRootRes.text(), 'Not Found');
  const upperCaseRes = await fetch(`${baseUrl}/HELLO`);
  assert.equal(upperCaseRes.status, 404);
  assert.equal(await upperCaseRes.text(), 'Not Found');
});

test('POST /hello is 405 with an Allow header', async () => {
  const res = await fetch(`${baseUrl}/hello`, { method: 'POST' });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'GET, HEAD');
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('content-length'), '18');
  assert.equal(await res.text(), 'Method Not Allowed');
});
