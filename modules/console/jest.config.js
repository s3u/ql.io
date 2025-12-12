module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.js'],
    collectCoverageFrom: [
        'lib/**/*.js',
        '!lib/**/*.test.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 30000, // 30 seconds for integration tests
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    forceExit: true // Force Jest to exit after tests complete (prevents hanging from timers)
};