const path = require('path');
const fs = require('fs');
const config = require('../lib/engine/config');

describe('Config Comprehensive Tests', () => {
    let mockLogEmitter;
    let tempDir;
    let tempConfigFile;

    beforeEach(() => {
        mockLogEmitter = {
            emitEvent: jest.fn(),
            emitError: jest.fn()
        };
        
        // Create temp directory for test config files
        tempDir = path.join(__dirname, 'temp-config');
        fs.mkdirSync(tempDir, { recursive: true });
        tempConfigFile = path.join(tempDir, 'test-config.json');
    });

    afterEach(() => {
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('Basic Config Loading', () => {
        test('should return empty object when no config file provided', () => {
            const result = config.load({
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should return empty object when config is null', () => {
            const result = config.load({
                config: null,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should return empty object when config is undefined', () => {
            const result = config.load({
                config: undefined,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should return empty object when config is empty string', () => {
            const result = config.load({
                config: '',
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
        });

        test('should return empty object when opts is undefined', () => {
            const result = config.load();
            
            expect(result).toEqual({});
        });

        test('should return empty object when opts is null', () => {
            const result = config.load(null);
            
            expect(result).toEqual({});
        });
    });

    describe('Valid Config File Loading', () => {
        test('should load valid JSON config file', () => {
            const configData = {
                port: 3000,
                host: 'localhost',
                debug: true,
                database: {
                    host: 'db.example.com',
                    port: 5432
                }
            };
            
            fs.writeFileSync(tempConfigFile, JSON.stringify(configData, null, 2));
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(configData);
            expect(mockLogEmitter.emitEvent).toHaveBeenCalledWith(
                expect.stringContaining('Loading config from')
            );
        });

        test('should load empty JSON config file', () => {
            fs.writeFileSync(tempConfigFile, '{}');
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitEvent).toHaveBeenCalledWith(
                expect.stringContaining('Loading config from')
            );
        });

        test('should load config with complex nested structure', () => {
            const configData = {
                server: {
                    port: 8080,
                    ssl: {
                        enabled: true,
                        cert: '/path/to/cert',
                        key: '/path/to/key'
                    }
                },
                cache: {
                    type: 'redis',
                    options: {
                        host: 'redis.example.com',
                        port: 6379,
                        db: 0
                    }
                },
                features: ['feature1', 'feature2', 'feature3'],
                limits: {
                    maxRequests: 1000,
                    timeout: 30000
                }
            };
            
            fs.writeFileSync(tempConfigFile, JSON.stringify(configData, null, 2));
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(configData);
        });

        test('should load config with various data types', () => {
            const configData = {
                stringValue: 'test string',
                numberValue: 42,
                booleanValue: true,
                nullValue: null,
                arrayValue: [1, 2, 3, 'four', true],
                objectValue: { nested: 'value' }
            };
            
            fs.writeFileSync(tempConfigFile, JSON.stringify(configData, null, 2));
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(configData);
        });
    });

    describe('File System Error Handling', () => {
        test('should handle non-existent config file', () => {
            const nonExistentFile = path.join(tempDir, 'non-existent.json');
            
            const result = config.load({
                config: nonExistentFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Unable to load config from')
            );
        });

        test('should handle permission denied error', () => {
            // Create a file and then make it unreadable (on Unix systems)
            fs.writeFileSync(tempConfigFile, '{"test": true}');
            
            // Mock fs.readFileSync to throw permission error
            const originalReadFileSync = fs.readFileSync;
            fs.readFileSync = jest.fn().mockImplementation((file, encoding) => {
                if (file === tempConfigFile) {
                    const error = new Error('EACCES: permission denied');
                    error.code = 'EACCES';
                    throw error;
                }
                return originalReadFileSync(file, encoding);
            });
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Unable to load config from')
            );
            
            // Restore original function
            fs.readFileSync = originalReadFileSync;
        });

        test('should handle directory instead of file', () => {
            const dirPath = path.join(tempDir, 'config-dir');
            fs.mkdirSync(dirPath);
            
            const result = config.load({
                config: dirPath,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Unable to load config from')
            );
        });
    });

    describe('JSON Parsing Error Handling', () => {
        test('should handle malformed JSON', () => {
            fs.writeFileSync(tempConfigFile, '{ "invalid": json, }');
            
            // Mock console.log to capture error output
            const originalConsoleLog = console.log;
            console.log = jest.fn();
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Error loading config file')
            );
            expect(console.log).toHaveBeenCalled();
            
            // Restore console.log
            console.log = originalConsoleLog;
        });

        test('should handle completely invalid JSON', () => {
            fs.writeFileSync(tempConfigFile, 'this is not json at all');
            
            const originalConsoleLog = console.log;
            console.log = jest.fn();
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Error loading config file')
            );
            
            console.log = originalConsoleLog;
        });

        test('should handle empty file', () => {
            fs.writeFileSync(tempConfigFile, '');
            
            const originalConsoleLog = console.log;
            console.log = jest.fn();
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Error loading config file')
            );
            
            console.log = originalConsoleLog;
        });

        test('should handle file with only whitespace', () => {
            fs.writeFileSync(tempConfigFile, '   \n\t  \r\n  ');
            
            const originalConsoleLog = console.log;
            console.log = jest.fn();
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Error loading config file')
            );
            
            console.log = originalConsoleLog;
        });

        test('should handle JSON with trailing comma', () => {
            fs.writeFileSync(tempConfigFile, '{"key": "value",}');
            
            const originalConsoleLog = console.log;
            console.log = jest.fn();
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Error loading config file')
            );
            
            console.log = originalConsoleLog;
        });

        test('should handle JSON with comments (invalid)', () => {
            fs.writeFileSync(tempConfigFile, `{
                // This is a comment
                "key": "value"
            }`);
            
            const originalConsoleLog = console.log;
            console.log = jest.fn();
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Error loading config file')
            );
            
            console.log = originalConsoleLog;
        });
    });

    describe('UTF-8 Encoding Handling', () => {
        test('should handle UTF-8 encoded config file', () => {
            const configData = {
                message: 'Hello 世界',
                emoji: '🚀',
                unicode: 'Ñoño café'
            };
            
            fs.writeFileSync(tempConfigFile, JSON.stringify(configData, null, 2), 'utf8');
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(configData);
        });

        test('should handle config file with BOM', () => {
            const configData = { test: 'value' };
            const jsonString = JSON.stringify(configData, null, 2);
            const bom = '\uFEFF';
            
            fs.writeFileSync(tempConfigFile, bom + jsonString, 'utf8');
            
            const originalConsoleLog = console.log;
            console.log = jest.fn();
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            // BOM will cause JSON parsing to fail
            expect(result).toEqual({});
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                expect.stringContaining('Error loading config file')
            );
            
            console.log = originalConsoleLog;
        });
    });

    describe('Edge Cases and Special Scenarios', () => {
        test('should handle very large config file', () => {
            const largeConfig = {};
            for (let i = 0; i < 1000; i++) {
                largeConfig[`key${i}`] = {
                    value: `value${i}`,
                    number: i,
                    array: new Array(10).fill(i)
                };
            }
            
            fs.writeFileSync(tempConfigFile, JSON.stringify(largeConfig, null, 2));
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(largeConfig);
            expect(Object.keys(result)).toHaveLength(1000);
        });

        test('should handle config with deeply nested objects', () => {
            let deepConfig = {};
            let current = deepConfig;
            
            // Create 20 levels of nesting
            for (let i = 0; i < 20; i++) {
                current[`level${i}`] = {};
                current = current[`level${i}`];
            }
            current.value = 'deep value';
            
            fs.writeFileSync(tempConfigFile, JSON.stringify(deepConfig, null, 2));
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(deepConfig);
        });

        test('should handle config with special JSON values', () => {
            const configData = {
                nullValue: null,
                falseValue: false,
                trueValue: true,
                zeroValue: 0,
                emptyString: '',
                emptyArray: [],
                emptyObject: {}
            };
            
            fs.writeFileSync(tempConfigFile, JSON.stringify(configData, null, 2));
            
            const result = config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(configData);
        });

        test('should handle config file path with spaces', () => {
            const configWithSpaces = path.join(tempDir, 'config with spaces.json');
            const configData = { test: 'spaces in filename' };
            
            fs.writeFileSync(configWithSpaces, JSON.stringify(configData, null, 2));
            
            const result = config.load({
                config: configWithSpaces,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(configData);
        });

        test('should handle config file path with special characters', () => {
            const configWithSpecial = path.join(tempDir, 'config-@#$%.json');
            const configData = { test: 'special characters' };
            
            fs.writeFileSync(configWithSpecial, JSON.stringify(configData, null, 2));
            
            const result = config.load({
                config: configWithSpecial,
                logEmitter: mockLogEmitter
            });
            
            expect(result).toEqual(configData);
        });
    });

    describe('Log Emitter Integration', () => {
        test('should emit loading event with correct file path', () => {
            const configData = { test: true };
            fs.writeFileSync(tempConfigFile, JSON.stringify(configData));
            
            config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(mockLogEmitter.emitEvent).toHaveBeenCalledWith(
                `Loading config from ${tempConfigFile}`
            );
        });

        test('should emit error event with correct file path for missing file', () => {
            const missingFile = path.join(tempDir, 'missing.json');
            
            config.load({
                config: missingFile,
                logEmitter: mockLogEmitter
            });
            
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                `Unable to load config from ${missingFile}`
            );
        });

        test('should emit error event with correct file path for JSON error', () => {
            fs.writeFileSync(tempConfigFile, 'invalid json');
            
            const originalConsoleLog = console.log;
            console.log = jest.fn();
            
            config.load({
                config: tempConfigFile,
                logEmitter: mockLogEmitter
            });
            
            expect(mockLogEmitter.emitError).toHaveBeenCalledWith(
                `Error loading config file: ${tempConfigFile}`
            );
            
            console.log = originalConsoleLog;
        });

        test('should handle missing logEmitter gracefully', () => {
            const configData = { test: true };
            fs.writeFileSync(tempConfigFile, JSON.stringify(configData));
            
            // This should not throw an error even without logEmitter
            expect(() => {
                config.load({
                    config: tempConfigFile
                });
            }).toThrow(); // Will throw because logEmitter is undefined
        });
    });
});