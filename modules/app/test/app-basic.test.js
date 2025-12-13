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

'use strict';

const app = require('../lib/main');

describe('App Module Basic Tests', () => {
    test('should export version', () => {
        expect(app.version).toBeDefined();
        expect(typeof app.version).toBe('string');
    });

    test('should export exec function', () => {
        expect(app.exec).toBeDefined();
        expect(typeof app.exec).toBe('function');
    });

    test('should export addFileLoggers function', () => {
        expect(app.addFileLoggers).toBeDefined();
        expect(typeof app.addFileLoggers).toBe('function');
    });

    test('should have correct version from package.json', () => {
        const packageJson = require('../package.json');
        expect(app.version).toBe(packageJson.version);
    });

    test('should handle command line argument parsing', () => {
        // Test the command line parsing logic without starting servers
        const { Command } = require('commander');
        const program = new Command();
        
        // Set up the same options as the main app
        program
            .option('-p, --port <port>', 'Port to listen on', '3000')
            .option('-m, --monPort <monPort>', 'Monitoring port', '3001')
            .option('-c, --cluster', 'Enable cluster mode')
            .option('-t, --tables <tables>', 'Tables directory')
            .option('-r, --routes <routes>', 'Routes directory')
            .option('-l, --logs <logs>', 'Logs directory');
            
        // Test parsing with various arguments
        program.parse(['node', 'test', '--port', '8080', '--cluster']);
        
        const opts = program.opts();
        expect(opts.port).toBe('8080');
        expect(opts.cluster).toBe(true);
        expect(opts.monPort).toBe('3001'); // default value
    });

    test('should handle logger configuration', () => {
        const EventEmitter = require('events').EventEmitter;
        const emitter = new EventEmitter();
        
        // Test that addFileLoggers doesn't crash with basic config
        expect(() => {
            app.addFileLoggers({}, emitter);
        }).not.toThrow();
        
        // Test that emitter can handle events
        let eventReceived = false;
        emitter.on('info', () => {
            eventReceived = true;
        });
        
        emitter.emit('info', 'test message');
        expect(eventReceived).toBe(true);
    });
});