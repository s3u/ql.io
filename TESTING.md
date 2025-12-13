# ql.io Testing Guide

This document describes the comprehensive testing suite for ql.io, including unit tests, integration tests, and API validation.

## Test Categories

### 1. Unit Tests
Standard Jest-based unit tests for individual modules:

```bash
# Run all unit tests
npm test

# Run tests for specific modules
npm run test:engine
npm run test:compiler
npm run test:console
npm run test:app
```

### 2. Integration Tests
Tests that validate table definitions and route endpoints:

```bash
# Run integration tests (requires running server)
npm run test:integration
```

### 3. API Validation Tests
Comprehensive validation of all tables and routes:

```bash
# Run complete API validation
npm run test:tables-routes

# Or use the shell wrapper
npm run test:all
bin/test-all.sh
```

## API Validation Test Script

The `bin/test-tables-routes.js` script provides comprehensive testing of all table definitions and route endpoints.

### Features

- **Automatic Discovery**: Finds all `.ql` files in `/tables` and `/routes` directories
- **Parallel Execution**: Tests run concurrently for faster execution
- **Retry Logic**: Automatically retries failed requests
- **External API Handling**: Gracefully handles external API failures
- **Detailed Reporting**: Comprehensive test results and statistics
- **Flexible Configuration**: Multiple command-line options

### Usage

```bash
# Basic usage
node bin/test-tables-routes.js

# With verbose output
node bin/test-tables-routes.js --verbose

# Skip external API failures
node bin/test-tables-routes.js --skip-external

# Run tests sequentially
node bin/test-tables-routes.js --sequential

# Combine options
node bin/test-tables-routes.js --verbose --skip-external
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `--verbose`, `-v` | Show detailed output for each test |
| `--skip-external` | Skip tests that fail due to external API issues |
| `--sequential` | Run tests sequentially instead of in parallel |
| `--help`, `-h` | Show help message |

### Test Results

The script provides detailed results including:

- **Tables Tested**: Number of table definitions validated
- **Routes Tested**: Number of route endpoints validated
- **Success Rate**: Percentage of successful tests
- **Duration**: Total execution time
- **Failed Tests**: Detailed error information for failures

Example output:
```
📋 Test Summary
==================================================

📊 Tables (15 total):
  ✓ Passed: 12
  ✗ Failed: 1
  ⚠ Skipped: 2

🛣️  Routes (7 total):
  ✓ Passed: 7
  ✗ Failed: 0
  ⚠ Skipped: 0

🎯 Overall Results:
  Total Tests: 22
  Passed: 19
  Failed: 1
  Skipped: 2
  Duration: 3.45s
  Success Rate: 95.0%
```

## Available APIs for Testing

### Core APIs
- **JSONPlaceholder**: Fake REST API for testing (posts, users, comments)
- **GitHub API**: Public repositories and user data
- **HTTPBin**: HTTP request testing service

### Data APIs
- **REST Countries**: Comprehensive country information
- **Universities**: Global university database
- **SpaceX API**: Space exploration and launch data

### Fun APIs
- **Cat Facts**: Random cat facts for testing
- **Metropolitan Museum**: Art collection data
- **Rijksmuseum**: Dutch art and cultural heritage

### Demo Routes
- `/demos` - Complete demo index
- `/demo-basic` - Simple API calls
- `/demo-joins` - JOIN operations
- `/demo-variables` - Variable usage
- `/demo-conditional` - IF-ELSE logic
- `/demo-aggregation` - Multi-source data aggregation
- `/demo-error-handling` - Error handling patterns

## Prerequisites

### Server Requirements
The API validation tests require a running ql.io server:

```bash
# Start the server (choose one)
npm start
bin/start.sh
bin/start.sh --modern    # Modern React console
bin/start.sh --legacy    # Traditional console
```

The server should be accessible at `http://localhost:3000`.

### Network Requirements
- Internet connection for external API tests
- Access to public APIs (GitHub, REST Countries, etc.)
- Some tests may be skipped if external APIs are unavailable

## Continuous Integration

### GitHub Actions / CI Setup
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm start &
      - run: sleep 10  # Wait for server to start
      - run: npm run test:tables-routes -- --skip-external
```

### Local Development
```bash
# Quick validation during development
npm start &
sleep 5
npm run test:tables-routes --skip-external
```

## Troubleshooting

### Common Issues

**Server Not Running**
```
❌ Server is not running on http://localhost:3000
```
Solution: Start the server with `npm start` or `bin/start.sh`

**External API Timeouts**
```
⚠ github.user - External API unavailable (skipped)
```
Solution: Use `--skip-external` flag or check internet connection

**Port Conflicts**
```
Error: listen EADDRINUSE: address already in use :::3000
```
Solution: Kill processes on port 3000 or use different port

### Debug Mode
For detailed debugging, use verbose mode:
```bash
npm run test:tables-routes -- --verbose
```

This shows:
- Individual test execution details
- HTTP request/response information
- Timing information for each test
- Configuration settings

## Test Development

### Adding New Tables
1. Create `.ql` file in `/tables` directory
2. Define table with `create table` statement
3. Tests are automatically discovered and executed

### Adding New Routes
1. Create `.ql` file in `/routes` directory
2. Implement route logic
3. Tests are automatically discovered and executed

### Custom Test Logic
For complex validation, extend the integration test:
```javascript
// In modules/engine/test/tables-routes-integration.test.js
test('should validate custom business logic', async () => {
    // Custom test implementation
});
```

## Performance Considerations

### Parallel vs Sequential
- **Parallel** (default): Faster execution, higher resource usage
- **Sequential**: Slower execution, lower resource usage, better for debugging

### Timeout Configuration
- Default timeout: 30 seconds per test
- Retry attempts: 3 per failed test
- Configurable in script header

### External API Rate Limits
Some APIs have rate limits. Use `--sequential` if hitting limits:
```bash
npm run test:tables-routes -- --sequential
```

## Best Practices

1. **Run tests before commits**: Ensure all APIs are working
2. **Use skip-external in CI**: Avoid CI failures due to external API issues
3. **Monitor success rates**: Aim for >90% success rate
4. **Regular validation**: Run full test suite weekly
5. **Document API changes**: Update table definitions when APIs change

## Integration with Development Workflow

### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run test:tables-routes -- --skip-external --sequential
```

### Development Server
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Run tests during development
npm run test:tables-routes -- --verbose
```

This comprehensive testing approach ensures that all ql.io APIs and routes remain functional and provides confidence in the system's reliability.