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
