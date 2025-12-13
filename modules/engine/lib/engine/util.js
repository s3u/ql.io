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

const _ = require('underscore');

// Fill params from given args. Instead of merging params, simply wire up a __proto__ chain
exports.prepareParams = function() {
    const params = {};
    let ref, arg;
    for(let i = 0; i < arguments.length; i++) {
        arg = arguments[i];
        if(arg === undefined) {
            continue;
        }
        if(ref === undefined) {
            ref = arg;
            params.__proto__ = ref;
        }
        else {
            // Delete undefined properties as an undefined will override a defined in the __proto__
            // chain
            _.each(arg, (v, p) => {
                if(v === undefined) delete arg[p];
            });
            ref.__proto__ = arg;
            ref = arg;
        }
    }
    return params;
}


let maxRequests;
exports.getMaxRequests = function(config, logEmitter) {
    if (config?.maxNestedRequests) {
        maxRequests = config.maxNestedRequests;
    }

    if (!maxRequests) {
        maxRequests = 50;
        logEmitter.emitWarning(`config.maxNestedRequests is undefined! Defaulting to ${maxRequests}`);
    }

    return maxRequests;
}


const isDup = (obj, dupGuard) => {
    if(typeof obj === "object") {
        if(dupGuard.includes(obj)) {
            return true;
        }
        dupGuard.push(obj);
    }
    return false;
}

const toNormalizedSting = exports.toNormalizedSting = function(obj, dupGuard = []) {
    let ret = '';
    if(_.isNull(obj) ||
        _.isNaN(obj) ||
        _.isBoolean(obj) ||
        _.isNumber(obj) ||
        _.isString(obj) ||
        _.isDate(obj)) {
        ret = JSON.stringify(obj);
    }
    else if( _.isUndefined(obj) || _.isFunction(obj)){
        ret = "null";
    }
    else if(_.isRegExp(obj) ){
        ret = obj.toString();
    }
    else if (_.isArray(obj)) {
        obj.sort();
        ret = JSON.stringify(_.chain(obj)
            .map(ele => isDup(ele, dupGuard) ? '<circ>' : toNormalizedSting(ele, dupGuard))
            .sortBy(ele => ele)
            .value());
    }
    else if(typeof obj === "object"){
        ret = JSON.stringify(isDup(obj, dupGuard) ? '<circ>' :
            _.chain(obj)
                .keys()
                .sortBy(ele => ele)
                .reduce((memo, key) => {
                    memo[key] = toNormalizedSting(obj[key], dupGuard);
                    return memo;
                }, {})
                .value());
    }

    return ret;
}

const getCache = exports.getCache = function (config, cache, engine, errorCb = () => {}) {
    if(!cache && config?.cache?.impl){
        const cacheConfig = config.cache.options;
        let newCache;
        try {
            const CacheConstructor = cacheRequire(config.cache.impl);
            newCache = cacheConfig === undefined 
                ? new CacheConstructor()
                : new CacheConstructor(cacheConfig);
                
            if(_.isFunction(newCache.start)){
                newCache.start();
            }
            cache = newCache;
        }
        catch(e){
            errorCb({
                cache: config.cache,
                curDir: __dirname,
                error: e
            });
        }
    }

    if(cache) {
        const eventHandlers = {
            start: event => engine.emitEvent(
                {clazz: 'info', name: 'cacheStart'}, 
                JSON.stringify({name: 'cacheStart', event})
            ),
            end: event => engine.emitEvent(
                {clazz: 'info', name: 'cacheEnd'}, 
                JSON.stringify({name: 'cacheEnd', event})
            ),
            new: event => engine.emitEvent(
                {clazz: 'info', name: 'cacheNew'}, 
                JSON.stringify({name: 'cacheNew', event})
            ),
            hit: event => engine.emitEvent(
                {clazz: 'info', name: 'cacheHit'}, 
                JSON.stringify({name: 'cacheHit', event})
            ),
            miss: event => engine.emitEvent(
                {clazz: 'info', name: 'cacheMiss'}, 
                JSON.stringify({name: 'cacheMiss', event})
            ),
            heartbeat: event => engine.emitHeartBeat(
                JSON.stringify({name: 'cacheHeartBeat', event})
            ),
            info: event => engine.emitEvent(
                {clazz: 'info', name: 'cacheInfo'}, 
                JSON.stringify({name: 'cacheInfo', event})
            ),
            error: event => engine.emitError(
                {clazz: 'error', name: 'cacheError'}, 
                JSON.stringify({name: 'cacheError', event})
            )
        };

        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
            cache.on(eventName, handler);
        });
    }

    return cache;
}

const cacheRequire = (name) => {
    try {
        return require(name);
    }
    catch(e) {
        try {
            return require(`${process.cwd()}/node_modules/${name}`);
        }
        catch(ex) {
            throw e;
        }
    }
}