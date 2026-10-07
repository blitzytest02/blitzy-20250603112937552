# Node.js Hello World HTTP Server

A Node.js HTTP server with one endpoint, `/hello`, that returns `Hello world` to any HTTP client
that calls it: curl, a browser or `fetch`. It is built with Node.js built-ins only, so there are no
npm dependencies to install, and all the code that answers a request is in this repository.

## What you will learn

- Start a Node.js HTTP server, and say what `createServer` and `listen` each do.
- Call the endpoint from curl and a browser, and read the status line, headers and body.
- Explain why `/hello` returns `200`, `/hello/` returns `404` and `POST /hello` returns `405`.
- Explain why `Content-Type` carries a charset and why `Content-Length` counts bytes.
- Change the port with an environment variable in your own shell, and diagnose a port-in-use
  failure.
- Run the automated tests, and explain how a test starts a server on port `0` and stops it.
- Check and pin the Node.js version a project expects.

## Prerequisites

- **Node.js 24 LTS.** This is the line the project's `.nvmrc` file selects, and the one every
  output in this README was verified on. Check it with:

  ```bash
  node --version
  ```

  It prints `v24.` followed by the patch release, for example `v24.21.0`. Later releases satisfy
  the `engines` floor in `package.json` (`>=24`), but the outputs shown here are verified on 24.

- **npm**, which is bundled with Node.js. Check it with:

  ```bash
  npm --version
  ```

  It prints a version number (11.x with Node.js 24).

- **curl**, for calling the server from the terminal. Check it with:

  ```bash
  curl --version
  ```

  In Windows PowerShell 5.1, type `curl.exe` instead of `curl` here and in every later command,
  because there `curl` is an alias for `Invoke-WebRequest`.

- **A version manager (optional)**, if you switch between Node.js versions. With nvm, run these
  two commands in the project directory. They read `.nvmrc`, install the newest Node.js 24
  release and switch the current shell to it:

  ```bash
  nvm install
  nvm use
  ```

  With nvm-windows, name the line instead: `nvm install 24`, then `nvm use 24`.

### A note on shells

Commands are written for POSIX shells (bash, zsh) and run unchanged in PowerShell, except in three
places, where each section also shows the PowerShell form:

| POSIX shells | PowerShell |
|--------------|------------|
| `NAME=value npm start` | `$env:NAME = 'value'; npm start`, then `Remove-Item Env:NAME` once that run has finished or been stopped |
| `echo $?` | `$LASTEXITCODE` |
| `curl` | `curl` in PowerShell 7, `curl.exe` in Windows PowerShell 5.1 |

Every `npm` and `node` command is identical in both shells.

## Install

From the project directory, run:

```bash
npm install
```

Expected output:

```text
up to date, audited 1 package in <time>

found 0 vulnerabilities
```

The project has no dependencies, so the command downloads nothing and creates no `node_modules/`
directory. It only confirms that `package-lock.json` matches `package.json`. On a clean checkout,
`npm ci` is the equivalent command: it installs exactly what the lockfile records, which here is
nothing.

## Run the server

In a terminal in the project directory, run:

```bash
npm start
```

Expected output:

```text
> node-hello-tutorial@1.0.0 start
> node src/server.js

Server listening on http://127.0.0.1:3000
```

The first two lines are npm announcing the `start` script and the command it runs. The last line
comes from the server once it is listening.

The server occupies this terminal until you stop it. Leave it running, and open a second terminal
in the project directory for every command in the next section.

## Call the endpoint

Run every command in this section in the second terminal, while the server keeps running in the
first.

### GET /hello: 200 OK

```bash
curl -i http://127.0.0.1:3000/hello
```

Expected output:

```text
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
Date: <date>
Connection: keep-alive
Keep-Alive: timeout=5

Hello world
```

The status is `200 OK` because `/hello` exists and `GET` is a method it supports. The `-i` flag
makes curl print the status line and headers before the body:

- `Content-Type: text/plain; charset=utf-8` says the body is plain text encoded as UTF-8, so no
  client has to guess how to turn the bytes into characters.
- `Content-Length: 11` is the size of the body in bytes.
- `Date`, `Connection` and `Keep-Alive` are added by Node.js, not by this project's code, and vary
  with the client: a client that asks to close the connection receives `Connection: close`
  instead.

Your shell prompt appears directly after `Hello world`, on the same line. That is expected: the
body is exactly the 11 characters `Hello world`, with no trailing newline.

### In a browser

Open `http://localhost:3000/hello` in a browser. It shows the plain text `Hello world`, because a
browser navigating to a URL sends the same `GET` request curl does.

### HEAD /hello: 200 OK with no body

```bash
curl -I http://127.0.0.1:3000/hello
```

Expected output, the same status line and headers as above, and no body:

```text
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
Date: <date>
Connection: keep-alive
Keep-Alive: timeout=5

```

The `-I` flag sends a `HEAD` request, which asks for the headers a `GET` would return without the
body. The status is `200 OK` because HTTP expects a server that answers `GET` for a resource to
answer `HEAD` for it too, and `Content-Length` still reports the 11 bytes a `GET` would send.

### Check the exact bytes

This command is the same in POSIX shells and PowerShell, and needs only Node.js. It fetches the
endpoint with the `fetch` built into Node.js and prints the body's length in bytes, then the
bytes in hexadecimal:

```bash
node -e "fetch('http://127.0.0.1:3000/hello').then((r) => r.arrayBuffer()).then((b) => console.log(b.byteLength, Buffer.from(b).toString('hex')))"
```

Expected output:

```text
11 48656c6c6f20776f726c64
```

That is 11 bytes, the hexadecimal codes of `H`, `e`, `l`, `l`, `o`, a space, `w`, `o`, `r`, `l`
and `d`. There is no trailing `0a`, the code of a newline character.

The status is `200 OK` because `fetch` sends the same `GET /hello` request as curl, and `/hello`
exists and supports `GET`; the command shows only the body that comes back.

### A query string: still 200 OK

```bash
curl -s "http://127.0.0.1:3000/hello?name=learner"
```

Expected output:

```text
Hello world
```

The status is `200 OK` because the server compares only the path, the part of the URL before
`?`, and ignores the query string. The URL is in quotes because zsh treats `?` as a wildcard and
would otherwise try to match it against file names. The `-s` flag hides curl's progress output.

### POST /hello: 405 Method Not Allowed

```bash
curl -i -X POST http://127.0.0.1:3000/hello
```

Expected output:

```text
HTTP/1.1 405 Method Not Allowed
Content-Type: text/plain; charset=utf-8
Content-Length: 18
Allow: GET, HEAD
Date: <date>
Connection: keep-alive
Keep-Alive: timeout=5

Method Not Allowed
```

The status is `405 Method Not Allowed` because `/hello` exists but does not support `POST`, and
HTTP requires a `405` response to list the methods the resource does support in an `Allow`
header.

### Any other path: 404 Not Found

```bash
curl -i http://127.0.0.1:3000/
curl -i http://127.0.0.1:3000/hello/
```

Both commands print:

```text
HTTP/1.1 404 Not Found
Content-Type: text/plain; charset=utf-8
Content-Length: 9
Date: <date>
Connection: keep-alive
Keep-Alive: timeout=5

Not Found
```

The status is `404 Not Found` because the path is not exactly `/hello`. The match is exact and
case-sensitive, so `/`, `/hello/` with its trailing slash, `/HELLO` and `/hello/world` are all
different resources that do not exist. A `404` does not depend on the method: `POST /` is a
`404` too, because the server checks the path before it checks the method.

### Stop the server

Return to the first terminal and press Ctrl+C to stop the server before you continue.

## Change the port or host

The server reads two environment variables when it starts: `PORT`, default `3000`, and `HOST`,
default `127.0.0.1`. Start each variant below in the first terminal, call it from the second, and
stop it with Ctrl+C in the first.

### Port

POSIX shells:

```bash
PORT=4000 npm start
```

PowerShell:

```powershell
$env:PORT = '4000'; npm start
```

Expected output in either shell:

```text
> node-hello-tutorial@1.0.0 start
> node src/server.js

Server listening on http://127.0.0.1:4000
```

From the second terminal:

```bash
curl -s http://127.0.0.1:4000/hello
```

Expected output:

```text
Hello world
```

In a POSIX shell, `PORT=4000 npm start` sets the variable for that one command only. In
PowerShell, `$env:PORT` stays set for the rest of the session, so every later `npm start` in that
terminal would use port 4000. After stopping the server, clear it:

```powershell
Remove-Item Env:PORT
```

Spaces around the value are ignored, and an empty value means the default, `3000`. Otherwise
`PORT` must be a whole number from 0 to 65535. Port `0` asks the operating system for any free
port, and the startup line then shows the port it was given.

### Host

> **Warning:** `HOST=0.0.0.0` makes the server reachable from other devices on your network. Use
> it only on a trusted network.

By default the server listens on `127.0.0.1`, the loopback interface, which only programs on your
own machine can reach. `0.0.0.0` means all IPv4 interfaces.

POSIX shells:

```bash
HOST=0.0.0.0 npm start
```

PowerShell, followed by `Remove-Item Env:HOST` after stopping the server:

```powershell
$env:HOST = '0.0.0.0'; npm start
```

In both shells the startup line reads `Server listening on http://0.0.0.0:3000`. An IPv6 address
such as `::1` is given without brackets, and the startup line prints it in brackets,
`http://[::1]:3000`, because a URL requires them around an IPv6 address.

## Run the tests

```bash
npm test
```

Expected output:

```text
> node-hello-tutorial@1.0.0 test
> node --test

✔ GET /hello returns 200 with exactly "Hello world" (<time>)
✔ HEAD /hello returns the GET headers and no body (<time>)
✔ GET /hello ignores the query string (<time>)
✔ GET /hello/ with a trailing slash is 404 (<time>)
✔ GET / is 404 Not Found (<time>)
✔ POST /hello is 405 with an Allow header (<time>)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms <time>
```

Each test calls the server over real HTTP and checks the response:

1. `GET /hello returns 200 with exactly "Hello world"`: status `200`, the `Content-Type` and
   `Content-Length: 11` headers, and the exact body.
2. `HEAD /hello returns the GET headers and no body`: status `200`, the same headers as `GET`,
   and an empty body.
3. `GET /hello ignores the query string`: `/hello?name=learner` still returns `Hello world`.
4. `GET /hello/ with a trailing slash is 404`: the trailing slash makes it a different path.
5. `GET / is 404 Not Found`: any path other than `/hello` returns `Not Found`, 9 bytes long.
   `POST /` and `/HELLO` are `404` too, because the path is checked first and exactly.
6. `POST /hello is 405 with an Allow header`: an unsupported method returns `405` and
   `Allow: GET, HEAD`.

The suite starts its own server on a free port (port `0`), so it needs no `npm start` and works
whether or not the server from "Run the server" is running.

To see how much of the code the tests exercise, run them with coverage (optional):

```bash
node --test --experimental-test-coverage
```

After the same test lines and summary, it prints a coverage report:

```text
ℹ start of coverage report
ℹ ----------------------------------------------------------
ℹ file      | line % | branch % | funcs % | uncovered lines
ℹ ----------------------------------------------------------
ℹ src       |        |          |         | 
ℹ  app.js   | 100.00 |   100.00 |  100.00 | 
ℹ ----------------------------------------------------------
ℹ all files | 100.00 |   100.00 |  100.00 | 
ℹ ----------------------------------------------------------
ℹ end of coverage report
```

Every line, branch and function of `src/app.js` runs during the tests. `src/server.js` is not in
the table because the tests never import it. You exercised it by hand with `npm start` above.

## How it works

This section walks through each file in turn, from configuration to code to tests. Excerpts are
copied from the files named. Where an excerpt says "comments omitted", its code lines are exact
and the comments between and beside them are left out, so read the file for the full version.

### `package.json`

```json
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test"
  }
```

- `"private": true` makes npm refuse to publish the project, so it cannot be released to the
  npm registry by accident.
- `"type": "module"` makes Node.js load every `.js` file in the project as an ES module, so the
  files use `import` and `export`, the same module syntax as browser JavaScript.
- `"engines"` declares the oldest Node.js version the project supports. npm treats it as advice:
  an older Node.js gets an `EBADENGINE` warning from `npm install`, not a failed install.
- `"scripts"` defines the project's only two commands. `npm start` runs `node src/server.js`, and
  `npm test` runs `node --test`, which finds files named `*.test.js` on its own. Neither contains
  shell-specific syntax, so both run unchanged on Linux, macOS and Windows.

### `.nvmrc`

The file holds one line, `24`. Version managers such as nvm read it, so `nvm install` and
`nvm use` select the newest Node.js 24 release. The two settings do different jobs: `.nvmrc`
names the line the project recommends and was verified on, while `engines` only sets a minimum.

### `src/app.js`

The file imports one module:

```js
import http from 'node:http';
```

The `node:` prefix shows at a glance that `http` is built into Node.js rather than downloaded
from npm.

`createApp`, the file's only export, builds the server:

```js
export function createApp() {
  return http.createServer(handleRequest);
}
```

`http.createServer` creates a server object and registers `handleRequest` as its request
listener, the function Node.js calls whenever it passes a request on to the application, with
`req`, the incoming request, and `res`, the response being built. A few requests never reach it,
because Node.js handles them itself: for example, it closes the connection on a `CONNECT`
request without replying, and answers a request it cannot parse with an error such as
`400 Bad Request`. Creating a server does not open a port. That is the job of `listen`, which
`src/server.js` and the tests each call with a port of their own choosing.

`handleRequest` decides the response to every request it receives (comments omitted):

```js
  const path = req.url.split('?')[0];

  if (path !== HELLO_PATH) return send(res, 404, 'Not Found');

  if (req.method === 'GET' || req.method === 'HEAD') return send(res, 200, HELLO_BODY);

  return send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
```

`req.url` is the request target exactly as the client sent it, for example
`/hello?name=learner`. Everything before the first `?` is the path, and everything after it is
the query string, which this server ignores. `HELLO_PATH` and `HELLO_BODY` are declared once at
the top of the file:

```js
const HELLO_PATH = '/hello';
const HELLO_BODY = 'Hello world';
```

The order of the checks is the routing logic. The path is checked first, so any other path is
`404 Not Found` whatever the method. Only a request that reached `/hello` has its method
checked, so `405 Method Not Allowed` is possible only there, with an `Allow` header listing what
`/hello` does support.

Every branch ends in `send`, which writes the whole response in one place (comments omitted):

```js
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
```

followed by:

```js
  res.end(body);
```

`res.writeHead` sets the status code and all the headers in one call, and `res.end` sends the
body and completes the response.

- **Why a charset.** A body travels as bytes. `charset=utf-8` tells the client which encoding
  turns those bytes back into text, instead of leaving it to guess.
- **Why bytes, not characters.** `Content-Length` is measured in bytes. A JavaScript string's
  `.length` counts UTF-16 code units, not bytes, and the two differ as soon as a character needs
  more than one byte in UTF-8: `'héllo'.length` is 5, but `Buffer.byteLength('héllo')` is 6. For
  `Hello world` both are 11, and `Buffer.byteLength` stays correct when the text changes.
- **HEAD.** `send` passes the body to `res.end` for every response it writes. For a `HEAD`
  request Node.js sends the headers of whichever response `handleRequest` selected, its
  `Content-Length` among them, and leaves the body out: `HEAD /hello` reports
  `Content-Length: 11`, and `HEAD` for an unknown path reports the 9 bytes of `Not Found`.

### `src/server.js`

This is the program `npm start` runs. It reads `PORT` from the environment:

```js
const portValue = process.env.PORT ?? '';
const portText = portValue.trim();
const port = portText === '' ? DEFAULT_PORT : Number(portText);
```

`process.env` holds the environment variables the shell passed in, always as strings, or
`undefined` for a variable that is not set. It then rejects a bad port before trying to listen:

```js
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  fail(`Invalid PORT "${portValue}": use a whole number from 0 to 65535.`);
} else {
```

`Number('abc')` is `NaN` and `Number('3000.5')` is `3000.5`. Neither is an integer, so both are
rejected. `fail`, shown at the end of this section, reports the error and ends the process once
the message is written. It returns before that happens, so the code that creates and starts the
server sits in the `else` branch, which a bad port never reaches. There, `HOST` is resolved the
same way as `PORT`, falling back to the loopback address:

```js
  const host = (process.env.HOST ?? '').trim() || DEFAULT_HOST;
```

Listening can fail, for example when another process already holds the port. `listen` does not
throw in that case: it returns at once and reports the failure later as an `error` event on the
server. The listener is therefore attached first, before `listen` is called:

```js
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
```

`EADDRINUSE` is the operating system's code for "address already in use", and it gets its own
message. Any other error, such as a `HOST` that does not resolve, is reported as
`Server failed to start: <error message>`.

Then the server starts listening:

```js
  server.listen(port, host, () => {
    const { port: boundPort } = server.address();
    const urlHost = host.includes(':') ? `[${host}]` : host;
    console.log(`Server listening on http://${urlHost}:${boundPort}`);
  });
```

`listen` binds the server to the port and host and starts accepting connections. The callback
runs once the server is listening. `server.address()` returns an address object whose `port`
field is the port actually bound. Reading that field, here into `boundPort`, is the only way to
learn which port the operating system chose when `PORT` is `0`.

The two kinds of output go to different places. The success line uses `console.log`, which
writes to stdout. Every failure goes through one helper, `fail`:

```js
function fail(message) {
  console.error(message.replaceAll('\r', '\\r').replaceAll('\n', '\\n'));
  process.stderr.write('', () => process.exit(1));
}
```

`console.error` writes to stderr. A line break inside a value, such as a `PORT` that spans two
lines, is shown as the two characters `\n` or `\r`, so the failure stays on one line. When stderr
is a pipe, the message can still be in transit after `console.error` returns, and an immediate
`process.exit(1)` could cut it short. The callback of the empty write runs only once everything
written before it has reached the operating system, so the process exits with code `1` after the
whole message is out. A shell or script can separate the two streams, and exit code `1`, read
with `echo $?` or `$LASTEXITCODE`, tells it the start failed. A listening server keeps the
process alive until Ctrl+C ends it.

### `test/hello.test.js`

The suite uses only what Node.js ships with (comments omitted):

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
```

It imports `createApp`, not `src/server.js`, so it controls its own server. `before` runs once
before the tests and starts that server on port `0`, which makes the operating system pick a free
port:

```js
    server.listen(0, '127.0.0.1', () => {
```

The port it was given is read back to build the base URL for every request:

```js
  baseUrl = `http://127.0.0.1:${server.address().port}`;
```

`after` runs once after the last test and closes the server, so the test process exits and
leaves nothing running:

```js
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
```

Each test calls the server with `fetch`, the same API browsers provide, and asserts on the
status, the headers and the exact body (comments omitted):

```js
test('GET /hello returns 200 with exactly "Hello world"', async () => {
  const res = await fetch(`${baseUrl}/hello`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('content-length'), '11');
  assert.equal(await res.text(), 'Hello world');
});
```

`assert.equal` from `node:assert/strict` compares strictly, so `'11'` must be the string `'11'`
and the body must match `Hello world` exactly, with nothing before or after it. A failed
assertion fails that test, and `npm test` then exits with a non-zero code.

### `package-lock.json` and `.gitignore`

`package-lock.json` is written by `npm install` and records the exact dependency set, which for
this project is the root package alone; it lets `npm ci` reproduce the install on a clean
checkout, and it is never edited by hand.

`.gitignore` keeps `node_modules/` and npm's `npm-debug.log*` failure logs out of version control,
for when you add a package or npm reports an error.

## Project structure

```text
/                              # Repository root and npm project root
├── .gitignore                 # Keeps node_modules/ and npm debug logs out of version control
├── .nvmrc                     # Node.js line for version managers: 24
├── package.json               # Project metadata, ES module flag, engines pin, start and test scripts
├── package-lock.json          # npm lockfile (lockfileVersion 3), root package only, generated by npm install
├── README.md                  # The tutorial: prerequisites, run, call, test, file walkthrough, troubleshooting
├── src/                       # Application source
│   ├── app.js                 # createApp(): the request handler that implements the /hello contract
│   └── server.js              # Entry point: resolves PORT and HOST, listens, logs, reports startup errors
└── test/                      # Test suite, discovered by node --test
    └── hello.test.js          # Contract tests over real HTTP against an ephemeral-port server
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `npm warn EBADENGINE Unsupported engine` during install, or `node --version` below `v24` | Node.js older than the `engines` floor | Install Node.js 24 LTS, or run `nvm install` then `nvm use` |
| `npm test` fails with `fetch is not defined` | Node.js 16 or earlier, which has no global `fetch` | Same as above |
| `Port 3000 is already in use. Stop the other process or set the PORT environment variable to a free port.` | Another process, often a second `npm start`, holds the port | Stop it with Ctrl+C in its terminal, find it with `lsof -i :3000` (macOS/Linux) or `netstat -ano \| findstr :3000` (Windows), or start on another port as in "Change the port or host" |
| `Invalid PORT "<value>": use a whole number from 0 to 65535.` | `PORT` is not a whole number, or is out of range | Set `PORT` to a whole number from 0 to 65535 |
| `curl: (7) Failed to connect to 127.0.0.1 port 3000` | The server is not running, or is listening on another port or host | Start it with `npm start` and use the address printed in the startup line |
| `Not Found` for a URL that looks right | Trailing slash, capital letters or a typo in the path | Request exactly `/hello` |
| `Method Not Allowed` | The client sent a method other than GET or HEAD | Use GET, the default for curl and browsers |
| PowerShell prints a `StatusCode` table instead of raw HTTP | `curl` is an alias for `Invoke-WebRequest` in Windows PowerShell 5.1 | Type `curl.exe` |
| PowerShell reports that the term `PORT=4000` is not recognized | POSIX syntax typed into PowerShell | Use `$env:PORT = '4000'; npm start`, then `Remove-Item Env:PORT` after stopping the server |
| The shell prompt appears right after `Hello world` | The body has no trailing newline, by design | Nothing to fix |

