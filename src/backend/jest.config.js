/**
 * Jest Configuration for Node.js Tutorial Application
 * 
 * This configuration file sets up Jest v29.7.0 for comprehensive testing
 * of the Express.js /hello endpoint with educational-focused settings
 * and 100% code coverage requirements suitable for the simple tutorial codebase.
 * 
 * Key Features:
 * - Node.js test environment for server-side testing
 * - Comprehensive coverage collection and reporting
 * - Educational-friendly verbose output
 * - Integration with Supertest v7.1.1 for HTTP endpoint testing
 * - CI/CD pipeline compatibility
 */

module.exports = {
  // Test Environment Configuration
  // Uses Node.js environment instead of browser environment for backend testing
  // This enables testing of HTTP servers and Node.js-specific APIs
  testEnvironment: 'node',

  // Code Coverage Collection Configuration
  // Specifies which files to include in coverage analysis
  // Excludes configuration files and external dependencies
  collectCoverageFrom: [
    '*.js',                    // Include all JavaScript files in root
    '!jest.config.js',         // Exclude Jest configuration file
    '!coverage/**',            // Exclude coverage output directory
    '!node_modules/**'         // Exclude external dependencies
  ],

  // Coverage Threshold Configuration
  // Sets 100% coverage requirements for all metrics due to simple educational codebase
  // High coverage standards are achievable and demonstrate quality practices
  coverageThreshold: {
    global: {
      branches: 100,           // 100% branch coverage - all code paths tested
      functions: 100,          // 100% function coverage - all functions called
      lines: 100,              // 100% line coverage - all lines executed
      statements: 100          // 100% statement coverage - all statements reached
    }
  },

  // Test File Pattern Configuration
  // Defines how Jest identifies test files using standard naming conventions
  // Supports both .test.js and .spec.js extensions for flexibility
  testMatch: [
    '**/tests/**/*.test.js',   // Test files in tests directory with .test.js extension
    '**/tests/**/*.spec.js'    // Test files in tests directory with .spec.js extension
  ],

  // Coverage Output Configuration
  // Specifies directory for coverage reports and multiple output formats
  coverageDirectory: 'coverage',

  // Coverage Reporter Configuration
  // Multiple reporters provide different visualization and integration options
  coverageReporters: [
    'text',                    // Console text output for immediate feedback
    'lcov',                    // LCOV format for CI/CD integration
    'html',                    // HTML reports for detailed browser viewing
    'json'                     // JSON format for programmatic analysis
  ],

  // Test Execution Configuration
  // Sets timeout and output preferences for educational use
  testTimeout: 10000,          // 10 second timeout allows for server startup and HTTP requests
  verbose: true,               // Verbose output shows individual test results for learning visibility
  collectCoverage: false,      // Coverage collection disabled by default for faster development testing

  // Coverage Path Ignore Patterns
  // Excludes non-source files from coverage analysis to focus on application code
  coveragePathIgnorePatterns: [
    '/node_modules/',          // Exclude external dependencies
    '/coverage/',              // Exclude coverage output files
    'jest.config.js'           // Exclude Jest configuration file
  ],

  // Test Setup and Teardown Configuration
  // No additional setup files required for simple tutorial application
  setupFiles: [],
  setupFilesAfterEnv: [],

  // Module Resolution Configuration
  // Uses default Node.js module resolution for simplicity
  moduleFileExtensions: ['js', 'json'],
  
  // Transform Configuration
  // No transformations needed since using native Node.js JavaScript
  transform: {},

  // Test Result Processor Configuration
  // Uses default Jest test result processing
  testResultsProcessor: undefined,

  // Watch Mode Configuration
  // Optimized for development workflow with file watching
  watchman: true,              // Use Watchman for efficient file watching if available
  watchPathIgnorePatterns: [
    '/node_modules/',          // Don't watch node_modules for changes
    '/coverage/'               // Don't watch coverage directory
  ],

  // Snapshot Configuration
  // Configure snapshot testing for future use cases
  updateSnapshot: false,       // Don't automatically update snapshots
  
  // Error Handling Configuration
  // Configure how Jest handles errors and unhandled promises
  errorOnDeprecated: true,     // Fail tests on deprecated API usage
  
  // Performance Configuration
  // Optimize Jest performance for the simple application
  maxWorkers: '50%',           // Use 50% of available CPU cores
  cache: true,                 // Enable Jest cache for faster subsequent runs
  cacheDirectory: '<rootDir>/.jest-cache',

  // Bail Configuration
  // Continue running all tests even if some fail (educational benefit)
  bail: false,                 // Run all tests to see complete test results

  // Clear Mocks Configuration
  // Automatically clear mock calls between tests
  clearMocks: true,            // Clear mock calls and instances between tests
  resetMocks: false,           // Don't reset mock implementations
  restoreMocks: false,         // Don't restore original implementations

  // Global Configuration
  // No global variables needed for simple tutorial application
  globals: {},

  // Test Environment Options
  // Additional options for Node.js test environment
  testEnvironmentOptions: {},

  // Extensions to Treat as ESM
  // All files are CommonJS for tutorial simplicity
  extensionsToTreatAsEsm: [],

  // Preset Configuration
  // No preset used - custom configuration for educational transparency
  preset: undefined,

  // Projects Configuration
  // Single project configuration - no multi-project setup needed
  projects: undefined,

  // Runner Configuration
  // Use default Jest runner
  runner: undefined,

  // Test Name Pattern Configuration
  // Run all tests by default
  testNamePattern: undefined,

  // Test Path Pattern Configuration
  // Run all test files by default
  testPathPattern: undefined,

  // Test Regex Configuration
  // Alternative to testMatch - using testMatch for clarity
  testRegex: undefined,

  // Timing Configuration
  // Show timing information for performance awareness
  showTiming: true,

  // Silent Configuration
  // Verbose output enabled for educational benefits
  silent: false,

  // Force Exit Configuration
  // Let Jest exit gracefully
  forceExit: false,

  // Detect Open Handles Configuration
  // Helpful for debugging resource cleanup in educational context
  detectOpenHandles: false,

  // Notify Configuration
  // Desktop notifications disabled for simplicity
  notify: false,

  // Pass with No Tests Configuration
  // Allow Jest to pass when no tests are found (useful during initial setup)
  passWithNoTests: true
};