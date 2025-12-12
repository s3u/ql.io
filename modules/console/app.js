/*
 * Copyright 2012 eBay Software Foundation
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

const winston = require('winston'),
    express = require('express'),
    http = require('http'),
    bodyParser = require('body-parser'),
    multer = require('multer'),
    browserify = require('browserify'),
    headers = require('headers'),
    fs = require('fs'),
    os = require('os'),
    util = require('util'),
    validator = require('validator'),
    { XMLParser } = require('fast-xml-parser'),
    path = require('path'),
    Engine = require('ql.io-engine'),
    MutableURI = require('ql.io-mutable-uri'),
    _ = require('underscore'),
    WebSocketServer = require('websocket').server,
    compress = require('./lib/compress.js').compress,
    formidable = require('formidable'),
    cacheUtil = require('./lib/cache-util.js');

exports.version = require('./package.json').version;

// Create Winston logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

process.on('uncaughtException', function(error) {
    logger.error(error.stack);
});

const skipHeaders = ['connection', 'host', 'referer', 'content-length', 'accept', 'accept-charset',
    'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
    'transfer-encoding', 'upgrade'];

const Console = module.exports = function(opts, cb) {

    opts = opts || {};

    const cache = opts.cache = cacheUtil.startCache(opts.config);

    const engine = new Engine(opts);

    const app = this.app = express();
    const server = this.server = http.createServer(app);

    // Monitor App to provide VI page, markup/markdown feature.
    const monApp = this.monApp = express();
    const monServer = this.monServer = http.createServer(monApp);

    // Remains true until the app receives a 'close' event. Once this event is received, the app
    // sends 'connection: close' on responses (except for express served responses) and ends
    // the connection. See the app.on('close') handler below.
    let serving;
    server.on('listening', function() {
        serving = true;
    });

    app.enable('case sensitive routes'); // Default routes are not case sensitive

    // Create XML parser instance
    const xmlParser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
        parseNodeValue: true
    });

    // Custom middleware for XML parsing
    const xmlBodyParser = function(req, res, next) {
        if (req.get('content-type') === 'application/xml') {
            let buf = '';
            req.setEncoding('utf8');
            req.on('data', function (chunk) {
                buf += chunk;
            });
            req.on('end', function () {
                try {
                    req.body = xmlParser.parse(buf);
                    next();
                }
                catch(err) {
                    next(err);
                }
            });
        } else {
            next();
        }
    };

    // Custom middleware for opaque body parsing
    const opaqueBodyParser = function(req, res, next) {
        if (req.get('content-type') === 'opaque') {
            let buf = '';
            req.setEncoding('utf8');
            req.on('data', function (chunk) {
                buf += chunk;
            });
            req.on('end', function () {
                try {
                    req.body = buf;
                    next();
                }
                catch(err) {
                    next(err);
                }
            });
        } else {
            next();
        }
    };

    // Custom multipart parser middleware using formidable
    const multipartParser = function(req, res, next) {
        const contentType = req.get('content-type') || '';
        if (contentType.indexOf('multipart/') === 0) {
            const form = new formidable.IncomingForm(), parts = [];

            form.onPart = function(part) {
                const chunks = [];
                let idx = 0, size = 0;

                part.on('data', function(c) {
                    chunks[idx++] = c;
                    size += c.length;
                });

                part.on('end', function() {
                    const buf = Buffer.alloc(size);
                    let i = 0, idx = 0;
                    while (i < chunks.length) {
                        idx = idx + chunks[i++].copy(buf, idx);
                    }
                    const p = { 'name' : part.name, 'size' : idx, 'data' : buf };
                    parts.push(p);
                });

                part.on('error', function(err) {
                    next(err);
                });
            };

            form.parse(req, function(err, fields, files) {
                req.body = parts.splice(0, 1); // by our convention the first part is the body
                req.parts = parts;
                if (err) {
                    next(err);
                } else {
                    next();
                }
            });
        } else {
            next();
        }
    };

    // Setup body parsing middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(xmlBodyParser);
    app.use(opaqueBodyParser);
    app.use(multipartParser);
    const respHeaders = require(__dirname + '/lib/middleware/resp-headers');
    app.use(respHeaders());
    if(opts['enable console']) {
        // Serve static assets directly with Express (more secure than connect-assetmanager)
        app.use('/scripts', express.static(path.join(__dirname, 'public/scripts')));
        app.use('/css', express.static(path.join(__dirname, 'public/css')));

        app.set('views', __dirname + '/public/views');
        app.use(express.static(__dirname + '/public'));
        app.set('view engine', 'html');
        app.engine('html', require('ejs').renderFile);

        // The require below has paths prepended so that they can be loaded relative to this
        // (console) module and not its dependents. If not, Node would look for those modules
        // in the app's node_modules, which introduces a dependency from app to these modules.
        app.use(browserify(
            {
                mount : '/scripts/compiler.js',
                require : [ 'ql.io-compiler',
                    'headers',
                    'mustache',
                    'events'],
                filter : require('uglify-js')
            }));
        app.get('/console', function(req, res) {
            res.render(__dirname + '/public/views/console/index.ejs', {
                title: 'ql.io',
                layout: 'console-layout',
                script: req.query.s || '-- Type ql script here - all keywords must be in lower case'
            });
        });

        // Add the home page to the console app
        app.get('/', function(req, res) {
            res.redirect('/console');
        });
    }

    // register routes
    const routes = engine.routes.verbMap;
    _.each(routes, function(verbRoutes, uri) {
        _.each(verbRoutes, function(verbRouteVariants, verb) {
            engine.emit(Engine.Events.EVENT, {}, 'Adding route ' + uri + ' for ' + verb);
            // Map 'del' to 'delete' for Express 4.x compatibility
            const expressVerb = verb === 'del' ? 'delete' : verb;
            app[expressVerb](uri, function(req, res) {
                const holder = {
                    params: {},
                    headers: {},
                    parts: {},
                    routeParams: {},
                    connection: {
                        remoteAddress: req.connection.remoteAddress
                    }
                };

                // get all query params
                collectHttpQueryParams(req, holder, false);

                // find a route (i.e. associated cooked script)
                // routes that distinguish required and optional params
                const route = _(verbRouteVariants).chain()
                    .filter(function (verbRouteVariant){const defaultKeys = _.chain(verbRouteVariant.query)
                            .keys()
                            .filter(function(k){
                                let querykey = verbRouteVariant.query[k];
                                if (querykey.indexOf('^') != -1) {
                                    querykey = querykey.substr(1);
                                }
                                return _.has(verbRouteVariant.routeInfo.defaults, querykey);
                            })
                            .value();
                        // missed query params that are neither defaults nor user provided
                        const missed = _.difference(_.keys(verbRouteVariant.query), _.union(defaultKeys, _.keys(holder.params)));
                        const misrequired = _.filter(missed, function(key){
                            if (verbRouteVariant.routeInfo.optparam){
                                // if with optional params, find if any required param is missed
                                return verbRouteVariant.query[key] && verbRouteVariant.query[key].indexOf("^") == 0;
                            }
                            else {
                                // everything is required
                                return missed;
                            }
                        });
                        return !misrequired.length;
                    })
                    .max(function (verbRouteVariant){
                        if (!verbRouteVariant.routeInfo.optparam){
                            return 0;
                        }
                        // with optional param
                        const matchCount = _.intersection(_.keys(holder.params), _.keys(verbRouteVariant.query)).length;
                        const requiredCount = _.filter(_.keys(verbRouteVariant.query), function(key){
                            return verbRouteVariant[key] && verbRouteVariant[key].indexOf("^") == 0;
                        }).length;
                        return matchCount - requiredCount;

                    })
                    .value();

                if (!route) {
                    res.writeHead(400, 'Bad input', {
                        'content-type' : 'application/json'
                    });
                    res.write(JSON.stringify({'err' : 'No matching route'}));
                    res.end();
                    return;
                }


                // collect default query params if needed
                _.each(route.routeInfo.defaults, function(defaultValue, queryParam) {
                    if (queryParam.indexOf('^') != -1){
                        queryParam = queryParam.substr(1);
                    }
                    holder.routeParams[queryParam] = defaultValue;
                });
                const keys = _.keys(req.params);
                _.each(keys, function(key) {
                    holder.routeParams[key] = req.params[key];
                });

                _.each(route.query, function(queryParam, paramName) {
                    if (holder.params[paramName]) {
                        if (queryParam.indexOf('^') != -1){
                            queryParam = queryParam.substr(1);
                        }
                        holder.routeParams[queryParam] = holder.params[paramName];
                    }
                    else if (!holder.routeParams[queryParam]) {
                        holder.routeParams[queryParam] = null;
                    }
                });

                // collect headers
                collectHttpHeaders(req, holder);
                holder.connection = {
                    remoteAddress: req.connection.remoteAddress
                };

                holder.parts = req.parts;

                // Start the top level event
                const urlEvent = engine.beginEvent({
                    clazz: 'info',
                    type: 'route',
                    name: route.routeInfo.method.toUpperCase() + ' ' + route.routeInfo.path.value,
                    message: {
                        ip: req.connection.remoteAddress,
                        method: req.method,
                        path: req.url,
                        headers: req.headers
                    },
                    cb: function(err, results) {
                        return handleResponseCB(req, res, execState, err, results);
                    }
                });

                let execState = [];
                engine.execute(route.script,
                    {
                        request: holder,
                        route: uri,
                        context: req.body || {},
                        parentEvent: urlEvent.event
                    },
                    function(emitter) {
                        setupExecStateEmitter(emitter, execState, req.query.events);
                        setupCounters(emitter);
                        emitter.on('end', urlEvent.cb);
                    }
                );
            });
        });
    });

    // HTTP indirection for 'show tables' command
    app.get('/tables', function(req,res){
        const holder = {
            headers: {}
        };

        const isJson = ((req.headers || {}).accept || '').search('json') > 0 ||
            (req.query.format || '').trim().toLowerCase() === 'json';

        function routePage(res, execState, results){
            res.header['Link'] = headers.format('Link', {
                href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                rel : ['execstate']
            });
            res.render(__dirname + '/public/views/api/tables.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/api-layout',
                tables: results
            });
        }

        // Start the top level event
        const urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return isJson || err ?
                    handleResponseCB(req, res, execState, err, results) :
                    routePage(res,execState,results.body);
            }
        });

        const execState = [];
        engine.execute('show tables',
            {
                request: holder,
                parentEvent: urlEvent.event
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.query.events);
                setupCounters(emitter);
                emitter.on('end', urlEvent.cb);
            }
        );
    });

    // HTTP indirection for 'describe <table>' command  and it returns json (and not html)
    app.get('/table', function(req,res){
        const holder = {
            headers: {}
        };

        const isJson = ((req.headers || {}).accept || '').search('json') > 0 ||
            (req.query.format || '').trim().toLowerCase() === 'json';

        function routePage(res, execState, result){
            res.header['Link'] = headers.format('Link', {
                href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                rel : ['execstate']
            });
            res.render(__dirname + '/public/views/api/tableInfo.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/api-layout',
                tableInfo: result,
                routes:
                    _(result.routes).chain()
                        .map(function(route){
                            const parse = new MutableURI(route);
                            return {
                                method: parse.getParam('method'),
                                path: parse.getParam('path'),
                                about: route
                            };
                        })
                        .value()
            });
        }

        const name = req.query.name;

        if (!name) {
            res.writeHead(400, 'Bad input', {
                'content-type' : 'application/json'
            });
            res.write(
                JSON.stringify({'err' : 'Missing table name: Usage /table?name=some-tablename'}
                ));
            res.end();
            return;
        }

        // Start the top level event
        const urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return isJson || err ?
                    handleResponseCB(req, res, execState, err, results) :
                    routePage(res,execState,results.body);
            }
        });

        const execState = [];
        engine.execute('describe' + decodeURIComponent(name),
            {
                request: holder,
                parentEvent: urlEvent.event
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.query.events);
                setupCounters(emitter);
                emitter.on('end', urlEvent.cb);
            }
        );
    });

    // HTTP indirection for 'show routes' command
    app.get('/api', function(req,res){
        const holder = {
            params: {},
            headers: {}
        };

        const isJson = ((req.headers || {}).accept || '').search('json') > 0 ||
            (req.query.format || '').trim().toLowerCase() === 'json';

        function routePage(res, execState, results){
            res.header['Link'] = headers.format('Link', {
                href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                rel : ['execstate']
            });
            res.render(__dirname + '/public/views/api/api.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/api-layout',
                routes: results
            });
        }

        // Start the top level event
        const urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return isJson || err ?
                    handleResponseCB(req, res, execState, err, results) :
                    routePage(res,execState,results.body);
            }
        });

        const execState = [];
        engine.execute('show routes',
            {
                request: holder,
                parentEvent: urlEvent.event
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.query.events);
                setupCounters(emitter);
                emitter.on('end', urlEvent.cb);
            }
        );
    });

    // HTTP indirection for 'describe route "<route>" using method <http-verb>' command
    app.get('/route', function(req,res){
        const holder = {
            params: {},
            headers: {}
        };
        const path = req.query.path;
        const method = req.query.method;

        if (!path || !method) {
            res.writeHead(400, 'Bad input', {
                'content-type' : 'application/json'
            });
            res.write(
                JSON.stringify({'err' : 'Missing path name or method: Usage /route?path=some-path&method=http-method'}
                ));
            res.end();
            return;
        }

        const isJson = ((req.headers || {}).accept || '').search('json') > 0 ||
            (req.query.format || '').trim().toLowerCase() === 'json';

        function routePage(res, execState, result){
            res.header['Link'] = headers.format('Link', {
                href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                rel : ['execstate']
            });
            res.render(__dirname + '/public/views/api/routeInfo.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/api-layout',
                routeInfo: result,
                related:
                    _(result.related).chain()
                        .map(function(route){
                            const parse = new MutableURI(route);
                            return {
                                method: parse.getParam('method'),
                                path: parse.getParam('path'),
                                about: route
                            };
                        })
                        .value(),
                tables:
                    _(result.tables).chain()
                        .map(function(table){
                            const parse = new MutableURI(table);
                            return {
                                name: parse.getParam('name'),
                                about: table
                            };
                        })
                        .value()
            });
        }

        // Start the top level event
        const urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return isJson || err ?
                    handleResponseCB(req, res, execState, err, results) :
                    routePage(res,execState,results.body);
            }
        });

        const execState = [];
        engine.execute('describe route "' + decodeURIComponent(path) + '" using method ' + method,
            {
                request: holder,
                parentEvent: urlEvent.event
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.query.events);
                setupCounters(emitter);
                emitter.on('end', urlEvent.cb);
            }
        );
    });

    /*
     * '/q' is disabled only if the console is created with config, 'enable q' : false.
     */
    const enableQ = opts['enable q'] === undefined ? true : opts['enable q'];

    const q =  function(req, res) {
        const holder = {
            params: {},
            headers: {},
            parts: {},
            connection: {
                remoteAddress: req.connection.remoteAddress
            }
        };
        const query = req.query.s;
        if (!query) {
            res.writeHead(400, 'Bad input', {
                'content-type' : 'application/json'
            });
            res.write(JSON.stringify({'err' : 'Missing query'}));
            res.end();
            return;
        }
        // Note: Do not escape the query - it needs to be valid QL syntax for the parser
        collectHttpQueryParams(req, holder, true);
        collectHttpHeaders(req, holder);
        const urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return handleResponseCB(req, res, execState, err, results);
            }
        });
        const execState = [];
        engine.execute(query,
            {
                request: holder,
                parentEvent: urlEvent.event
            }, function(emitter) {
                setupExecStateEmitter(emitter, execState, req.query.events);
                emitter.on('end', urlEvent.cb);
            }
        );
    }


    if(enableQ) {
        app.get('/q', q);
        app.post('/q', q);
        app.put('/q', q);
        app.delete('/q', q);
        app.patch('/q', q);
    }

    // 404 Handling
    app.use(function(req, res, next) {
        compress(req, res, {logEmitter : engine});
        const msg = 'Cannot ' + req.method + ' ' + validator.escape(req.url || '');
        const accept = (req.headers || {}).accept || '';
        if (accept.search('json') > 0) {
            res.writeHead(404, {
                'content-type' : 'application/json'
            });
            res.write(JSON.stringify({ error: msg }));
            res.end();
            return;
        }
        res.writeHead(404, {
            'content-type' : 'text/plain'
        });
        res.write(msg);
        res.end();
    });

    // Error-handling middleware
    app.use(function(err, req, res, next){
        compress(req, res, {logEmitter : engine});
        // TODO call next() if recoverable, else next(err).
        const status = err.status || 500;
        const errorMsg = err.msg || err.message || err.toString();
        const msg =  "Server Error - " + validator.escape(errorMsg);
        const accept = (req.headers || {}).accept || '';
        if (accept.search('json') > 0) {
            res.writeHead(status, {
                'content-type' : 'application/json'
            });
            res.write(JSON.stringify({ error: msg }));
            res.end();
            return;
        }
        res.writeHead(status, {
            'content-type' : 'text/plain'
        });
        res.write(msg);
        res.end();
    });

    // Heartbeat - make sure to clear this on 'close'
    // TODO: Other details to include
    const heartbeat = setInterval(function () {
        engine.emit(Engine.Events.HEART_BEAT, {
            pid: process.pid,
            uptime: Math.round(process.uptime()),
            freemem: os.freemem()
        });
    }, 60000);

    // Let the Engine cleanup during shutdown
    server.on('close', function() {
        clearInterval(heartbeat);
        cacheUtil.stopCache(cache);
        serving = false;
    });

    // Also listen to WebSocket requests
    const wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });
    wsServer.on('request', function(request) {
        const connection = request.accept('ql.io-console', request.origin);
        let events = [];
        connection.on('message', function(message) {
            const event = JSON.parse(message.utf8Data);
            if(event.type === 'events') {
                const arr = event.data;
                try {
                    events = JSON.parse(arr);
                }
                catch(e) {
                    events = [];
                    _.each(Engine.Events, function(event) {
                        events.push(event);
                    })
                }
                connection.sendUTF(JSON.stringify({
                    type: 'events',
                    data: '{}'
                }));
            }
            else if (event.type === 'script') {
                const script = event.data;
                const pack = {
                    request: {
                        headers: {},
                        params: {},
                        connection: {
                            remoteAddress: connection.remoteAddress
                        }
                    }
                };
                const cb = function(emitter) {
                    _.each(events, function(event) {
                        emitter.on(event, function(packet) {
                            // Writes events to the client
                            connection.sendUTF(JSON.stringify({
                                type: packet.type ? packet.type : event,
                                data: packet
                            }))
                        });
                    });
                    setupCounters(emitter);
                    emitter.on('end', function(err, results) {
                        if(err) {
                            const packet = {
                                headers: {
                                    'content-type': 'application/json'
                                },
                                body: err.stack || err
                            };
                            connection.sendUTF(JSON.stringify({
                                type: Engine.Events.SCRIPT_RESULT,
                                data: packet
                            }));
                        }
                        else {
                            connection.sendUTF(JSON.stringify({
                                type: Engine.Events.SCRIPT_RESULT,
                                data: results
                            }));
                        }
                        if(!serving) {
                            connection.end();
                        }
                    })
                };
                if (script.indexOf('__debug__') == 0){
                    script = script.replace('__debug__','')
                    engine.execute(script, pack, cb, true);
                }
                else {
                    engine.execute(script, pack, cb);
                }

            }
            else if (event.type === 'debug'){
                engine.debugData[event.emitterID].emit(Engine.Events.DEBUG_STEP);
            }
            else if (event.type === 'kill') {
                if (engine.debugData.hasOwnProperty(event.id)) {
                    engine.debugData[event.id].emit(Engine.Events.KILL);
                }
            }
        });
        connection.on('close', function() {
            connection.close();
        });
    });

    function collectHttpQueryParams(req, holder, ignoreS) {
        // Collect req params (with sanitization)
        _.each(req.query, function(v, k) {
            if (ignoreS && k == 's') {
                return;
            }
            if (_.isArray(v)) {
                holder.params[k] = [];
                _.each(v, function(val) {
                    holder.params[k].push(validator.escape(val));
                });
            }
            else {
                holder.params[k] = validator.escape(v);
            }
        });
    }

    function collectHttpHeaders(req, holder) {
        // Collect req headers (with sanitization)
        _.each(req.headers, function(v, k) {
            if (skipHeaders.indexOf(k) === -1) {
                if (_.isArray(v)) {
                    holder.headers[k] = [];
                    _.each(v, function(val) {
                        holder.headers[k].push(validator.escape(val));
                    });
                }
                else {
                    holder.headers[k] = validator.escape(v);
                }
            }
        });
    }

    function setupExecStateEmitter(emitter, execState, eventParam) {
        let obj, events;
        try {
            obj = JSON.parse(eventParam);
            obj = obj.data;
            events = JSON.parse(obj);
        }
        catch(e) {
            events = [];
        }

        _.each(events, function(event) {
            emitter.on(event, function(packet) {
                execState.push(packet);
            });
        });
    }

    // Send to master
    function setupCounters(emitter) {
        if(process.send) {
            emitter.on(Engine.Events.SCRIPT_ACK, function(packet) {
                process.send({
                    type: 'counter',
                    name: Engine.Events.SCRIPT_ACK,
                    pid: process.pid});
            })
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(packet) {
                process.send({
                    type: 'counter',
                    name: Engine.Events.STATEMENT_REQUEST,
                    pid: process.pid});
            })
            emitter.on(Engine.Events.STATEMENT_RESPONSE, function(packet) {
                process.send({
                    type: 'counter',
                    name: Engine.Events.STATEMENT_RESPONSE,
                    pid: process.pid});
            })
            emitter.on(Engine.Events.SCRIPT_DONE, function(packet) {
                process.send({
                    type: 'counter',
                    name: Engine.Events.SCRIPT_DONE,
                    pid: process.pid});
            })
        }
    }

    function handleResponseCB(req, res, execState, err, results) {
        compress(req, res, {logEmitter : engine});   // TODO replace with a middleware
        const reqSize = req.url.length + JSON.stringify(req.headers).length + req.method.length +1
        const resSize = results ? JSON.stringify(results).length : JSON.stringify(err).length
        engine.emitEvent("User's request size is " + reqSize + ", response size is "+resSize)

        const cb = req.query.callback;
        if (err) {
            const status = err.status || 400;
            res.writeHead(status, {
                'content-type' : 'application/json'
            });
            if (cb) {
                res.write(cb + '(');
            }
            res.write(JSON.stringify(err));
            if (cb) {
                res.write(cb + ')');
            }
            res.end();
        }
        else {
            const contentType = results.headers['content-type'];
            const h = {
                'Connection': serving ? 'keep-alive' : 'close',
                'Transfer-Encoding' : 'chunked'
            };
            _.each(results.headers, function(value, name) {
                h[name] = value;
            });
            h['content-type'] = cb ? 'application/javascript' : contentType;

            if(execState.length > 0) {
                h['Link'] = headers.format('Link', {
                    href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                    rel : ['execstate']
                });
            }
            res.writeHead(200, h);
            if (cb) {
                res.write(cb + '(');
            }
            if(results.body) {
                if (contentType === 'application/json') {
                    res.write(JSON.stringify(results.body));
                }
                else {
                    res.write(results.body);
                }
            }
            if (cb) {
                res.write(')');
            }
            res.end();
        }
        // If we get a 'close' event, end on all pending connections.
        if(!serving) {
            req.connection.end();
        }
    }

    // Add convenience methods for backward compatibility
    this.listen = function(port, callback) {
        return server.listen(port, callback);
    };
    
    this.close = function(callback) {
        return server.close(callback);
    };

    // For backward compatibility with tests that expect c.c.listen()
    this.c = this;
    
    // For backward compatibility with tests that expect c.appServer.listen()
    this.appServer = this;

    // The caller gets the app and the engine/event emitter
    if(cb) {
        cb(app, monApp, engine);
    }
};
