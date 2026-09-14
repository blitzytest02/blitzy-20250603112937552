/**
 * Jest configuration for the hello-node tutorial: it governs which test files are
 * discovered, which modules coverage is measured from, and the coverage gate that
 * `npm test`, `npm run test:coverage` and `npm run test:ci` all enforce.
 */
module.exports = {
  // Server-side code: no browser globals, no jsdom.
  testEnvironment: 'node',

  // Both extensions are collected (CONTRIBUTING.md:539-542), so either naming
  // convention works: a unit suite named *.test.js and an integration suite named
  // *.spec.js are each discovered with no change to this file.
  testMatch: ['**/test/**/*.test.js', '**/test/**/*.spec.js'],

  // Coverage is always collected, and only from the two runtime modules. They are
  // named exactly because this project has no src/ directory to glob.
  collectCoverage: true,
  collectCoverageFrom: ['app.js', 'server.js'],

  // 'text' prints the table in the terminal; 'lcov' writes coverage/lcov.info.
  coverageReporters: ['text', 'lcov'],

  // The machine-enforced gate, and the source of these four numbers is
  // CONTRIBUTING.md:529-536. The enforced minimum is 95/100/95/95 while both
  // modules actually achieve 100% on every metric, so the gate and the figure the
  // project reaches are deliberately different numbers.
  //
  // Reading the `branches` column honestly: app.js is branch-free by design — two
  // application settings and three unconditional registrations, no conditional
  // anywhere — so istanbul instruments no branch in it. Its coverage/lcov.info record
  // reports BRF:0 and BRH:0, and its 100% branch figure is a 0-of-0 result, expected
  // rather than an unexercised branch waiting to be found. Every branch this project
  // has lives in server.js, so the pooled floor below is enforced entirely against
  // real branches: running the app.js suite alone, which loads server.js for coverage
  // without exercising it, exits 1 with
  // `Jest: "global" coverage threshold for branches (95%) not met: 0%`. That is also
  // why the gate stays a single `global` block — a per-path entry for server.js would
  // make Jest subtract it from the global group, leaving the global branch floor
  // measuring app.js alone, a vacuous 0 of 0, while only repeating enforcement this
  // block already provides. A conditional is never added to app.js to make its figure
  // look earned: the only legitimate route to a non-vacuous branch total there is a
  // conditional the documented HTTP contract requires, with the test that covers it.
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },

  // Per-test reporting, so a learner sees which assertion covers which behaviour.
  verbose: true
};
