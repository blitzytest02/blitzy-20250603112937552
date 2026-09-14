/**
 * Binds the hello-node tutorial application to a real TCP socket and owns the
 * process lifecycle around it.
 *
 * Educational Focus: Demonstrates the half of a Node service that `app.js`
 * deliberately does not do. The application module assembles routes and nothing
 * else — it never reads process.env, never chooses a port and never calls
 * listen(). This module owns all three of those, plus everything that follows
 * from holding an operating-system resource: reading configuration from the
 * environment against documented defaults, binding the socket, announcing the
 * address a client should actually call, and closing the socket cleanly when the
 * process is asked to stop. Splitting the two responsibilities is what makes the
 * application testable in-process, because a test can require `./app` and let
 * supertest bind a short-lived ephemeral loopback listener (port 0, assigned by
 * the operating system) without starting `server.js` and without reserving a
 * configured port. A socket is still involved; what the split removes is the need
 * for a pre-running server and for a port someone has to choose.
 *
 * Key Learning Concepts:
 * - Environment-driven configuration with documented defaults: HOST and PORT are
 *   the only two variables this server reads, both optional, both falling back to
 *   a value written down in `.env.example` rather than hidden in the code.
 * - readConfig() takes its environment as a parameter instead of reaching for the
 *   global. That single design choice is what makes configuration resolution a
 *   pure function a test can call with any environment it likes.
 * - The startup banner reports the port that was actually BOUND, read from
 *   server.address(), not the port that was requested. The two differ whenever
 *   the requested port is 0, which asks the operating system to pick a free one:
 *   printing the requested value would announce "http://localhost:0", an address
 *   no client can call.
 * - Graceful termination: on SIGTERM or SIGINT the server stops accepting new
 *   connections and lets in-flight responses finish before the process exits,
 *   instead of dropping them mid-flight the way an unhandled signal would.
 * - The `require.main === module` entry-point guard, which is how one CommonJS
 *   file can be both a runnable program (`node server.js`) and an importable
 *   module (`require('./server')`) without the import starting a server.
 *
 * @module server
 * @returns {import('http').Server} Through its startServer() function: the
 *   listening HTTP server, with SIGTERM and SIGINT handlers already registered.
 * @example
 * // What `npm start` does, spelled out:
 * const { startServer, readConfig } = require('./server');
 * const server = startServer(readConfig());
 * // Server listening on http://localhost:3002
 * // Try: curl http://localhost:3002/hello
 *
 * // What a test does, asking the OS for any free port. startServer() returns
 * // before the bind has completed, and address() is null until the 'listening'
 * // event fires, so wait for the event before reading the port:
 * const ephemeral = startServer({ host: '127.0.0.1', port: 0 });
 * ephemeral.once('listening', () => {
 *   console.log(ephemeral.address().port); // e.g. 39451
 * });
 */

const { createApp } = require('./app');

// Node's own address parser. The HOST policy below uses it to tell a canonical
// IPv6 wildcard (`::`) from a different spelling of the same all-zero address
// (`::0`), which is a distinction no regular expression should be asked to make.
const net = require('node:net');

/**
 * Network interface the server binds when HOST is not set.
 *
 * Educational Note: `localhost` resolves to the loopback interface, so an
 * unconfigured tutorial server is reachable from this machine and from nowhere
 * else — the safe default for code a learner runs on a laptop. This follows the
 * direct-development convention the repository's existing environment template
 * documents: the `HOST` entry in `src/backend/.env.example` defaults to
 * `localhost` for local development and reserves `0.0.0.0` for container
 * deployment. The sibling Python module `src/backend/wsgi.py` defaults its own
 * `HOST` lookup to `0.0.0.0` because a containerized process must accept traffic
 * on every interface to be reachable at all; that is the container convention,
 * not this one.
 *
 * @constant {string}
 */
const DEFAULT_HOST = 'localhost';

/**
 * The only two HOST values that opt this server into binding every interface.
 *
 * Educational Note: `0.0.0.0` is the IPv4 wildcard address and `::` is its IPv6
 * counterpart; binding either makes the server reachable from every network the
 * machine is on. That is a legitimate, documented choice — the `HOST` entry in
 * the repository's existing `src/backend/.env.example` template reserves
 * `0.0.0.0` for container deployment — so both spellings are honoured. What is
 * NOT honoured is the same exposure by accident: the operating system's
 * resolver also accepts `0`, `00`, `0x0` and `::0` as the all-zero address,
 * measured binding 0.0.0.0 and :: on this machine, and a value that short is
 * far likelier to be a typo than a decision. resolveHost() below requires one
 * of these two spellings before it will hand listen() a wildcard.
 *
 * @constant {string[]}
 */
const CANONICAL_WILDCARD_HOSTS = ['0.0.0.0', '::'];

/**
 * TCP port the server binds when PORT is not set.
 *
 * Educational Note: 3002 rather than the more familiar 3000, because 3000 is not
 * free in this repository: the development service in
 * `infrastructure/docker/docker-compose.yml` publishes it on the host through its
 * `ports` mapping, and `infrastructure/docker/Dockerfile` sets `ENV PORT=3000`
 * and exposes it, so binding it would fail for anyone running `docker compose
 * up`. 3001, 5678 and 8000 are taken by the same stack — 8000 is the fallback of
 * the `PORT` lookup in `src/backend/wsgi.py`. 3002 collides with none of them and
 * stays close enough to be recognizable.
 *
 * @constant {number}
 */
const DEFAULT_PORT = 3002;

/**
 * Lowest port this server will bind on request.
 *
 * Educational Note: ports below 1024 are privileged — binding one requires
 * elevated permissions on every POSIX system — so a tutorial has no business
 * asking for one. `.env.example` has always documented the 1024-65535 range;
 * parsePort() below is what makes that documentation true rather than merely
 * hopeful. Measured before the check existed: `PORT=0x50` bound privileged port
 * 80, because Number('0x50') is 80.
 *
 * @constant {number}
 */
const MIN_PORT = 1024;

/**
 * Highest port this server will bind, being the largest a 16-bit TCP port field
 * can express. Measured before the check existed: `PORT=65536` reached listen()
 * and threw ERR_SOCKET_BAD_PORT synchronously, with an uncaught stack trace in
 * place of a usable message.
 *
 * @constant {number}
 */
const MAX_PORT = 65535;

/**
 * A base-10 integer and nothing else — the whole of the PORT syntax check, and
 * deliberately stricter than Number(), which accepts '-1', '1.5', '0x50', '1e3'
 * and ' 80 '. None of those is how anyone means to write a port number.
 *
 * @constant {RegExp}
 */
const DECIMAL_INTEGER = /^\d+$/;

/**
 * Legacy all-zero IPv4 spellings: `0`, `00`, `0x0`, `0.0`, `0.0.0`, `0.0.0.0`.
 * getaddrinfo(3) zero-fills a bare or partial numeric address, which is why
 * `HOST=0` resolves to the wildcard rather than failing. Each dot-separated part
 * must itself be all zeros, in decimal or as a hexadecimal literal.
 *
 * @constant {RegExp}
 */
const ALL_ZERO_IPV4 = /^(?:0+|0[xX]0+)(?:\.(?:0+|0[xX]0+)){0,3}$/;

/**
 * How many 16-bit groups an IPv6 address has. Used to expand a compressed
 * literal back to its full form before it is compared against an address.
 *
 * @constant {number}
 */
const HEXTET_COUNT = 8;

/**
 * The IPv4-mapped unspecified address, `::ffff:0.0.0.0`, as hextets.
 *
 * Educational Note: this is a second wildcard hiding behind IPv6 notation, and
 * it is not obvious from the text. Measured on this machine: a socket bound to
 * `::ffff:0.0.0.0` accepted a connection to the host's own routable address
 * 10.76.2.176, so it listens on every IPv4 interface exactly as `0.0.0.0`
 * does. `::ffff:0:0` is the same address written differently and binds the
 * same way, which is why the comparison is made on hextets rather than text.
 *
 * @constant {number[]}
 */
const V4_MAPPED_UNSPECIFIED = [0, 0, 0, 0, 0, 0xffff, 0, 0];

/** C0 and C1 control characters, none of which may reach a log line verbatim.
 * @constant {RegExp} */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

/** Every character an error-code token may NOT contain.
 * @constant {RegExp} */
const NON_CODE_CHARACTERS = /[^A-Z0-9_]/g;

/** Longest operator-controlled field a log line carries, being the maximum
 * length of a DNS name (RFC 1035 §2.3.4): a legitimate hostname never reaches
 * it, and an absurd value cannot flood the log.
 * @constant {number} */
const LOG_FIELD_LIMIT = 253;

/** Longest error-code token a startup diagnostic carries. Node's own codes are
 * far shorter; the cap bounds the line whatever arrives.
 * @constant {number} */
const ERROR_CODE_LIMIT = 32;

/**
 * The termination signals this server handles.
 *
 * Educational Note: SIGTERM is what a process manager, a container runtime or
 * `kill` sends to ask a process to stop; SIGINT is what Ctrl-C sends. Both mean
 * "please finish and exit", so both get the same graceful treatment, registered
 * from this one list below. Only these two are handled: the signal registration
 * in the Python sibling `src/backend/wsgi.py` also traps SIGUSR1 and SIGUSR2 for
 * advanced process management, which a tutorial does not need.
 *
 * @constant {string[]}
 */
const TERMINATION_SIGNALS = ['SIGTERM', 'SIGINT'];

/**
 * Renders an operator-controlled value safe to place in a single log line.
 *
 * Educational Focus: A log line is data a human — or a script watching for the
 * startup banner — reads and trusts, and the structure of a log is its line
 * breaks. HOST arrives from the environment, so it can hold anything at all,
 * and a value holding a newline ends one line early and begins a second that
 * looks exactly as authentic as the rest of the log. Measured before this
 * function existed: `HOST=$'127.0.0.1\nServer listening on
 * http://attacker.invalid:443'` made the startup-failure report print that
 * forged banner line as a line of its own. Escaping every control character
 * keeps the value fully visible while keeping the line singular.
 *
 * Key Learning Concepts:
 * - Log injection (CWE-117) is the same class of defect as SQL injection: data
 *   the reader ends up interpreting as structure.
 * - Escaping beats stripping, because `\x0a` still shows a reader what was set
 *   where a silently deleted byte shows nothing, and bounding the length stops
 *   one absurd value from flooding the log.
 *
 * @param {*} value Value to render. Stringified first, so a number is fine.
 * @returns {string} One line, free of control characters, at most
 *   LOG_FIELD_LIMIT characters long.
 * @example
 * sanitizeForLog('127.0.0.1');     // '127.0.0.1'   (ordinary values pass through)
 * sanitizeForLog('host\nforged');  // 'host\\x0aforged'
 */
function sanitizeForLog(value) {
  return String(value)
    .replace(
      CONTROL_CHARACTERS,
      (character) => `\\x${character.charCodeAt(0).toString(16).padStart(2, '0')}`
    )
    .slice(0, LOG_FIELD_LIMIT);
}

/**
 * Reports one environment value this server refused, and what it used instead.
 *
 * Educational Note: a configuration value ignored in silence is the worst of
 * both worlds — the operator sees the default running and has no way to know
 * their override was rejected. One line naming the variable, the sanitized
 * value, the reason and the substitute is the whole remedy. It goes to stderr
 * rather than stdout so that it never lands in the stream a reader or a script
 * scans for the two-line startup banner.
 *
 * @param {string} name Variable that was refused, 'HOST' or 'PORT'.
 * @param {string} rawValue The value as it arrived from the environment.
 * @param {string|number} fallback The documented default used in its place.
 * @param {string} reason Why the value was refused, as a clause.
 * @returns {void}
 * @example
 * warnRefusedValue('PORT', '65536', 3002, 'outside the range');
 * // Ignoring PORT=65536: outside the range. Using the default PORT=3002 instead.
 */
function warnRefusedValue(name, rawValue, fallback, reason) {
  console.error(
    `Ignoring ${name}=${sanitizeForLog(rawValue)}: ${reason}. Using the default ${name}=${fallback} instead.`
  );
}

/**
 * Resolves one PORT value against the range `.env.example` documents.
 *
 * Educational Focus: Why a configuration reader validates rather than coerces.
 * The obvious one-liner, `Number(env.PORT) || DEFAULT_PORT`, only catches the
 * values that coerce to something falsy; everything else it hands straight to
 * listen(). Measured on that form: `PORT=65536`, `PORT=-1` and `PORT=1.5` each
 * threw ERR_SOCKET_BAD_PORT out of listen() synchronously — before the callback
 * that handles startup errors could run — so a single mistyped environment
 * variable crashed the process with an uncaught stack trace, while `PORT=0x50`
 * quietly bound privileged port 80 instead. Parsing the value against the
 * documented policy first turns both outcomes into a running server on a known
 * port and one line explaining what was ignored.
 *
 * Key Learning Concepts:
 * - Validate at the boundary. This is the one place an operator's string
 *   becomes a number, so it is the one place the policy belongs.
 * - "Accept a canonical form" is a stronger rule than "reject known-bad
 *   values", because the canonical form is a closed set and the bad values are
 *   not: /^\d+$/ needs no clause for hexadecimal, exponents, signs or spaces.
 * - Absent and invalid are different. Unset, empty and zero are documented as
 *   absent and resolve silently; anything else that fails the policy is a
 *   refusal, and a refusal is reported.
 *
 * @param {*} rawPort PORT as read from the environment, normally a string.
 * @returns {number} A port in [MIN_PORT, MAX_PORT], or DEFAULT_PORT.
 * @example
 * parsePort('4010');    // 4010
 * parsePort(undefined); // 3002 — absent, silent
 * parsePort('0');       // 3002 — a zero is documented as absent, not ephemeral
 * parsePort('80');      // 3002 — privileged, refused with one line on stderr
 * parsePort('65536');   // 3002 — above the 16-bit range, refused the same way
 */
function parsePort(rawPort) {
  const candidate = String(rawPort ?? '').trim();

  // Absent: PORT unset, or set to nothing. Silent, because running a tutorial
  // without configuring it is the normal case rather than a mistake.
  if (candidate === '') {
    return DEFAULT_PORT;
  }

  // A port is a base-10 integer or it is not a port.
  if (!DECIMAL_INTEGER.test(candidate)) {
    warnRefusedValue('PORT', candidate, DEFAULT_PORT, 'not a base-10 integer');

    return DEFAULT_PORT;
  }

  const port = Number(candidate);

  // Zero is documented as "absent", not as "any free port": an ephemeral port
  // is a testing affordance reached by calling startServer({ port: 0 })
  // directly, never through the environment. Silent for the same reason the
  // empty case is silent — `.env.example` states this as the rule.
  if (port === 0) {
    return DEFAULT_PORT;
  }

  if (port < MIN_PORT || port > MAX_PORT) {
    warnRefusedValue(
      'PORT',
      candidate,
      DEFAULT_PORT,
      `outside the non-privileged range ${MIN_PORT}-${MAX_PORT}`
    );

    return DEFAULT_PORT;
  }

  return port;
}

/**
 * Expands an IPv6 literal into its eight 16-bit groups.
 *
 * Educational Focus: Why an exposure policy cannot be written against the TEXT
 * of an address. One IPv6 address has many spellings: `::` compresses a run of
 * zero groups, a trailing `0.0.0.0` writes the last two groups in IPv4 dotted
 * form, and a `%zone` suffix names an interface without changing the address at
 * all. So `::`, `::0`, `0:0:0:0:0:0:0:0`, `::0.0.0.0`, `0::0.0.0.0`,
 * `0:0:0:0:0:0:0.0.0.0` and `::%eth0` are one address written seven ways — each
 * measured binding the IPv6 wildcard on this machine. Comparing the expanded
 * groups answers the question the policy actually asks: which address is this,
 * whatever it looks like.
 *
 * Key Learning Concepts:
 * - Normalize, then decide. A decision made on unnormalized input is a decision
 *   about one spelling of the input.
 * - The zone index is metadata, not address: `::%eth0` binds the same wildcard
 *   as `::`, so it is dropped before parsing.
 * - `parseInt(group, 16)` is the whole of hextet parsing, and the dotted tail
 *   becomes two hextets: `a.b.c.d` is `(a << 8) | b` then `(c << 8) | d`.
 *
 * @param {string} address A literal already confirmed valid by net.isIPv6().
 * @returns {number[]} Exactly HEXTET_COUNT groups, zeros filled in for `::`.
 * @example
 * toHextets('::');               // [0, 0, 0, 0, 0, 0, 0, 0]
 * toHextets('::ffff:0.0.0.0');   // [0, 0, 0, 0, 0, 65535, 0, 0]
 * toHextets('::1');              // [0, 0, 0, 0, 0, 0, 0, 1]
 */
function toHextets(address) {
  // The zone index, if any, names an interface rather than an address.
  const [literal] = address.split('%');

  // At most one '::' may appear, so this yields the groups before it and the
  // groups after it; the gap between them is the compressed run of zeros.
  const [head, tail] = literal.split('::');

  const expand = (text) => {
    if (text === undefined || text === '') {
      return [];
    }

    const groups = text.split(':');
    const last = groups[groups.length - 1];

    if (!last.includes('.')) {
      return groups.map((group) => parseInt(group, 16));
    }

    // A dotted IPv4 tail occupies the final two hextets.
    const octets = last.split('.').map(Number);

    return [
      ...groups.slice(0, -1).map((group) => parseInt(group, 16)),
      (octets[0] << 8) | octets[1],
      (octets[2] << 8) | octets[3]
    ];
  };

  const leading = expand(head);
  const trailing = expand(tail);

  return [
    ...leading,
    ...new Array(HEXTET_COUNT - leading.length - trailing.length).fill(0),
    ...trailing
  ];
}

/**
 * Reports whether a host denotes a wildcard address in some spelling other than
 * one of the two canonical ones.
 *
 * Educational Note: three families of spelling have to be covered, and each was
 * established by binding a real socket and reading back server.address(). A
 * valid IPv4 literal is compared octet by octet. A valid IPv6 literal is
 * expanded to hextets and compared against both the unspecified address and its
 * IPv4-mapped form, which is a wildcard too. And a string that is NOT a valid
 * literal can still be an address to getaddrinfo(3), which zero-fills a bare or
 * partial numeric form — `0`, `00`, `0x0`, `0.0`, `000.000.000.000` and
 * `0x0.0x0.0x0.0x0` each bound 0.0.0.0 — so those keep a pattern test of their
 * own. Anything else is left alone: `0:0` and `0b0` are not addresses at all,
 * the resolver rejects them, and the startup diagnostic reports the failure.
 *
 * @param {string} host Trimmed, non-empty host candidate.
 * @returns {boolean} True when binding this host would bind every interface.
 * @example
 * isWildcardAlias('0');                // true  — getaddrinfo zero-fills it
 * isWildcardAlias('::0.0.0.0');         // true  — the unspecified address
 * isWildcardAlias('::ffff:0:0');        // true  — every IPv4 interface
 * isWildcardAlias('::ffff:192.168.1.5') // false — one specific address
 * isWildcardAlias('0:0');               // false — not an address in any family
 */
function isWildcardAlias(host) {
  if (net.isIPv4(host)) {
    return host.split('.').every((octet) => Number(octet) === 0);
  }

  if (net.isIPv6(host)) {
    const hextets = toHextets(host);

    return (
      hextets.every((hextet) => hextet === 0) ||
      hextets.every((hextet, index) => hextet === V4_MAPPED_UNSPECIFIED[index])
    );
  }

  return ALL_ZERO_IPV4.test(host);
}

/**
 * Resolves one HOST value against the documented exposure policy.
 *
 * Educational Focus: The one decision in this project with a blast radius
 * beyond the machine it runs on. Which interfaces a server binds decides who
 * can reach it, so the policy here is that the safe outcome is the default and
 * the exposed outcome is a deliberate, canonical opt-in: `HOST=0.0.0.0` or
 * `HOST=::` binds every interface and is honoured exactly as documented, while
 * an ambiguous spelling of the same address falls back to loopback with one
 * line saying so. Nothing else is filtered — a hostname or an IP literal is
 * passed through untouched, because the operator's network is their business.
 *
 * Key Learning Concepts:
 * - Fail safe, not open: when a value cannot be read confidently, the fallback
 *   is the narrower exposure rather than the wider one.
 * - An opt-in is only an opt-in if it cannot be arrived at by accident. Before
 *   this check, `HOST=0` bound every interface exactly as `HOST=0.0.0.0` does,
 *   so the documented "explicit wildcard" was not in fact required.
 * - Refusing a value is not the same as validating it. A hostname's validity is
 *   the resolver's question, and this function does not try to answer it.
 *
 * @param {*} rawHost HOST as read from the environment, normally a string.
 * @returns {string} The interface to bind: the value as given, or DEFAULT_HOST.
 * @example
 * resolveHost(undefined);   // 'localhost' — absent, silent
 * resolveHost('0.0.0.0');   // '0.0.0.0'   — canonical IPv4 wildcard, honoured
 * resolveHost('::');        // '::'        — canonical IPv6 wildcard, honoured
 * resolveHost('0');         // 'localhost' — ambiguous wildcard alias, refused
 * resolveHost('10.0.0.7');  // '10.0.0.7'  — passed through untouched
 */
function resolveHost(rawHost) {
  const candidate = String(rawHost ?? '').trim();

  // Absent: HOST unset, or set to nothing. Loopback only, which is the safe
  // default for code a learner runs on a laptop.
  if (candidate === '') {
    return DEFAULT_HOST;
  }

  // The deliberate opt-in, honoured as documented: both of these bind every
  // interface, which is what a container deployment needs.
  if (CANONICAL_WILDCARD_HOSTS.includes(candidate)) {
    return candidate;
  }

  // The same exposure reached by accident is not honoured.
  if (isWildcardAlias(candidate)) {
    warnRefusedValue(
      'HOST',
      candidate,
      DEFAULT_HOST,
      `an ambiguous spelling of the wildcard address (set HOST=${CANONICAL_WILDCARD_HOSTS.join(' or HOST=')} to bind every interface deliberately)`
    );

    return DEFAULT_HOST;
  }

  // Everything else — a hostname, an IPv4 or IPv6 literal, anything the
  // resolver will have an opinion about — is passed through untouched.
  return candidate;
}

/**
 * Resolves the server's listening configuration from an environment.
 *
 * Educational Focus: Configuration resolution is kept in its own function,
 * separate from the act of binding a socket, and it is a function of its
 * argument alone: the only thing it does besides returning a value is write one
 * line to stderr for a value it refused. Because the environment arrives as a
 * defaulted parameter rather than being read from the global `process.env`
 * inside the body, a test can call readConfig({ PORT: '4010' }) and assert the
 * result without mutating the environment of the whole test process — and every
 * branch of both policies stays reachable, which is what keeps this module at
 * full branch coverage.
 *
 * Key Learning Concepts:
 * - Default parameter values (`env = process.env`) let one function serve both
 *   the real caller and the test caller.
 * - Environment variables are always strings, and a string is not a port or an
 *   interface until something has checked it. parsePort() and resolveHost()
 *   own those two checks; this function owns only which variables are read.
 * - The two policies are deliberately asymmetric. A PORT outside the documented
 *   1024-65535 range is refused because it cannot work or should not be asked
 *   for, while a HOST is refused only when accepting it would silently widen
 *   the server's exposure. Everything else about a host is the resolver's
 *   business, not this reader's.
 *
 * @param {Object<string, string|undefined>} [env=process.env] Environment to read
 *   HOST and PORT from. Defaults to this process's own environment.
 * @returns {{host: string, port: number}} The host and port to bind. An unset,
 *   empty or refused value is replaced by its documented default, so the result
 *   is always a port in [MIN_PORT, MAX_PORT] and a host that only binds every
 *   interface when one of the canonical wildcard spellings asked for it.
 * @example
 * readConfig({});                              // { host: 'localhost', port: 3002 }
 * readConfig({ HOST: '0.0.0.0' });             // { host: '0.0.0.0',  port: 3002 }
 * readConfig({ PORT: '4010' });                // { host: 'localhost', port: 4010 }
 * readConfig({ HOST: '0', PORT: '65536' });    // { host: 'localhost', port: 3002 }
 * readConfig();                                // reads process.env
 */
function readConfig(env = process.env) {
  // These two variables are the entire configuration surface of this server.
  // Nothing else is read — no NODE_ENV, no LOG_LEVEL, no .env file (there is no
  // dotenv dependency; `.env.example` documents these two variables for a human,
  // it is not parsed by this module).
  return {
    host: resolveHost(env.HOST),
    port: parsePort(env.PORT)
  };
}

/**
 * Reduces a startup failure to the one bounded token a diagnostic may carry.
 *
 * Educational Focus: What NOT to log. An Error is generous with detail that
 * helps a developer at a keyboard and helps an attacker reading a log just as
 * much: `stack` names absolute paths inside this checkout and inside
 * node_modules, which discloses where the code lives and which version of which
 * framework produced the frame. Measured on the raw form this replaced, a failed
 * bind printed four stack frames plus errno, syscall, address and port. The
 * `code` alone — EADDRINUSE, EACCES, ENOTFOUND — is the part that tells an
 * operator what to do, and by convention it is a short uppercase token.
 *
 * Key Learning Concepts:
 * - Error-information disclosure (CWE-209) is about what reaches the reader,
 *   not about whether the error was handled at all.
 * - Allowlisting CHARACTERS rather than values keeps the guarantee total:
 *   whatever the code turns out to be, only A-Z, 0-9 and _ can reach the line,
 *   at most ERROR_CODE_LIMIT of them, so the failure line has a fixed shape a
 *   test can assert exactly.
 *
 * @param {Error & {code?: string}} error The error listen() reported.
 * @returns {string} The bounded code token, e.g. 'EADDRINUSE'.
 * @example
 * describeStartupError(Object.assign(new Error('...'), { code: 'EACCES' })); // 'EACCES'
 */
function describeStartupError(error) {
  return String(error.code)
    .toUpperCase()
    .replace(NON_CODE_CHARACTERS, '_')
    .slice(0, ERROR_CODE_LIMIT);
}

/**
 * Binds the application to a socket and registers graceful-termination handlers.
 *
 * Educational Focus: The idiomatic Express listening pattern in one function —
 * build the app with the factory, call listen(port, host, callback), and KEEP the
 * returned http.Server. Keeping it matters: the server object is the only handle
 * through which the socket can later be closed, and it is also the only place
 * that knows which port was really bound. The banner is therefore logged from
 * inside the listen callback, in the invocation form that reports a successful
 * bind, and reads its port from server.address().
 *
 * Key Learning Concepts:
 * - app.listen() is a thin wrapper over http.createServer(app).listen(); the
 *   value it returns is a Node http.Server, not an Express application.
 * - The callback has two possible invocation forms and runs once: with no
 *   argument after a successful bind, or with the bind error after a failure.
 *   Only the first form describes a socket that exists, which is why the banner
 *   is printed from the no-argument form and why nothing on the failure path
 *   reads an address.
 * - server.address().port is the bound port. With port 0 the operating system
 *   chooses a free one, and only the bound value is callable.
 * - Express 5 supplies this callback with either no argument, once the socket is
 *   listening, or the bind error if the bind failed; a plain Node http listen
 *   callback receives no error at all, which is why an Express one takes the
 *   parameter. Branch on that argument before reading server.address(), which is
 *   null whenever the bind failed.
 * - The config reaching listen() has already been through the two policies in
 *   readConfig(), so the port is known to be in range and the host binds every
 *   interface only if one of the canonical wildcard spellings asked for it. An
 *   operator who sets HOST=0.0.0.0 or HOST=:: still binds every interface — the
 *   repository's own template documents that as legitimate for container
 *   deployment — so the default remains the safe one and the exposure remains
 *   the operator's call, spelled out rather than stumbled into.
 * - Signal handlers are registered here rather than at module scope, so merely
 *   importing this module never installs process-wide handlers.
 *
 * @param {{host: string, port: number}} config Host and port to bind, normally
 *   produced by readConfig(). A port of 0 asks the OS for any free port.
 * @returns {import('http').Server} The HTTP server, returned before the socket
 *   has finished binding. By the time the callback above has run it is either
 *   listening, with the banner printed, or the bind has failed — and in that
 *   case one sanitized line naming the requested address and the failure's code
 *   has been written to stderr, the process's exit status has been set to 1, and
 *   this server's address() is null.
 * @example
 * const server = startServer({ host: 'localhost', port: 3002 });
 * // Server listening on http://localhost:3002
 * // Try: curl http://localhost:3002/hello
 */
function startServer(config) {
  const server = createApp().listen(config.port, config.host, (error) => {
    // The host as it may appear in a log line: HOST is operator-controlled, so
    // every one of the three lines below interpolates the sanitized form rather
    // than the raw value. An ordinary host is unchanged by this, which is why
    // the banner still reads exactly as documented.
    const loggableHost = sanitizeForLog(config.host);

    if (error) {
      // stderr, not stdout: a startup failure must not land in the same stream a
      // reader — or a script — scans for the success banner. ONE line, carrying
      // only what is safe to print: the address that was requested, escaped, and
      // the failure's bounded code token. The Error object itself is deliberately
      // NOT passed as a second argument — console.error would print its stack,
      // and a stack names absolute paths inside this checkout and inside
      // node_modules, which tells a reader of the log where the code lives. The
      // cause survives regardless, because `code` (EADDRINUSE, EACCES,
      // ENOTFOUND) is the part that says what to do about it. Nothing reads
      // server.address() on this path, because there is no address to read.
      console.error(
        `Failed to start server on http://${loggableHost}:${sanitizeForLog(config.port)} (${describeStartupError(error)})`
      );

      // Non-zero, because the exit status is the only thing `npm start`, a CI
      // step or a process manager can read about an outcome they did not watch
      // happen: exiting 0 here would report success for a server that never
      // bound, leaving any failure-sensitive policy — a CI job that fails the
      // build, a supervisor configured to restart only on error — with nothing
      // to act on. It is SET rather than forced, and that distinction is the
      // point: process.exit() tears the process down immediately, while a write
      // to stderr is asynchronous whenever stderr is a pipe, so forcing the exit
      // here can discard the very diagnostic above. Assigning exitCode lets the
      // event loop drain and the process end on its own — measured at 105ms for
      // a failed bind, status 1, diagnostic intact — because a server that never
      // bound holds no handle and a signal listener does not keep Node alive.
      process.exitCode = 1;
    } else {
      // Read the port back from the socket instead of trusting config.port: these
      // agree for an ordinary port and differ for port 0, where the requested
      // value would print as "http://localhost:0" and be useless to a client.
      const boundPort = server.address().port;

      console.log(`Server listening on http://${loggableHost}:${boundPort}`);
      console.log(`Try: curl http://${loggableHost}:${boundPort}/hello`);
    }
  });

  // One loop, one handler shape, for every signal that means "stop". Each
  // handler forwards the signal's own name so the shutdown log says which one
  // arrived, and does nothing else itself — the closing logic lives in exactly
  // one place below.
  TERMINATION_SIGNALS.forEach((signal) => {
    process.on(signal, () => closeServer(server, signal));
  });

  return server;
}

/**
 * Shuts the server down gracefully in response to a termination signal.
 *
 * Educational Focus: What "graceful" actually means. server.close() stops the
 * server accepting NEW connections and then waits for the responses already in
 * flight to finish; its callback runs only once the last one has. A process that
 * instead exited the moment the signal arrived would cut those responses off
 * mid-body, and the client would see a truncated read rather than an answer.
 *
 * Key Learning Concepts:
 * - Closing a listening socket is asynchronous, so completion is reported through
 *   a callback rather than by the function returning.
 * - The signal name is passed in rather than inferred, which keeps this function
 *   independent of how it was triggered — a signal handler, or a test calling it
 *   directly.
 * - Both log lines go through plain console.log. There is no logging library and
 *   no wrapper around it, which is what lets the test suite replace console.log
 *   with a spy and assert the exact shutdown output.
 *
 * @param {import('http').Server} server The listening server to close, as
 *   returned by startServer().
 * @param {string} signal Name of the signal that triggered the shutdown, e.g.
 *   'SIGTERM' or 'SIGINT'. Reported verbatim in the first log line.
 * @returns {void} Nothing; completion is announced from the close callback.
 * @example
 * closeServer(server, 'SIGTERM');
 * // SIGTERM received: closing server...
 * // Server closed. Goodbye!
 */
function closeServer(server, signal) {
  console.log(`${signal} received: closing server...`);

  server.close(() => {
    console.log('Server closed. Goodbye!');

    // Exiting explicitly keeps shutdown prompt and deterministic if an unrelated
    // handle is still open — a timer, an idle keep-alive socket — which would
    // otherwise hold the process open past the point where its work is done, and
    // status 0 reports an orderly requested shutdown rather than a failure. It is
    // not required merely to close this server: closing the last listening socket
    // already leaves the event loop with nothing to do.
    process.exit(0);
  });
}

// The export shape is a contract: `test/unit/server.test.js` requires exactly
// these five names, and nothing outside this list is part of the module's API.
module.exports = { startServer, closeServer, readConfig, DEFAULT_HOST, DEFAULT_PORT };

// Entry-point guard. `require.main` is the module Node was started with, so this
// comparison is true only for `node server.js` (what `npm start` runs) and false
// when some other file requires this one — which is why importing this module in
// a test binds no socket. It is excluded from coverage deliberately: a test runs
// inside Jest, where `require.main` is Jest's own entry file, so the true branch
// cannot be exercised from within the test process at all. Marking the statement
// ignored keeps the coverage report honest about what the tests really reach
// instead of leaving a permanently red line in it.
/* istanbul ignore next */
if (require.main === module) {
  startServer(readConfig());
}
