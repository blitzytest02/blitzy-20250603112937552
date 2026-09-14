/**
 * Jest configuration for the hello-node tutorial project.
 *
 * Educational Focus:
 *   Shows how a Node project declares its test discovery and its coverage gate
 *   in one place, so `npm test` behaves identically for every learner.
 *
 * Key Learning Concepts:
 *   - testMatch accepts BOTH `*.test.js` and `*.spec.js` under test/, so unit and
 *     integration suites can use either extension without a config change.
 *   - coverageThreshold is the machine-enforced gate: branches 95, functions 100,
 *     lines 95, statements 95 (the values CONTRIBUTING.md:529-536 specifies).
 */
module.exports = {
  // Server-side code: no browser globals, no jsdom.
  testEnvironment: 'node',

  // Both extensions are collected; see CONTRIBUTING.md:539-542.
  testMatch: ['**/test/**/*.test.js', '**/test/**/*.spec.js'],

  // Coverage is always collected, and only from the two runtime modules.
  collectCoverage: true,
  collectCoverageFrom: ['app.js', 'server.js'],
  coverageReporters: ['text', 'lcov'],

  // Enforced minimum; 100% is the target the project actually reaches.
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
