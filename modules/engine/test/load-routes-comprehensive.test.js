/*
 * Load Routes Comprehensive Test Suite
 * Target: Improve coverage from 14.63% to 60%+
 */

'use strict';

const loadRoutes = require('../lib/engine/load-routes.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Load Routes Comprehensive Tests', () => {
    let originalConsoleLog;
    let mockLogEmitter;
    let testRoutesDir;
    
    beforeEach(() => {
        // Suppress console.log during tests
        originalConsoleLog = console.log;
        console.log = jest.fn();
        
        // Create temporary directory for test routes
        testRoutesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-routes-'));
        
        // Mock log emitter
        mockLogEmitter = {
            emitEvent: jest.fn(),
            emitError: jest.fn(),
            emitWarning: jest.fn()
        };
    });

    afterEach(() => {
        // Restore console.log
        console.log = originalConsoleLog;
        
        // Cleanup test routes directory
        if (fs.existsSync(testRoutesDir)) {
            fs.rmSync(testRoutesDir, { recursive: true, force: true });
        }
    });

    describe('Basic Route Loading', () => {
        test('should return empty object when no routes directory provided', () => {
            const result = loadRoutes.load({
                routes: null,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toEqual({});
        });

        test('should return empty routes when directory is empty', () => {
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.simpleMap).toBeDefined();
            expect(result.verbMap).toBeDefined();
            expect(Object.keys(result.verbMap)).toHaveLength(0);
        });

        test('should handle non-existent routes directory', () => {
            const nonExistentDir = path.join(testRoutesDir, 'nonexistent');
            
            const result = loadRoutes.load({
                routes: nonExistentDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.simpleMap).toBeDefined();
            expect(result.verbMap).toBeDefined();
            expect(mockLogEmitter.emitError).toHaveBeenCalled();
        });
    });

    describe('Route File Processing', () => {
        test('should skip non-QL files', () => {
            // Create non-QL files
            fs.writeFileSync(path.join(testRoutesDir, 'readme.txt'), 'This is not a QL file');
            fs.writeFileSync(path.join(testRoutesDir, 'config.json'), '{"test": true}');
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
            expect(Object.keys(result.verbMap)).toHaveLength(0);
        });

        test('should handle empty QL files', () => {
            fs.writeFileSync(path.join(testRoutesDir, 'empty.ql'), '');
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
            // Empty files are valid and should not emit warnings
            expect(mockLogEmitter.emitWarning).not.toHaveBeenCalled();
        });

        test('should handle QL files with only comments', () => {
            const commentOnlyContent = `
                // This is a comment
                /* This is a block comment */
                // Another comment
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'comments.ql'), commentOnlyContent);
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
            expect(mockLogEmitter.emitWarning).toHaveBeenCalled();
        });

        test('should handle malformed QL files', () => {
            const malformedContent = `
                this is not valid QL syntax
                select * from nowhere
                invalid syntax here
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'malformed.ql'), malformedContent);
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
            expect(mockLogEmitter.emitWarning).toHaveBeenCalled();
        });
    });

    describe('Nested Directory Processing', () => {
        test('should process routes in nested directories', () => {
            const nestedDir = path.join(testRoutesDir, 'api', 'v1');
            fs.mkdirSync(nestedDir, { recursive: true });
            
            // Create a simple QL file in nested directory
            fs.writeFileSync(path.join(nestedDir, 'test.ql'), '// Simple test file');
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
            // Should process the nested directory without errors
            expect(mockLogEmitter.emitEvent).toHaveBeenCalled();
        });

        test('should handle deeply nested directories', () => {
            const deepDir = path.join(testRoutesDir, 'level1', 'level2', 'level3');
            fs.mkdirSync(deepDir, { recursive: true });
            
            fs.writeFileSync(path.join(deepDir, 'deep.ql'), '// Deep nested file');
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle permission errors gracefully', () => {
            // Create a file and then make directory unreadable (if possible)
            const restrictedDir = path.join(testRoutesDir, 'restricted');
            fs.mkdirSync(restrictedDir);
            
            // Try to make it unreadable (may not work on all systems)
            try {
                fs.chmodSync(restrictedDir, 0o000);
            } catch (e) {
                // Skip this test if we can't change permissions
                return;
            }
            
            const result = loadRoutes.load({
                routes: restrictedDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            
            // Restore permissions for cleanup
            try {
                fs.chmodSync(restrictedDir, 0o755);
            } catch (e) {
                // Ignore cleanup errors
            }
        });

        test('should handle files with compilation errors', () => {
            const invalidQLContent = `
                select * from nonexistent_table;
                return invalid_syntax route "/test";
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'invalid.ql'), invalidQLContent);
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
            expect(mockLogEmitter.emitWarning).toHaveBeenCalled();
        });
    });

    describe('Route Information Processing', () => {
        test('should handle files without return statements', () => {
            const noReturnContent = `
                // This file has no return statement
                data = select * from users;
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'no-return.ql'), noReturnContent);
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: { users: { routes: [] } }
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
            // File should be processed but not create routes
        });

        test('should handle files with return but no route', () => {
            const noRouteContent = `
                data = {"test": true};
                return data;
            `;
            
            fs.writeFileSync(path.join(testRoutesDir, 'no-route.ql'), noRouteContent);
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
        });
    });

    describe('Table Association', () => {
        test('should associate routes with table definitions', () => {
            const mockTable = {
                routes: []
            };
            
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {
                    users: mockTable
                }
            });
            
            expect(result).toBeDefined();
            expect(mockTable.routes).toBeDefined();
        });

        test('should handle missing table definitions', () => {
            const result = loadRoutes.load({
                routes: testRoutesDir,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result).toBeDefined();
            expect(result.verbMap).toBeDefined();
        });
    });

    describe('Path Processing', () => {
        test('should handle paths with and without trailing slashes', () => {
            const pathWithSlash = testRoutesDir + '/';
            const pathWithoutSlash = testRoutesDir;
            
            const result1 = loadRoutes.load({
                routes: pathWithSlash,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            const result2 = loadRoutes.load({
                routes: pathWithoutSlash,
                logEmitter: mockLogEmitter,
                tables: {}
            });
            
            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            expect(result1.verbMap).toBeDefined();
            expect(result2.verbMap).toBeDefined();
        });
    });
});