/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const http = require('http');
const _ = require('underscore');
const { spawn } = require('child_process');

const debug = false;

describe('App Module Tests', () => {
    const app = require('../lib/main');
    const cluster = require('cluster');
    
    // Mock cluster module to prevent actual process forking
    let originalFork, originalIsMaster, originalOn, originalDisconnect;
    
    beforeAll(() => {
        // Save original cluster methods
        originalFork = cluster.fork;
        originalIsMaster = cluster.isMaster;
        originalOn = cluster.on;
        originalDisconnect = cluster.disconnect;
        
        // Mock cluster methods
        cluster.fork = jest.fn(() => ({
            process: { pid: Math.floor(Math.random() * 10000) }
        }));
        cluster.on = jest.fn();
        cluster.disconnect = jest.fn();
    });
    
    afterAll(() => {
        // Restore original cluster methods
        cluster.fork = originalFork;
        Object.defineProperty(cluster, 'isMaster', {
            value: originalIsMaster,
            configurable: true
        });
        cluster.on = originalOn;
        cluster.disconnect = originalDisconnect;
    });

    test('should handle cluster wrapper creation', () => {
        const originalArgv = process.argv;
        process.argv = ['node', 'test'];
        
        try {
            // Mock cluster.isMaster to false to avoid forking
            Object.defineProperty(cluster, 'isMaster', {
                value: false,
                configurable: true
            });
            
            let callbackCalled = false;
            app.exec(function(appInstance, program, emitter) {
                expect(appInstance).toBeDefined();
                expect(program).toBeDefined();
                expect(emitter).toBeDefined();
                callbackCalled = true;
            });
            
            expect(callbackCalled).toBe(true);
        } finally {
            process.argv = originalArgv;
        }
    });

    test('should create cluster wrapper with options', () => {
        const originalArgv = process.argv;
        process.argv = ['node', 'test', '--cluster'];
        
        try {
            // Mock cluster.isMaster to false to avoid forking
            Object.defineProperty(cluster, 'isMaster', {
                value: false,
                configurable: true
            });
            
            let callbackCalled = false;
            app.exec(function(appInstance, program, emitter) {
                expect(appInstance).toBeDefined();
                expect(program).toBeDefined();
                expect(emitter).toBeDefined();
                callbackCalled = true;
            });
            
            expect(callbackCalled).toBe(true);
        } finally {
            process.argv = originalArgv;
        }
    });

    test('should handle command line argument parsing', () => {
        const originalArgv = process.argv;
        process.argv = ['node', 'test', '--port', '4000', '--monPort', '4001'];
        
        try {
            // Mock cluster.isMaster to false to avoid forking
            Object.defineProperty(cluster, 'isMaster', {
                value: false,
                configurable: true
            });
            
            let callbackCalled = false;
            app.exec(function(appInstance, program, emitter) {
                expect(program).toBeDefined();
                expect(program.opts).toBeDefined();
                const opts = program.opts();
                expect(opts.port).toBe('4000');
                expect(opts.monPort).toBe('4001');
                callbackCalled = true;
            });
            
            expect(callbackCalled).toBe(true);
        } finally {
            process.argv = originalArgv;
        }
    });

    test('should handle logger creation', () => {
        const EventEmitter = require('events').EventEmitter;
        const emitter = new EventEmitter();
        
        expect(() => {
            app.addFileLoggers({}, emitter);
        }).not.toThrow();
        
        // Test that emitter can handle events
        expect(() => {
            emitter.emit('info', 'test message');
            emitter.emit('error', 'test error');
            emitter.emit('warning', 'test warning');
        }).not.toThrow();
    });
});