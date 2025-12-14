/**
 * Integration test setup
 * Configures Jest for integration testing
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test configuration
global.console = {
  ...console,
  // Suppress server logs during tests unless there's an error
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error
};

// Clean up any hanging processes
process.on('exit', () => {
  // Force cleanup
});

beforeAll(() => {
  console.log('Starting integration test suite...');
});

afterAll(() => {
  console.log('Integration test suite completed');
});