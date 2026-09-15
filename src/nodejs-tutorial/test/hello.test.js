'use strict';

/**
 * Endpoint test suite for the Node.js tutorial service.
 * Replaces the Jest/Supertest test suite with Node's built-in node:test runner.
 * The contract asserted here has one authority: ../docs/api-reference.md.
 *
 * Suite structure:
 * - Flat, top-level test() declarations: the runner reports 4 tests, 0 suites
 * - Each test drives a fresh application from the factory in ../src/app rather
 *   than a running server, so the suite starts none and needs no fixed port;
 *   supertest listens on an ephemeral one
 * - Bodies are read from res.text, because res.body is empty for non-JSON
 * - One behaviour per test, asserted as fully as that behaviour needs: the
 *   body test pins the exact string and its byte length, the unknown-path test
 *   pins status, body, byte length and media type
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

test('GET /hello responds 200', async () => {
  const res = await request(createApp()).get('/hello');
  assert.strictEqual(res.status, 200);
});

test('GET /hello body is exactly "Hello world"', async () => {
  const res = await request(createApp()).get('/hello');

  // Validate response content by direct equality against the literal. Comparing
  // with the literal rather than importing the route module's constant is what
  // makes this assertion able to fail: a typo introduced in that constant is
  // caught here instead of being compared against itself.
  assert.strictEqual(res.text, 'Hello world');

  // Validate the body length: 11 bytes means one interior space and no trailing
  // newline. Measured on the body itself rather than read from the
  // Content-Length header, so the assertion proves the bytes, not the claim.
  assert.strictEqual(Buffer.byteLength(res.text), 11);
});

test('GET /hello Content-Type is text/plain; charset=utf-8', async () => {
  const res = await request(createApp()).get('/hello');

  // Validate the media type. Node normalises header names to lower case, and
  // the value is compared in full, so a dropped charset parameter fails here.
  assert.strictEqual(res.headers['content-type'], 'text/plain; charset=utf-8');
});

test('unknown path responds 404', async () => {
  const res = await request(createApp()).get('/unknown');
  assert.strictEqual(res.status, 404);

  // Validate the not-found body by direct equality against the literal. The
  // status alone cannot prove the registered handler ran: Express answers an
  // unmatched path with a 404 of its own when no terminal handler exists. The
  // literal is spelled out rather than imported from ../src/app for the same
  // reason the body assertion above spells its own out — an assertion that
  // imported NOT_FOUND_BODY would compare it with itself and could never fail.
  assert.strictEqual(res.text, 'Not Found');

  // Validate the body length: nine bytes, measured on the received body, so
  // the HTML error page Express sends by default cannot satisfy it.
  assert.strictEqual(Buffer.byteLength(res.text), 9);

  // Validate the media type in full. The handler sends plain text; Express's
  // default 404 is text/html, so this is what distinguishes the two.
  assert.strictEqual(res.headers['content-type'], 'text/plain; charset=utf-8');
});
