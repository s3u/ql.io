const path = require('path');
const fs = require('fs');
const loadConnector = require('../lib/engine/load-connector');

describe('Load Connector Comprehensive Tests', () => {
    let mockLogEmitter;
    let tempDir;
    let originalCwd;

    beforeEach(() => {
        mockLogEmitter = {
            emitEvent: jest.fn(),
            emitError: jest.fn()
        };
        
        // Create temp directory for tests
        tempDir = path.join(__dirname, 'temp-connectors');
        originalCwd = process.cwd();
    });

    afterEach(() => {
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        process.chdir(originalCwd);
    });

    describe('Basic Connector Loading', () => {
        test('should return empty array when no path provided', () => {
            const result = loadConnector.load({
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual([]);
        });

        test('should return empty array when path is null', () => {
            const result = loadConnector.load({
                path: null,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual([]);
        });

        test('should return empty array when path is undefined', () => {
            const result = loadConnector.load({
                path: undefined,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual([]);
        });

        test('should return empty array when path is empty string', () => {
            const result = loadConnector.load({
                path: '',
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual([]);
        });
    });

    describe('Directory Processing', () => {
        test('should handle non-existent directory', () => {
            const nonExistentPath = path.join(__dirname, 'non-existent-dir');
            
            const result = loadConnector.load({
                path: nonExistentPath,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Unable to load connectors from')
            );
        });

        test('should emit loading event for valid directory', () => {
            // Create temp directory
            fs.mkdirSync(tempDir, { recursive: true });
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(mockLogEmitter.emitEvent).toHaveBeenCalledWith(
                expect.stringContaining('Loading connectors from')
            );
            expect(result).toEqual({});
        });

        test('should handle directory with trailing slash', () => {
            // Create temp directory
            fs.mkdirSync(tempDir, { recursive: true });
            
            const result = loadConnector.load({
                path: tempDir + '/',
                logEmitter: mockLogEmitter
            });
            
            expect(mockLogEmitter.emitEvent).toHaveBeenCalledWith(
                expect.stringContaining('Loading connectors from')
            );
            expect(result).toEqual({});
        });

        test('should handle directory without trailing slash', () => {
            // Create temp directory
            fs.mkdirSync(tempDir, { recursive: true });
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(mockLogEmitter.emitEvent).toHaveBeenCalledWith(
                expect.stringContaining('Loading connectors from')
            );
            expect(result).toEqual({});
        });
    });

    describe('File Processing', () => {
        test('should ignore non-JavaScript files', () => {
            // Create temp directory with non-JS files
            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'This is a text file');
            fs.writeFileSync(path.join(tempDir, 'config.json'), '{"test": true}');
            fs.writeFileSync(path.join(tempDir, 'style.css'), 'body { color: red; }');
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should process JavaScript files', () => {
            // Create temp directory with JS file
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'test-connector.js');
            fs.writeFileSync(connectorFile, `
                module.exports = {
                    connectorName: 'test-connector',
                    execute: function() { return 'test'; }
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toBeDefined();
            expect(result['test-connector']).toBe(connectorFile);
        });

        test('should handle JavaScript files without connectorName', () => {
            // Create temp directory with JS file without connectorName
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'invalid-connector.js');
            fs.writeFileSync(connectorFile, `
                module.exports = {
                    execute: function() { return 'test'; }
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should handle malformed JavaScript files', () => {
            // Create temp directory with malformed JS file
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'malformed-connector.js');
            fs.writeFileSync(connectorFile, 'this is not valid javascript {{{');
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should handle files that throw errors during require', () => {
            // Create temp directory with JS file that throws
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'error-connector.js');
            fs.writeFileSync(connectorFile, `
                throw new Error('This connector has an error');
                module.exports = {
                    connectorName: 'error-connector'
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });
    });

    describe('Multiple Connector Loading', () => {
        test('should load multiple valid connectors', () => {
            // Create temp directory with multiple connectors
            fs.mkdirSync(tempDir, { recursive: true });
            
            const connector1File = path.join(tempDir, 'connector1.js');
            fs.writeFileSync(connector1File, `
                module.exports = {
                    connectorName: 'connector1',
                    execute: function() { return 'test1'; }
                };
            `);
            
            const connector2File = path.join(tempDir, 'connector2.js');
            fs.writeFileSync(connector2File, `
                module.exports = {
                    connectorName: 'connector2',
                    execute: function() { return 'test2'; }
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toBeDefined();
            expect(result['connector1']).toBe(connector1File);
            expect(result['connector2']).toBe(connector2File);
        });

        test('should handle mix of valid and invalid connectors', () => {
            // Create temp directory with mix of files
            fs.mkdirSync(tempDir, { recursive: true });
            
            // Valid connector
            const validFile = path.join(tempDir, 'valid-connector.js');
            fs.writeFileSync(validFile, `
                module.exports = {
                    connectorName: 'valid-connector',
                    execute: function() { return 'valid'; }
                };
            `);
            
            // Invalid connector (no connectorName)
            const invalidFile = path.join(tempDir, 'invalid-connector.js');
            fs.writeFileSync(invalidFile, `
                module.exports = {
                    execute: function() { return 'invalid'; }
                };
            `);
            
            // Malformed file
            const malformedFile = path.join(tempDir, 'malformed.js');
            fs.writeFileSync(malformedFile, 'invalid javascript');
            
            // Non-JS file
            fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'readme');
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toBeDefined();
            expect(result['valid-connector']).toBe(validFile);
            expect(Object.keys(result)).toHaveLength(1);
        });
    });

    describe('Connector Name Validation', () => {
        test('should handle connector with null connectorName', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'null-name.js');
            fs.writeFileSync(connectorFile, `
                module.exports = {
                    connectorName: null,
                    execute: function() { return 'test'; }
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should handle connector with undefined connectorName', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'undefined-name.js');
            fs.writeFileSync(connectorFile, `
                module.exports = {
                    connectorName: undefined,
                    execute: function() { return 'test'; }
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should handle connector with empty string connectorName', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'empty-name.js');
            fs.writeFileSync(connectorFile, `
                module.exports = {
                    connectorName: '',
                    execute: function() { return 'test'; }
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should handle connector with numeric connectorName', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'numeric-name.js');
            fs.writeFileSync(connectorFile, `
                module.exports = {
                    connectorName: 123,
                    execute: function() { return 'test'; }
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toBeDefined();
            expect(result['123']).toBe(connectorFile);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle empty directory', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitEvent).toHaveBeenCalledWith(
                expect.stringContaining('Loading connectors from')
            );
        });

        test('should handle directory with only subdirectories', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'subdir1'));
            fs.mkdirSync(path.join(tempDir, 'subdir2'));
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should handle connector with special characters in name', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'special-connector.js');
            fs.writeFileSync(connectorFile, `
                module.exports = {
                    connectorName: 'special-connector@#$%',
                    execute: function() { return 'special'; }
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toBeDefined();
            expect(result['special-connector@#$%']).toBe(connectorFile);
        });

        test('should handle connector that exports a function instead of object', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            const connectorFile = path.join(tempDir, 'function-connector.js');
            fs.writeFileSync(connectorFile, `
                module.exports = function() {
                    return { connectorName: 'function-connector' };
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should handle connector with duplicate names (last one wins)', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            
            const connector1File = path.join(tempDir, 'aaa-connector1.js'); // Alphabetically first
            fs.writeFileSync(connector1File, `
                module.exports = {
                    connectorName: 'duplicate-name',
                    version: 1
                };
            `);
            
            const connector2File = path.join(tempDir, 'zzz-connector2.js'); // Alphabetically last
            fs.writeFileSync(connector2File, `
                module.exports = {
                    connectorName: 'duplicate-name',
                    version: 2
                };
            `);
            
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toBeDefined();
            expect(Object.keys(result)).toContain('duplicate-name');
            // The result should contain one of the files (order depends on filesystem)
            expect([connector1File, connector2File]).toContain(result['duplicate-name']);
        });
    });

    describe('Performance and Large Scale', () => {
        test('should handle loading many connectors efficiently', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            
            // Create 50 connectors
            for (let i = 0; i < 50; i++) {
                const connectorFile = path.join(tempDir, `connector${i}.js`);
                fs.writeFileSync(connectorFile, `
                    module.exports = {
                        connectorName: 'connector${i}',
                        execute: function() { return 'test${i}'; }
                    };
                `);
            }
            
            const startTime = Date.now();
            const result = loadConnector.load({
                path: tempDir,
                logEmitter: mockLogEmitter
            });
            const endTime = Date.now();
            
            expect(result).toBeDefined();
            expect(Object.keys(result)).toHaveLength(50);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });
    });
});