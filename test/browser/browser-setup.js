/**
 * Browser test setup
 * Configures Jest and Playwright for browser testing
 */

// Increase timeout for browser tests
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

// Browser test utilities
global.browserTestUtils = {
  // Common selectors
  selectors: {
    queryInput: 'textarea, input[type="text"]',
    executeButton: 'button:has-text("Execute"), button:has-text("Run"), input[type="submit"]',
    clearButton: 'button:has-text("Clear"), button:has-text("Reset")',
    tablesLink: 'a:has-text("Tables"), button:has-text("Tables")',
    resultsContainer: 'pre, .results, .output, #results',
    loadingIndicator: '.loading, .spinner, [class*="load"]'
  },
  
  // Common test data
  testQueries: {
    simple: 'show tables',
    select: 'select id, title from jsonplaceholder.posts limit 1',
    selectAll: 'select * from jsonplaceholder.posts where id = 1',
    invalid: 'select * from nonexistent.table',
    long: 'select id, title, body, userId from jsonplaceholder.posts where id = 1 or id = 2 or id = 3 limit 10'
  },
  
  // Viewport sizes for responsive testing
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
    large: { width: 1920, height: 1080 }
  }
};

// Clean up any hanging processes
process.on('exit', () => {
  // Force cleanup
});

beforeAll(() => {
  console.log('Starting browser integration test suite...');
});

afterAll(() => {
  console.log('Browser integration test suite completed');
});