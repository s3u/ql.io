module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: ['lib/**/*.js'],
  coverageDirectory: 'coverage',
  verbose: true,
  maxWorkers: 1, // Run tests serially to avoid port conflicts
  testTimeout: 15000 // Increase timeout for integration tests
};