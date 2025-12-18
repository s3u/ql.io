/**
 * Jest configuration for browser-based integration tests
 */

module.exports = {
  displayName: 'Browser Integration Tests',
  rootDir: '../..',
  testMatch: ['<rootDir>/test/browser/browser-integration-simple.test.js'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/test/browser/browser-setup.js'],
  verbose: true,
  collectCoverage: false,
  testEnvironment: 'node',
  maxWorkers: 1, // Run browser tests sequentially to avoid conflicts
  forceExit: true,
  detectOpenHandles: true,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/test/browser/global-setup.js',
  globalTeardown: '<rootDir>/test/browser/global-teardown.js',
  
  // Transform configuration for modern JavaScript
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};