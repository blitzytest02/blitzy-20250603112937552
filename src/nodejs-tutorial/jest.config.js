// jest.config.js - Educational testing configuration
module.exports = {
  // Node.js testing environment for server-side code
  testEnvironment: 'node',

  // Coverage collection configuration for educational transparency
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/node_modules/**'
  ],

  // Educational coverage thresholds - aim for 100%, minimum 95%
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },

  // Test file patterns for clear organization
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],

  // Educational test reporting for learning visibility
  verbose: true,
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html']
};
