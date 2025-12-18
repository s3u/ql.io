/**
 * Jest configuration for API integration tests
 */

module.exports = {
  displayName: 'API Integration Tests',
  rootDir: '../..',
  testMatch: [
    '<rootDir>/test/integration/api-integration-simple.test.js',
    '<rootDir>/test/integration/comprehensive-api.test.js'
  ],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/test/integration/api-setup.js'],
  verbose: true,
  collectCoverage: false,
  testEnvironment: 'node',
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true
};