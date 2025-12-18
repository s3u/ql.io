# ql.io Integration Test Suite

Comprehensive testing strategy for ql.io covering HTTP APIs, WebSocket communication, and browser-based user interfaces.

## ✅ Current Status (December 2025)

**Integration tests are fully implemented and passing!**

- **API Integration Tests**: 46 tests passing - Core API functionality, advanced queries, error handling, performance testing
- **Browser Integration Tests**: 13 tests passing - Console UI, user interactions, cross-browser compatibility, accessibility
- **Test Infrastructure**: Complete with Playwright setup, server lifecycle management, and parallel execution
- **All Dependencies**: Installed and configured (Playwright browsers, WebSocket support, etc.)

**Quick Start**:
```bash
# Run all integration tests
npm run test:integration:all

# API tests only (46 tests)
npm run test:integration:api

# Browser tests only (13 tests)  
npm run test:integration:browser
```

## Test Structure

```
test/
├── browser/                    # Browser-based integration tests
│   ├── browser-integration.test.js
│   ├── browser-setup.js
│   ├── jest.browser.config.js
│   ├── global-setup.js
│   └── global-teardown.js
├── integration/                # API integration tests
│   ├── api-integration.test.js
│   ├── api-setup.js
│   └── jest.api.config.js
└── README.md                   # This file
```

## Test Categories

### 1. API Integration Tests (`test/integration/`)

**Purpose**: Test HTTP APIs and WebSocket communication without browser

**Coverage**:
- HTTP REST endpoints (`/tables`, `/q`, `/api`)
- WebSocket real-time query execution
- ql.io language syntax validation
- Error handling and recovery
- Performance under load
- Concurrent request handling

**Run**:
```bash
npm run test:integration:api
```

### 2. Browser Integration Tests (`test/browser/`)

**Purpose**: Test complete web interface with real browser automation

**Coverage**:
- Console UI loading and rendering
- User interactions (form submission, button clicks)
- Real-time query execution from browser
- WebSocket communication from client
- Cross-browser compatibility (Chromium, Firefox, WebKit)
- Responsive design (mobile, tablet, desktop)
- Accessibility (keyboard navigation, ARIA labels)
- Error handling in UI

**Run**:
```bash
npm run test:integration:browser
```

### 3. Demo Integration Tests (`demos/test/`)

**Purpose**: Test demo routes and example queries

**Coverage**:
- All demo routes (`/demo-basic`, `/demo-joins`, etc.)
- Example query patterns
- Data validation
- Route parameter handling

**Run**:
```bash
npm run test:demo
```

## Running Tests

### All Integration Tests
```bash
npm run test:integration:all
```

### Individual Test Suites
```bash
# API tests only
npm run test:integration:api

# Browser tests only
npm run test:integration:browser

# Demo tests only
npm run test:demo
```

### Watch Mode (for development)
```bash
npm run test:demo-watch
```

## Prerequisites

### For API Tests
- Node.js 18+
- All npm dependencies installed

### For Browser Tests
- Node.js 18+
- Playwright browsers installed:
  ```bash
  npx playwright install
  ```

## Test Configuration

### API Tests
- **Config**: `test/integration/jest.api.config.js`
- **Setup**: `test/integration/api-setup.js`
- **Timeout**: 30 seconds per test
- **Workers**: 1 (sequential execution)

### Browser Tests
- **Config**: `test/browser/jest.browser.config.js`
- **Setup**: `test/browser/browser-setup.js`
- **Timeout**: 30 seconds per test
- **Workers**: 1 (sequential execution)
- **Browsers**: Chromium (default), Firefox, WebKit

## Writing New Tests

### API Integration Test Example
```javascript
describe('My API Feature', () => {
    test('should handle new endpoint', async () => {
        const response = await makeRequest(API_URL, '/my-endpoint');
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('result');
    });
});
```

### Browser Integration Test Example
```javascript
describe('My UI Feature', () => {
    test('should interact with new button', async () => {
        await page.goto(`${CONSOLE_URL}/console`);
        await page.locator('#my-button').click();
        await page.waitForSelector('#result');
        const result = await page.locator('#result').textContent();
        expect(result).toContain('expected text');
    });
});
```

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to main/master
- Pull requests
- Manual workflow dispatch

### Test Execution Order
1. Unit tests (all modules)
2. API integration tests
3. Browser integration tests (if Playwright available)
4. Demo integration tests

## Troubleshooting

### Browser Tests Failing
```bash
# Reinstall Playwright browsers
npx playwright install --force

# Check browser availability
npx playwright install --dry-run
```

### Port Conflicts
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Timeout Issues
- Increase timeout in test config files
- Check server startup logs
- Verify network connectivity

### WebSocket Connection Failures
- Ensure console server is running
- Check WebSocket protocol version
- Verify CORS settings

## Performance Benchmarks

### Expected Performance
- API response time: < 2 seconds (uncached)
- Cached query response: < 500ms
- Browser page load: < 3 seconds
- WebSocket connection: < 1 second
- Concurrent requests: 100+ without degradation

## Test Coverage Goals

- **API Endpoints**: 100% coverage
- **ql.io Language Features**: 90%+ coverage
- **UI Components**: 80%+ coverage
- **Error Scenarios**: 100% coverage
- **Cross-browser**: Chromium, Firefox, WebKit

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up resources (servers, connections)
3. **Timeouts**: Set appropriate timeouts for async operations
4. **Assertions**: Use specific, meaningful assertions
5. **Error Messages**: Provide clear error messages for failures
6. **Performance**: Keep tests fast (< 30 seconds each)
7. **Reliability**: Tests should pass consistently

## Future Enhancements

- [ ] Visual regression testing with screenshots
- [ ] Performance regression detection
- [ ] Load testing with Artillery or k6
- [ ] Security testing (XSS, CSRF, injection)
- [ ] Mobile device testing
- [ ] Network condition simulation (slow 3G, offline)
- [ ] Accessibility audit automation
- [ ] Code coverage reporting for integration tests

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [ql.io Documentation](../docs/README.md)
- [Testing Best Practices](../docs/TESTING.md)