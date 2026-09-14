module.exports = {
  // Node.js testing environment for server-side code
  testEnvironment: 'node',

  // Measured over src/app.js, src/routes/hello.js and src/server.js; the two
  // negations are defensive, since no test file or dependency lives under src/.
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/node_modules/**'
  ],

  // Aggregate gates, not per file: functions at 100%, the other three at 95%.
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },

  // Suites live under the singular test/ - test/unit and test/integration.
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],

  verbose: true,
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html']
};
