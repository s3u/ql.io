// Jest setup for console module tests
// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console output during tests unless debugging
if (!process.env.DEBUG_TESTS) {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };
}