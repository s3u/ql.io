/**
 * API integration test setup
 */

jest.setTimeout(30000);

// Suppress server logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error
};

beforeAll(() => {
  console.log('Starting API integration test suite...');
});

afterAll(() => {
  console.log('API integration test suite completed');
});