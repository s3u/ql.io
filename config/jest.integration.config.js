module.exports = {
  displayName: 'Demo Integration Tests',
  rootDir: '..',
  testMatch: ['<rootDir>/demos/test/demo-integration.test.js'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/demos/test/integration-setup.js'],
  verbose: true,
  collectCoverage: false,
  testEnvironment: 'node',
  maxWorkers: 1, // Run integration tests sequentially to avoid port conflicts
  forceExit: true,
  detectOpenHandles: true
};