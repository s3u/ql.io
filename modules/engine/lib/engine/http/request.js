/*
 * Copyright 2012 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const _ = require('underscore');
const assert = require('assert');
const eventTypes = require('../event-types.js');
const http = require('http');
const https = require('https');
const response = require('./response.js');
const zlib = require('zlib');
const { v4: uuid } = require('uuid');
const jsonfill = require('../jsonfill.js');
const FormData = require('form-data');
const charlie = require('charlie');

let maxResponseLength;

/**
 * Configures proxy settings based on host and configuration
 * @param {Object} args - Request arguments containing config
 * @param {string} host - Target hostname
 * @returns {Object} Proxy configuration with useProxy, proxyHost, proxyPort
 */
function configureProxy(args, host) {
    let useProxy = false;
    let proxyHost, proxyPort;

    if(args.config?.proxy) {
        const proxyConfig = args.config.proxy;
        
        // Check for specific host configuration first
        if (proxyConfig[host] && proxyConfig[host].host) {
            proxyHost = proxyConfig[host].host;
            const portValue = parseInt(proxyConfig[host].port, 10);
            if (isNaN(portValue) || portValue < 1 || portValue > 65535) {
                throw new Error(`Invalid proxy port for ${host}: ${proxyConfig[host].port}`);
            }
            proxyPort = portValue;
            useProxy = true;
        }
        // If no specific host config or host config has no host property, check wildcard
        else if (proxyConfig['*'] && proxyConfig['*'].host) {
            proxyHost = proxyConfig['*'].host;
            const portValue = parseInt(proxyConfig['*'].port, 10);
            if (isNaN(portValue) || portValue < 1 || portValue > 65535) {
                throw new Error(`Invalid wildcard proxy port: ${proxyConfig['*'].port}`);
            }
            proxyPort = portValue;
            useProxy = true;
        }
        // If specific host config exists but has no host property, disable proxy
        else if (proxyConfig[host] && !proxyConfig[host].host) {
            useProxy = false;
        }
        // No proxy configuration matches
        else {
            useProxy = false;
        }
    }

    return { useProxy, proxyHost, proxyPort };
}

exports.send = function(args) {
    const isTls = args.uri.indexOf('https://') === 0;
    
    let url;
    try {
        url = new URL(args.uri);
    } catch (e) {
        throw new Error(`URI [${args.uri}] is invalid: ${e.message}`);
    }
    
    const host = url.hostname;
    assert.ok(host, `Host of URI [${args.uri}] is invalid`);
    const port = url.port || (isTls ? 443 : 80);
    assert.ok(port, `Port of URI [${args.uri}] is invalid`);
    const path = url.pathname + (url.search || '');

    assert.ok(args.name, 'table name not specified');

    const { useProxy, proxyHost, proxyPort } = configureProxy(args, host);

    const options = {
        host: useProxy ? proxyHost : host,
        port: useProxy ? proxyPort : port,
        path: useProxy ? `${url.protocol}//${host}${path}` : path,
        method: args.method,
        headers: args.headers
    };

    const client = isTls ? https : http;
    // Avoid request backlog on any given socket.
    client.globalAgent.maxSockets = 1000;
    // Send
    sendMessage(args, client, options, 0);
}

// Async version for future use
exports.sendAsync = async function(args) {
    const isTls = args.uri.indexOf('https://') === 0;
    
    let url;
    try {
        url = new URL(args.uri);
    } catch (e) {
        throw new Error(`URI [${args.uri}] is invalid: ${e.message}`);
    }
    
    const host = url.hostname;
    assert.ok(host, `Host of URI [${args.uri}] is invalid`);
    const port = url.port || (isTls ? 443 : 80);
    assert.ok(port, `Port of URI [${args.uri}] is invalid`);
    const path = url.pathname + (url.search || '');

    assert.ok(args.name, 'table name not specified');

    const { useProxy, proxyHost, proxyPort } = configureProxy(args, host);

    const options = {
        host: useProxy ? proxyHost : host,
        port: useProxy ? proxyPort : port,
        path: useProxy ? `${url.protocol}//${host}${path}` : path,
        method: args.method,
        headers: args.headers
    };

    const client = isTls ? https : http;
    // Avoid request backlog on any given socket.
    client.globalAgent.maxSockets = 1000;
    
    // Convert to Promise-based
    return await sendMessageAsync(args, client, options, 0);
}

function putInCache(key, cache, result, res, expires) {
    if (key && cache) {
        cache.put(key, {result:result, res:{headers:res.headers,
            statusCode:res.statusCode}}, expires);
    }
}

function sendHttpRequest(client, options, args, start, timings, reqStart, key, cache, expires, uniqueId, status, retry, redirects) {

    var packet = {
        line: args.statement.line,
        uuid: args.parentEvent.uuid,
        method: options.method,
        uri: args.uri,
        headers: [],
        start: reqStart,
        type: eventTypes.STATEMENT_REQUEST
    };

    _.each(args.headers, function(v, n) {
        packet.headers.push({
            name: n,
            value: v
        });
    });

    var responseLength = 0;
    args.httpReqTx = args.logEmitter.beginEvent({
        parent: args.parentEvent,
        name: 'http-request',
        message: packet,
        cb: function(err, results){
            var processingEvent = args.logEmitter.beginEvent({
                parent: args.parentEvent,
                name: 'processingEvent',
                message: 'calculates cpu time',
                cb: function(){}
            })
            if(args.logEmitter){
                var reqlength = JSON.stringify(options.headers).length +options.host.length;
                if(options.body){
                    reqlength += JSON.stringify(options.body).length
                }
                args.logEmitter.emitEvent(JSON.stringify({
                    reqSize: reqlength,
                    resSize: responseLength
                }))
            }
            processingEvent.end();
            var toreturn = args.cb(err, results);
            return toreturn

        }
    });

    if(args.emitter) {
        packet.id = uniqueId;
        // Add the body here to avoid logging body to logEmitter
        if(args.body) {
            packet.body = args.body;
        }
        args.emitter.emit(packet.type, packet);

    }

    if (args.parts && args.statement.parts) {
        var form = new FormData();
        if (args.body) {
            form.append('body', Buffer.from(args.body));
        }

        var tmp_parts = { 'req' : { 'parts' : args.parts }};

        _.each(args.statement.parts, function(p) {
            var part = jsonfill.lookup(p, tmp_parts);

            if (part) {
                form.append(part.name, part.data);
            }
        });

        // Fix for form-data v4.x API change
        const formHeaders = form.getHeaders ? form.getHeaders() : form.getCustomHeaders(args.resource.body.type);
        _.extend(options.headers, formHeaders);
    }

    var followRedirects = true, maxRedirects = 10;

    // Exponential backff with a reset
    var minDelay = args.statement.minDelay|| 500;
    var maxDelay = args.statement.maxDelay || 30000;
    var timeout = args.statement.timeout || 10000;
    var decision = charlie.ask([args.uri, args.name], minDelay, maxDelay);
    if(decision.state === 'nogo') {
        var err = new Error('Back-off in progress');
        err.uri = args.uri;
        err.status = 502;
        err.start = decision.start;
        err.count = decision.count;
        err.delay = decision.delay;
        return args.httpReqTx.cb(err);
    }

    // As of node 0.6.17, 'timeout' events can get emitted after we get a valid response from
    // the socket. We need to work-around that for now.
    var happy = false; // This flag keeps track of whether we're getting response and to skip timeout events.
    var clientRequest = client.request(options, function (res) {
        // Tell charlie that things are good.
        charlie.ok([args.uri, args.name]);

        if (followRedirects && (res.statusCode >= 301 && res.statusCode <= 307) &&
            (options.method.toUpperCase() === 'GET' || options.method.toUpperCase() === 'HEAD')) {
            res.socket.destroy();
            if (res.statusCode === 305) { // Log but don't follow
                args.logEmitter.emitWarning(args.httpReqTx.event, JSON.stringify({
                    status: res.statusCode, headers: res.headers
                }));
                var err = new Error('Received status code 305 from downstream server');
                err.uri = args.uri;
                err.status = 502;
                return args.httpReqTx.cb(err);
            }
            else if (res.statusCode !== 304 && res.statusCode !== 306) { // Only follow 301, 302, 303, 307
                if (res.headers.location) {
                    if (redirects++ >= maxRedirects) {
                        args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                            redirects: maxRedirects
                        }));
                        var err = new Error('Exceeded max redirects');
                        err.uri = args.uri;
                        err.status = 502;
                        return args.httpReqTx.cb(err);
                    }

                    var location;
                    try {
                        location = new URL(res.headers.location);
                        // Absolute URL
                        options.host = location.hostname;
                        options.port = location.port || (location.protocol === 'https:' ? 443 : 80);
                        options.path = location.pathname + (location.search || '');
                    } catch (e) {
                        // Relative URL - resolve against original URL
                        try {
                            location = new URL(res.headers.location, args.uri);
                            options.host = location.hostname;
                            options.port = location.port || (location.protocol === 'https:' ? 443 : 80);
                            options.path = location.pathname + (location.search || '');
                        } catch (e2) {
                            throw new Error('Invalid redirect location: ' + res.headers.location);
                        }
                    }

                    args.logEmitter.emitEvent(args.httpReqTx.event, {
                        redirects: redirects,
                        status: res.statusCode,
                        location: res.headers.location
                    });

                    // End the current event.
                    args.logEmitter.endEvent(args.httpReqTx.event, 'Redirecting to ' + res.headers.location);

                    sendHttpRequest(client, options, args, start, timings, reqStart, key, cache, expires, uniqueId, status, retry, redirects);
                    return;
                }
                else {
                    args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                        message: 'Missing location header',
                        status: res.statusCode,
                        headers: res.headers
                    }));
                    var err = new Error('Missing Location header in redirect');
                    err.uri = args.uri;
                    err.status = 502;
                    return args.httpReqTx.cb(err);
                }
            }
        }

        var bufs = []; // array for bufs for each chunk
        var contentEncoding = res.headers['content-encoding'];
        var zipped = false, unzip;
        var result;
        if (contentEncoding) {
            contentEncoding = contentEncoding.toLowerCase();
            if (contentEncoding === 'gzip') {
                unzip = zlib.createGunzip();
            }
            else if (contentEncoding === 'deflate') {
                unzip = zlib.createInflate();
            }
            else {
                var err = new Error('Content-Encoding \'' + contentEncoding + '\' is not supported');
                err.uri = args.uri;
                err.status = 502;
                args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                    message: 'Content encoding ' + contentEncoding + ' is not supported'
                }));
                res.socket.destroy();
                return args.httpReqTx.cb(err);
            }
            zipped = true;

            unzip.on('data', function (chunk) {
                bufs.push(chunk);
            });
            unzip.on('end', function () {
                result = response.parseResponse(timings, reqStart, args, res, bufs);
                putInCache(key, cache, result, res, expires);
                response.exec(timings, reqStart, args, uniqueId, res, start, result, options);
            });
            unzip.on('error', function (err) {
                var err = new Error('Corrupted stream');
                err.uri = args.uri;
                err.status = 502;
                args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                    message: contentEncoding + ' stream corrupted'
                }));
                res.socket.destroy();
                return args.httpReqTx.cb(err);
            });
        }

        res.on('data', function (chunk) {
            happy = true;
            if (zipped) {
                // TODO Check for corrupted stream. Empty 'bufs' may indicate invalid stream
                unzip.write(chunk);
            }
            else {
                // Chunk is a buf as we don't set any encoding on the response
                bufs.push(chunk);
            }
            responseLength += chunk.length;
            maxResponseLength = maxResponseLength || getMaxResponseLength(args.config, args.logEmitter);
            if (responseLength > maxResponseLength) {
                var err = new Error('Response length exceeds limit');
                err.uri = args.uri;
                err.status = 502;

                args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                    message: 'Response length ' + responseLength + ' exceeds config.maxResponseLength of ' + maxResponseLength
                }));
                res.socket.destroy();
                return args.httpReqTx.cb(err);
            }
        });
        res.on('end', function () {
            happy = true;
            if (zipped) {
                unzip.end();
            }
            else {
                result = response.parseResponse(timings, reqStart, args, res, bufs);
                putInCache(key, cache, result, res, expires);
                response.exec(timings, reqStart, args, uniqueId, res, start, result, options, status);
            }
        });
    });

    if (args.parts && form) {
        form.pipe(clientRequest);
        timings.send = Date.now() - reqStart;
    } else if (args.body) {
        clientRequest.write(args.body);
        timings.send = Date.now() - reqStart;
    }


    var timedout = false;
    clientRequest.setTimeout(timeout, function() {
        if(happy) {
            args.logEmitter.emitWarning(args.httpReqTx.event, {
                message: "'timeout' received when not expected"
            });
            return;
        }
        timedout = true;

        if (retry === 0 && args.statement.type === 'select') {
            _retry(args, client, options, 'timeout');
        }
        else {
            // No need to end/destroy the socket since node does it.
            charlie.notok([args.uri, args.name]);
            return args.httpReqTx.end({
                message: 'Request timed out',
                timeout: timeout,
                uri: args.uri,
                status: 502
            });
        }
    });
    clientRequest.on('error', function(err) {
        // timeout also triggers error
        if(timedout) {
            return;
        }
        // Destroy the socket first
        clientRequest.connection.destroy();

        args.logEmitter.emitError(args.httpReqTx.event, {
            message: err ? err.code || err.message : 'Network error'
        });
        // For select, retry once on network error
        if (!timedout && retry === 0 && args.statement.type === 'select') {
            _retry(args, client, options, 'Network Error');
        }
        else {
            charlie.notok([args.uri, args.name]);
            err = err || {
                message: err ? err.code || err.message : 'Network error'
            }
            err.uri = args.uri;
            err.status = 502;
            return args.httpReqTx.cb(err);
        }
    });
    clientRequest.end();
}

const _retry = (args, client, options, reason) => {
    const msg = `Retrying on ${reason} - ${args.uri}`;
    args.logEmitter.emitEvent(args.httpReqTx.event, {
        message: msg
    });
    // End the current event.
    args.logEmitter.endEvent(args.httpReqTx.event, msg);
    sendMessage(args, client, options, 1);
}

const _retryAsync = async (args, client, options, reason) => {
    const msg = `Retrying on ${reason} - ${args.uri}`;
    args.logEmitter.emitEvent(args.httpReqTx.event, {
        message: msg
    });
    // End the current event.
    args.logEmitter.endEvent(args.httpReqTx.event, msg);
    return await sendMessageAsync(args, client, options, 1);
}

function sendMessage(args, client, options, retry) {
    const start = Date.now();
    const { key, cache } = args;
    const expires = args.expires || 3600;
    const reqStart = Date.now();
    const timings = {
        blocked: -1,
        dns: -1,
        connect: -1,
        send: -1,
        wait: -1,
        receive: -1
    };

    if (key && cache) {
        cache.get(key, (err, result) => {
            if(err || !result?.data) {
                sendHttpRequest(client, options, args, start, timings, reqStart,
                    key, cache, expires, uuid(), undefined, retry, 0);
            }
            else {
                args.httpReqTx = args.logEmitter.beginEvent({
                    parent: args.parentEvent,
                    type: 'http-request',
                    message: key,
                    cb: args.cb
                });
                args.logEmitter.emitEvent(args.httpReqTx.event, {
                    'cache-key': key,
                    'hit': true
                });
                response.exec(timings, reqStart, args, uuid(), result.data.res, start, result.data.result, options);
            }
        });
    }
    else {
        sendHttpRequest(client, options, args, start, timings, reqStart, key, cache, expires, uuid(), undefined, retry, 0);
    }
}

// Async version of sendMessage
async function sendMessageAsync(args, client, options, retry) {
    const start = Date.now();
    const { key, cache } = args;
    const expires = args.expires || 3600;
    const reqStart = Date.now();
    const timings = {
        blocked: -1,
        dns: -1,
        connect: -1,
        send: -1,
        wait: -1,
        receive: -1
    };

    if (key && cache) {
        try {
            const result = await new Promise((resolve, reject) => {
                cache.get(key, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            if (!result?.data) {
                return await sendHttpRequestAsync(client, options, args, start, timings, reqStart,
                    key, cache, expires, uuid(), undefined, retry, 0);
            }
            else {
                args.httpReqTx = args.logEmitter.beginEvent({
                    parent: args.parentEvent,
                    type: 'http-request',
                    message: key,
                    cb: args.cb
                });
                args.logEmitter.emitEvent(args.httpReqTx.event, {
                    'cache-key': key,
                    'hit': true
                });
                return await response.execAsync(timings, reqStart, args, uuid(), result.data.res, start, result.data.result, options);
            }
        } catch (cacheError) {
            return await sendHttpRequestAsync(client, options, args, start, timings, reqStart,
                key, cache, expires, uuid(), undefined, retry, 0);
        }
    }
    else {
        return await sendHttpRequestAsync(client, options, args, start, timings, reqStart, key, cache, expires, uuid(), undefined, retry, 0);
    }
}

// Async version of sendHttpRequest
async function sendHttpRequestAsync(client, options, args, start, timings, reqStart, key, cache, expires, uniqueId, status, retry, redirects) {
    return new Promise((resolve, reject) => {
        const packet = {
            line: args.statement.line,
            uuid: args.parentEvent.uuid,
            method: options.method,
            uri: args.uri,
            headers: [],
            start: reqStart,
            type: eventTypes.STATEMENT_REQUEST
        };

        _.each(args.headers, function(v, n) {
            packet.headers.push({
                name: n,
                value: v
            });
        });

        let responseLength = 0;
        args.httpReqTx = args.logEmitter.beginEvent({
            parent: args.parentEvent,
            name: 'http-request',
            message: packet,
            cb: function(err, results){
                const processingEvent = args.logEmitter.beginEvent({
                    parent: args.parentEvent,
                    name: 'processingEvent',
                    message: 'calculates cpu time',
                    cb: function(){}
                });
                if(args.logEmitter){
                    let reqlength = JSON.stringify(options.headers).length + options.host.length;
                    if(options.body){
                        reqlength += JSON.stringify(options.body).length;
                    }
                    args.logEmitter.emitEvent(JSON.stringify({
                        reqSize: reqlength,
                        resSize: responseLength
                    }));
                }
                processingEvent.end();
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            }
        });

        if(args.emitter) {
            packet.id = uniqueId;
            // Add the body here to avoid logging body to logEmitter
            if(args.body) {
                packet.body = args.body;
            }
            args.emitter.emit(packet.type, packet);
        }

        if (args.parts && args.statement.parts) {
            const form = new FormData();
            if (args.body) {
                form.append('body', Buffer.from(args.body));
            }

            const tmp_parts = { 'req' : { 'parts' : args.parts }};

            _.each(args.statement.parts, function(p) {
                const part = jsonfill.lookup(p, tmp_parts);
                if (part) {
                    form.append(part.name, part.data);
                }
            });

            // Fix for form-data v4.x API change
            const formHeaders = form.getHeaders ? form.getHeaders() : form.getCustomHeaders(args.resource.body.type);
            _.extend(options.headers, formHeaders);
        }

        const followRedirects = true;
        const maxRedirects = 10;

        // Exponential backoff with a reset
        const minDelay = args.statement.minDelay || 500;
        const maxDelay = args.statement.maxDelay || 30000;
        const timeout = args.statement.timeout || 10000;
        const decision = charlie.ask([args.uri, args.name], minDelay, maxDelay);
        
        if(decision.state === 'nogo') {
            const err = new Error('Back-off in progress');
            err.uri = args.uri;
            err.status = 502;
            err.start = decision.start;
            err.count = decision.count;
            err.delay = decision.delay;
            return args.httpReqTx.cb(err);
        }

        // As of node 0.6.17, 'timeout' events can get emitted after we get a valid response from
        // the socket. We need to work-around that for now.
        let happy = false; // This flag keeps track of whether we're getting response and to skip timeout events.
        const clientRequest = client.request(options, async function (res) {
            // Tell charlie that things are good.
            charlie.ok([args.uri, args.name]);

            if (followRedirects && (res.statusCode >= 301 && res.statusCode <= 307) &&
                (options.method.toUpperCase() === 'GET' || options.method.toUpperCase() === 'HEAD')) {
                res.socket.destroy();
                if (res.statusCode === 305) { // Log but don't follow
                    args.logEmitter.emitWarning(args.httpReqTx.event, JSON.stringify({
                        status: res.statusCode, headers: res.headers
                    }));
                    const err = new Error('Received status code 305 from downstream server');
                    err.uri = args.uri;
                    err.status = 502;
                    return args.httpReqTx.cb(err);
                }
                else if (res.statusCode !== 304 && res.statusCode !== 306) { // Only follow 301, 302, 303, 307
                    if (res.headers.location) {
                        if (redirects++ >= maxRedirects) {
                            args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                                redirects: maxRedirects
                            }));
                            const err = new Error('Exceeded max redirects');
                            err.uri = args.uri;
                            err.status = 502;
                            return args.httpReqTx.cb(err);
                        }

                        let location;
                        try {
                            location = new URL(res.headers.location);
                            // Absolute URL
                            options.host = location.hostname;
                            options.port = location.port || (location.protocol === 'https:' ? 443 : 80);
                            options.path = location.pathname + (location.search || '');
                        } catch (e) {
                            // Relative URL - resolve against original URL
                            try {
                                location = new URL(res.headers.location, args.uri);
                                options.host = location.hostname;
                                options.port = location.port || (location.protocol === 'https:' ? 443 : 80);
                                options.path = location.pathname + (location.search || '');
                            } catch (e2) {
                                throw new Error('Invalid redirect location: ' + res.headers.location);
                            }
                        }

                        args.logEmitter.emitEvent(args.httpReqTx.event, {
                            redirects: redirects,
                            status: res.statusCode,
                            location: res.headers.location
                        });

                        // End the current event.
                        args.logEmitter.endEvent(args.httpReqTx.event, 'Redirecting to ' + res.headers.location);

                        try {
                            const result = await sendHttpRequestAsync(client, options, args, start, timings, reqStart, key, cache, expires, uniqueId, status, retry, redirects);
                            resolve(result);
                        } catch (redirectError) {
                            reject(redirectError);
                        }
                        return;
                    }
                    else {
                        args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                            message: 'Missing location header',
                            status: res.statusCode,
                            headers: res.headers
                        }));
                        const err = new Error('Missing Location header in redirect');
                        err.uri = args.uri;
                        err.status = 502;
                        return args.httpReqTx.cb(err);
                    }
                }
            }

            const bufs = []; // array for bufs for each chunk
            const contentEncoding = res.headers['content-encoding'];
            let zipped = false, unzip;
            let result;
            
            if (contentEncoding) {
                const encoding = contentEncoding.toLowerCase();
                if (encoding === 'gzip') {
                    unzip = zlib.createGunzip();
                }
                else if (encoding === 'deflate') {
                    unzip = zlib.createInflate();
                }
                else {
                    const err = new Error(`Content-Encoding '${encoding}' is not supported`);
                    err.uri = args.uri;
                    err.status = 502;
                    args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                        message: `Content encoding ${encoding} is not supported`
                    }));
                    res.socket.destroy();
                    return args.httpReqTx.cb(err);
                }
                zipped = true;

                unzip.on('data', function (chunk) {
                    bufs.push(chunk);
                });
                unzip.on('end', async function () {
                    result = response.parseResponse(timings, reqStart, args, res, bufs);
                    putInCache(key, cache, result, res, expires);
                    try {
                        const execResult = await response.execAsync(timings, reqStart, args, uniqueId, res, start, result, options);
                        resolve(execResult);
                    } catch (execError) {
                        reject(execError);
                    }
                });
                unzip.on('error', function (err) {
                    const error = new Error('Corrupted stream');
                    error.uri = args.uri;
                    error.status = 502;
                    args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                        message: `${encoding} stream corrupted`
                    }));
                    res.socket.destroy();
                    return args.httpReqTx.cb(error);
                });
            }

            res.on('data', function (chunk) {
                happy = true;
                if (zipped) {
                    // TODO Check for corrupted stream. Empty 'bufs' may indicate invalid stream
                    unzip.write(chunk);
                }
                else {
                    // Chunk is a buf as we don't set any encoding on the response
                    bufs.push(chunk);
                }
                responseLength += chunk.length;
                maxResponseLength = maxResponseLength || getMaxResponseLength(args.config, args.logEmitter);
                if (responseLength > maxResponseLength) {
                    const err = new Error('Response length exceeds limit');
                    err.uri = args.uri;
                    err.status = 502;

                    args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                        message: `Response length ${responseLength} exceeds config.maxResponseLength of ${maxResponseLength}`
                    }));
                    res.socket.destroy();
                    return args.httpReqTx.cb(err);
                }
            });
            
            res.on('end', async function () {
                happy = true;
                if (zipped) {
                    unzip.end();
                }
                else {
                    result = response.parseResponse(timings, reqStart, args, res, bufs);
                    putInCache(key, cache, result, res, expires);
                    try {
                        const execResult = await response.execAsync(timings, reqStart, args, uniqueId, res, start, result, options, status);
                        resolve(execResult);
                    } catch (execError) {
                        reject(execError);
                    }
                }
            });
        });

        if (args.parts && form) {
            form.pipe(clientRequest);
            timings.send = Date.now() - reqStart;
        } else if (args.body) {
            clientRequest.write(args.body);
            timings.send = Date.now() - reqStart;
        }

        let timedout = false;
        clientRequest.setTimeout(timeout, function() {
            if(happy) {
                args.logEmitter.emitWarning(args.httpReqTx.event, {
                    message: "'timeout' received when not expected"
                });
                return;
            }
            timedout = true;

            if (retry === 0 && args.statement.type === 'select') {
                _retryAsync(args, client, options, 'timeout').then(resolve).catch(reject);
            }
            else {
                // No need to end/destroy the socket since node does it.
                charlie.notok([args.uri, args.name]);
                return args.httpReqTx.end({
                    message: 'Request timed out',
                    timeout: timeout,
                    uri: args.uri,
                    status: 502
                });
            }
        });
        
        clientRequest.on('error', function(err) {
            // timeout also triggers error
            if(timedout) {
                return;
            }
            // Destroy the socket first
            clientRequest.connection.destroy();

            args.logEmitter.emitError(args.httpReqTx.event, {
                message: err ? err.code || err.message : 'Network error'
            });
            // For select, retry once on network error
            if (!timedout && retry === 0 && args.statement.type === 'select') {
                _retryAsync(args, client, options, 'Network Error').then(resolve).catch(reject);
            }
            else {
                charlie.notok([args.uri, args.name]);
                const error = err || {
                    message: err ? err.code || err.message : 'Network error'
                };
                error.uri = args.uri;
                error.status = 502;
                return args.httpReqTx.cb(error);
            }
        });
        clientRequest.end();
    });
}

const getMaxResponseLength = (config, logEmitter) => {
    if(config?.maxResponseLength) {
        return config.maxResponseLength;
    }
    else {
        const max = 10000000; // default to 10,000,000
        logEmitter.emitWarning(JSON.stringify({
            message: `config.maxResponseLength is undefined! Defaulting to ${max}`
        }));
        return max;
    }
}
