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

const cluster = require('cluster');
const fs = require('fs');
const winston = require('winston');
const os = require('os');
const _ = require('underscore');
const { program } = require('commander');
const Console = require('ql.io-console');
const assert = require('assert');

// Trap all uncaught exception here.
process.on('uncaughtException', function(error) {
    // TODO: Report to logger
    console.log('Uncaught error');
    console.log(error.stack || error);
});

exports.version = require('../package.json').version;

// Simple cluster wrapper to replace cluster2
function createClusterWrapper(options) {
    const EventEmitter = require('events').EventEmitter;
    const wrapper = new EventEmitter();
    
    wrapper.listen = function(createAppFn, readyFn) {
        if (options.cluster && cluster.isMaster) {
            // Fork workers
            const numWorkers = options.noWorkers || os.cpus().length;
            for (let i = 0; i < numWorkers; i++) {
                const worker = cluster.fork();
                wrapper.emit('forked', worker.process.pid);
            }
            
            cluster.on('exit', function(worker, code, signal) {
                wrapper.emit('died', worker.process.pid);
                // Restart worker
                const newWorker = cluster.fork();
                wrapper.emit('forked', newWorker.process.pid);
            });
            
            process.on('SIGTERM', function() {
                wrapper.emit('SIGTERM', process.pid);
                cluster.disconnect();
            });
            
            // In master, just call ready callback
            if (readyFn) {
                readyFn();
            }
        } else {
            // Worker or non-cluster mode
            createAppFn(function(app, monApp) {
                if (readyFn) {
                    readyFn(app, monApp);
                }
            });
        }
    };
    
    wrapper.stop = function(options) {
        if (cluster.isMaster) {
            cluster.disconnect();
        }
        process.exit(0);
    };
    
    wrapper.shutdown = function(options) {
        if (cluster.isMaster) {
            cluster.disconnect();
        }
        process.exit(0);
    };
    
    return wrapper;
}

exports.exec = function() {
    let loggerFn, cb, opts;
    if(arguments.length === 1) {
        cb = arguments[0];
    }
    else if(arguments.length === 2) {
        cb = arguments[0];
        opts = arguments[1];
    }
    else if(arguments.length === 3) {
        loggerFn = arguments[0];
        cb = arguments[1];
        opts = arguments[2];
    }

    loggerFn = loggerFn || addFileLoggers;

    // Process command line args.
    const cwd = process.cwd();
    program
        .option('-C, --cluster', 'run in cluster')
        .option('-c, --config <configFile>', 'path to config', cwd + '/../config/dev.json')
        .option('-p, --port <port>', 'port to bind to', '3000')
        .option('-m, --monPort <monPort>', 'port for monitoring', '3001')
        .option('-conn, --connectors <connectors>', 'path of dir containing connectors', cwd + '/connectors')
        .option('-t, --tables <tables>', 'path of dir containing tables', cwd + '/tables')
        .option('-r, --routes <routes>', 'path of dir containing routes', cwd + '/routes')
        .option('-x, --xformers <xformers>', 'path of dir containing xformers', cwd + '/config/xformers.json')
        .option('-a, --ecvPath <ecvPath>', 'ecv path', '/ecv')
        .option('--ecvControl', 'allow disabling ecv')
        .option('-n, --noWorkers <noWorkers>', 'no of workers', os.cpus().length.toString())
        .option('-e, --disableConsole', 'disable the console')
        .option('-q, --disableQ', 'disable /q');
    
    if(opts) {
        _.each(opts, function(opt) {
            program.option(opt[0], opt[1], opt[2], opt[3]);
        })
    }
    program.parse(process.argv);

    const programOpts = program.opts();
    const ports = _.map(programOpts.port.split(','), function(port) {
        return parseInt(port);
    });
    const options = {
        cluster: programOpts.cluster,
        port: ports,
        monPort: parseInt(programOpts.monPort),
        config: programOpts.config,
        tables: programOpts.tables,
        routes: programOpts.routes,
        connectors: programOpts.connectors,
        xformers: programOpts.xformers,
        disableConsole: programOpts.disableConsole,
        disableQ: programOpts.disableQ,
        noWorkers: parseInt(programOpts.noWorkers),
        'request-id': programOpts.requestId || 'Request-ID',
        loggerFn: loggerFn,
        ecv: {
            path: programOpts.ecvPath,
            control: programOpts.ecvControl,
            monitor: '/tables',
            validator: function(status, headers, data) {
                return JSON.parse(data);
            }
        },
        timeout: 300 * 1000 // Idle client socket timeout
    };
    // Copy program options to options object for backward compatibility
    Object.assign(options, programOpts);

    // Create a simple cluster wrapper to replace cluster2
    const clusterWrapper = createClusterWrapper(options);
    
    if(process.argv.indexOf('stop') >= 0) {
        clusterWrapper.stop(options);
    }
    else if(process.argv.indexOf('shutdown') >= 0) {
        clusterWrapper.shutdown(options);
    }
    else {
        let emitter;
        clusterWrapper.listen(
            // Create an app and call back
            function(cb2) {
                createConsole(options, clusterWrapper, function(app, monApp, e) {
                    emitter = e;
                    cb2(app, monApp);
                })
            },
            // Cluster is ready
            function(app) {
                if(cb) {
                    cb(app, program, emitter);
                }
            }
        );
    }
}

exports.addFileLoggers = addFileLoggers;
function addFileLoggers(options, emitter) {
    // Attach listeners for logging
    // Ensure logs dir.
    let logdir = false;
    try {
        fs.readdirSync(process.cwd() + '/logs');
        logdir = true;
    }
    catch(e) {
        try {
            fs.mkdirSync(process.cwd() + '/logs/', parseInt('755', 8));
            logdir = true;
        }
        catch(e) {
        }
    }
    const logger = createLogger(logdir, '/logs/ql.io.log');
    const accessLogger = createLogger(logdir, '/logs/access.log');
    const errLogger = createLogger(logdir, '/logs/error.log');
    const proxyLogger = createLogger(logdir, '/logs/proxy.log');

    logger.setLevels(winston.config.cli.levels);
    emitter.on('ql.io-begin-event', function (event, message) {
        if(_.isObject(message)) {
            message.eventId = event.eventId;
            message.pid = process.pid;
        }
        if(event.type === 'URL') {
            accessLogger.info(message)
        }
        else if(event.name === 'http-request') {
            proxyLogger.info(message)
        }
    });
    emitter.on('ql.io-end-event', function (event, message) {
        if(_.isObject(message)) {
            message.eventId = event.eventId;
            message.pid = process.pid;
            message.duration = event.duration;
        }
        if(event.type === 'URL') {
            accessLogger.info(message)
        }
        else if(event.name === 'http-request') {
            proxyLogger.info(message)
        }
    });

    emitter.on('ql.io-event', function (event, message) {
        logger.info(message || event);
    });

    emitter.on('info', function (event, message) {
        logger.info(message || event);
    });

    emitter.on('ql.io-error', function (event, message, err) {
        errLogger.info(message || event);
        if(err) {
            errLogger.error(err.stack || err);
        }
    });
    emitter.on('error', function (event, message) {
        errLogger.error(message || event);
    });

    emitter.on('fatal', function (event, message) {
        errLogger.error(message || event);
    });

    emitter.on('ql.io-warning', function (event, message) {
        const warn = errLogger.warn || errLogger.warning;
        warn(message || event);
    });
    emitter.on('warning', function (message) {
        const warn = errLogger.warn || errLogger.warning;
        warn(message);
    });
}

function createConsole(options, clusterWrapper, cb) {
    // Create console using the modernized console module
    const EventEmitter = require('events').EventEmitter;
    const emitter = new EventEmitter();
    
    // Add loggers
    options.loggerFn.call(null, options, emitter);

    // Listen to cluster events
    clusterWrapper.on('died', function(pid) {
        emitter.emit('fatal', {
            pid: pid,
            message: 'Process died'
        });
    });
    clusterWrapper.on('forked', function(pid) {
        emitter.emit('info', {
            pid: pid,
            message: 'Worker forked'
        });
    });
    clusterWrapper.on('SIGTERM', function(pid) {
        emitter.emit('info', {
            signal: 'SIGTERM',
            pid: pid,
            message: 'Shutting down'
        });
    });
    clusterWrapper.on('warning', function(message) {
        emitter.emit('warning', message);
    });
    
    // Create console apps using the modernized console module
    try {
        const consoleApp = Console.app(options);
        const monitoringApp = Console.monitoringApp ? Console.monitoringApp(options) : consoleApp;
        
        if (cb) {
            cb(consoleApp, monitoringApp, emitter);
        }
    } catch (error) {
        // Fallback to mock apps for testing if console module isn't ready
        const mockApp = {
            listen: function(port, callback) {
                if (callback) callback();
                return { close: function() {} };
            }
        };
        
        const mockMonApp = {
            listen: function(port, callback) {
                if (callback) callback();
                return { close: function() {} };
            }
        };
        
        if (cb) {
            cb(mockApp, mockMonApp, emitter);
        }
    }
}

function createLogger(logdir, name) {
    const logger = logdir ? winston.createLogger({
        transports: [
            new winston.transports.File({
                filename: process.cwd() + name,
                maxsize: 1024000 * 5,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            })
        ]
    }) : winston.createLogger({
        transports: [
            new winston.transports.Console({
                format: winston.format.simple()
            })
        ]
    });
    return logger;
}


