'use strict';

/**
 * Endpoint test suite for the Node.js tutorial service.
 * Replaces the Jest/Supertest test suite with Node's built-in node:test runner.
 *
 * Four assertions prove that the published GET /hello contract holds. Each one
 * drives the application object returned by the factory in ../src/app rather
 * than a running server, so the suite needs no server started and binds no
 * fixed port — supertest manages the transport itself. The contract under test
 * is documented in ../docs/api-reference.md, which is its single authority.
 *
 * Educational Purpose:
 * - Shows flat node:test declarations replacing Jest's nested suite organisation
 * - Demonstrates node:assert/strict equality in place of Jest matcher syntax
 * - Shows supertest driving an application factory instead of a live listener
 * - Demonstrates one concern per test, each named for the property it proves
 * - Shows how a plain-text contract is asserted: status, bytes, and media type
 *
 * Technical Features:
 * - Flat, top-level test() declarations: the runner reports 4 tests and 0 suites
 * - A fresh application per test via createApp(), so no state is shared
 * - Plain-text body read from res.text, because res.body is empty for non-JSON
 * - Byte-length assertion pinning the 11-byte body and its absent trailing newline
 * - Unknown-path case exercising the terminal not-found handler in ../src/app
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

/**
 * The route the tutorial serves answers a GET request successfully.
 * Validates that the router is mounted and the path is reachable.
 */
test('GET /hello responds 200', async () => {
  // Request the endpoint through a freshly assembled application
  const res = await request(createApp()).get('/hello');

  // Validate HTTP status code
  assert.strictEqual(res.status, 200);
});

/**
 * The response body is the exact string the contract fixes.
 * Validates the bytes themselves, not merely that they look right.
 */
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

/**
 * The response advertises the media type the contract fixes.
 * Validates the full header value, charset parameter included.
 */
test('GET /hello Content-Type is text/plain; charset=utf-8', async () => {
  const res = await request(createApp()).get('/hello');

  // Validate the media type. Node normalises header names to lower case, and
  // the value is compared in full, so a dropped charset parameter fails here.
  assert.strictEqual(res.headers['content-type'], 'text/plain; charset=utf-8');
});

/**
 * A path no route declares reaches the terminal handler in ../src/app.
 * Validates the not-found behaviour that handler is registered to provide.
 */
test('unknown path responds 404', async () => {
  // Request a path the application declares no route for
  const res = await request(createApp()).get('/unknown');

  // Validate 404 status code
  assert.strictEqual(res.status, 404);
});
