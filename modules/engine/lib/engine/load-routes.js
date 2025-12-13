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

const compiler = require('ql.io-compiler');
const fs = require('fs').promises;
const fsSync = require('fs');
const url = require('url');
const assert = require('assert');
const _ = require('underscore');
const { marked } = require('marked');

// TODO: Watch for file changes
exports.load = function (opts) {
    const { tables: tablesInfo, routes: rootdir, logEmitter } = opts;

    if (!rootdir) {
        return {};
    }

    const routes = {
        simpleMap: {},
        verbMap: {}
    };
    logEmitter.emitEvent(`Loading routes from ${rootdir}`);
    loadInternal(rootdir, '', logEmitter, routes, tablesInfo);
    return routes;
};

// Async version for future use
exports.loadAsync = async function (opts) {
    const { tables: tablesInfo, routes: rootdir, logEmitter } = opts;

    if (!rootdir) {
        return {};
    }

    const routes = {
        simpleMap: {},
        verbMap: {}
    };
    logEmitter.emitEvent(`Loading routes from ${rootdir}`);
    await loadInternalAsync(rootdir, '', logEmitter, routes, tablesInfo);
    return routes;
};

function loadInternal(path, prefix, logEmitter, routes, tablesInfo) {
    assert.ok(path, 'path should not be null');

    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    let paths;
    
    try {
        paths = fsSync.readdirSync(normalizedPath);
    }
    catch(e) {
        logEmitter.emitError(`Unable to load routes from ${normalizedPath}`);
        return;
    }

    paths.forEach(filename => {
        const stats = fsSync.statSync(normalizedPath + filename);
        if (stats.isDirectory()) {
            loadInternal(normalizedPath + filename,
                prefix.length > 0 ? `${prefix}.${filename}` : filename,
                logEmitter, routes, tablesInfo);
        }
        else if (stats.isFile() && /\.ql/.test(filename)) {
            let cooked = null,
                typeReturn = null,
                pieces = null,
                tables = [],
                info = [];

            // Load route mapping files from the disk
            const script = fsSync.readFileSync(normalizedPath + filename, 'utf8');
            /*
             1. Check if script can be cooked
             2. Cooked Script contains 'return' statement
             3. 'return' statement contains 'route'
             4. 'route' can be parsed in to its pieces
             5. Pieces contain path
             */
            try {
                cooked = compiler.compile(script);
                
                // Find tables from all statements
                tables = [];
                if (Array.isArray(cooked)) {
                    cooked.forEach(function(stmt) {
                        tables = tables.concat(findTables(stmt));
                    });
                }
                
                info = getRouteInfo(cooked);
            }
            catch(e) {
                logEmitter.emitWarning('Error loading route ' + (path + filename));
                logEmitter.emitWarning(e.stack || e);
                cooked = undefined;
            }
            // Find the return statement with route info
            let returnStatement = null;
            if (cooked && Array.isArray(cooked)) {
                returnStatement = cooked.find(function(stmt) {
                    return stmt.type === 'return' && stmt.route;
                });
            }
            
            if (returnStatement &&
                // get statement return
                (typeReturn = returnStatement) &&
                typeReturn.route && typeReturn.route.path && typeReturn.route.path.value &&
                (pieces = url.parse(typeReturn.route.path.value, true, false)) &&
                pieces.pathname
                ) {
                pieces.pathname = pieces.pathname.replace(/\{/g, ':').replace(/\}/g, ''); // replace {name} with :name
                _.each(pieces.query, function(v, k) { // replace {name} in query with name
                    if (/\{.*\}/.test(v)) {
                        pieces.query[k] = v.replace(/\{/g, '').replace(/\}/g, '');
                    } else {
                        logEmitter.emitError('Invalid query string, {} missing in script for query param value: '
                            + script);
                        delete pieces.query[k];
                    }
                });
                // get the http verb .. default 'get'
                typeReturn.route.method = typeReturn.route.method || 'get';
                typeReturn.route.method = typeReturn.route.method == 'delete' ? 'del' : typeReturn.route.method;

                // Get record for given route
                routes.verbMap[pieces.pathname] = routes.verbMap[pieces.pathname] || {};
                // Get record for http verb in the route record
                routes.verbMap[pieces.pathname][typeReturn.route.method] = routes.verbMap[pieces.pathname][typeReturn.route.method]
                    || [];
                // Add info for the current route
                if (!_.detect(routes.verbMap[pieces.pathname][typeReturn.route.method], function(record) {
                    return _.isEqual(record.query, pieces.query);
                })) {
                    const routeRecord = {
                            script: cooked,
                            originalScript: script,
                            query: pieces.query,
                            routeInfo: typeReturn.route,
                            tables: tables,
                            info: marked(info.join('\r\n'))
                        };
                    routes.verbMap[pieces.pathname][typeReturn.route.method].push(routeRecord);
                    routes.simpleMap[typeReturn.route.method + ':' + typeReturn.route.path.value]=routeRecord;
                    _.each(tables, function(table){
                        const tableDef = tablesInfo[table];
                        if(tableDef){
                            tableDef.routes = tableDef.routes || [];
                            tableDef.routes.push('/route?path=' +
                                encodeURIComponent(typeReturn.route.path.value) + '&method='
                                + typeReturn.route.method);
                        }
                    });
                } else {
                    logEmitter.emitError("Route already defined: " + script);
                }
            } else {
                logEmitter.emitError("Script doesn't contain route information: " + script);
            }
        }
    });
}

// all comment lines prior to Return statement
function getRouteInfo(cooked){
    var info = [];
    if (Array.isArray(cooked)) {
        cooked.forEach(function(stmt) {
            if (stmt.comments) {
                _.each(stmt.comments, function(comment) {
                    info.unshift(comment.text);
                });
            }
        });
    } else if (cooked && cooked.comments) {
        _.each(cooked.comments, function(comment) {
            info.unshift(comment.text);
        });
    }
    return info;
}

function findTables(statement) {
    var tables = [];
    tables = tables.concat(findTablesFromStatement(statement));
    _.each(statement.dependsOn, function(dependency) {
        tables = tables.concat(findTables(dependency))
    });
    return tables;
}

function findTablesFromStatement(statement) {
    var arr;
    switch(statement.type) {
        case 'select' :
            arr = statement.fromClause;
            break;
        case 'insert' :
        case 'delete' :
            arr = [statement.source];
            break;
        case 'update' :
            // TODO
            break;
    }

    var tables =  _.filter(_.pluck(arr,'name'), function(entry) {
        return entry && !(entry.indexOf("{") === 0);
    });
    return tables;
}

// Async version of loadInternal
async function loadInternalAsync(path, prefix, logEmitter, routes, tablesInfo) {
    assert.ok(path, 'path should not be null');

    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    
    try {
        const paths = await fs.readdir(normalizedPath);
        
        // Process files sequentially to maintain order
        for (const filename of paths) {
            try {
                const stats = await fs.stat(normalizedPath + filename);
                
                if (stats.isDirectory()) {
                    await loadInternalAsync(normalizedPath + filename,
                        prefix.length > 0 ? `${prefix}.${filename}` : filename,
                        logEmitter, routes, tablesInfo);
                }
                else if (stats.isFile() && /\.ql/.test(filename)) {
                    let cooked = null,
                        typeReturn = null,
                        pieces = null,
                        tables = [],
                        info = [];

                    // Load route mapping files from the disk
                    const script = await fs.readFile(normalizedPath + filename, 'utf8');
                    
                    /*
                     1. Check if script can be cooked
                     2. Cooked Script contains 'return' statement
                     3. 'return' statement contains 'route'
                     4. 'route' can be parsed in to its pieces
                     5. Pieces contain path
                     */
                    try {
                        cooked = compiler.compile(script);
                        
                        // Find tables from all statements
                        tables = [];
                        if (Array.isArray(cooked)) {
                            cooked.forEach(stmt => {
                                tables = tables.concat(findTables(stmt));
                            });
                        }
                        
                        info = getRouteInfo(cooked);
                    }
                    catch(e) {
                        logEmitter.emitWarning(`Error loading route ${normalizedPath + filename}`);
                        logEmitter.emitWarning(e.stack || e);
                        cooked = undefined;
                    }
                    
                    // Find the return statement with route info
                    let returnStatement = null;
                    if (cooked && Array.isArray(cooked)) {
                        returnStatement = cooked.find(stmt => {
                            return stmt.type === 'return' && stmt.route;
                        });
                    }
                    
                    if (returnStatement &&
                        // get statement return
                        (typeReturn = returnStatement) &&
                        typeReturn.route?.path?.value &&
                        (pieces = url.parse(typeReturn.route.path.value, true, false)) &&
                        pieces.pathname
                        ) {
                        pieces.pathname = pieces.pathname.replace(/\{/g, ':').replace(/\}/g, ''); // replace {name} with :name
                        _.each(pieces.query, (v, k) => { // replace {name} in query with name
                            if (/\{.*\}/.test(v)) {
                                pieces.query[k] = v.replace(/\{/g, '').replace(/\}/g, '');
                            } else {
                                logEmitter.emitError('Invalid query string, {} missing in script for query param value: '
                                    + script);
                                delete pieces.query[k];
                            }
                        });
                        
                        // get the http verb .. default 'get'
                        typeReturn.route.method = typeReturn.route.method || 'get';
                        typeReturn.route.method = typeReturn.route.method === 'delete' ? 'del' : typeReturn.route.method;

                        // Get record for given route
                        routes.verbMap[pieces.pathname] = routes.verbMap[pieces.pathname] || {};
                        // Get record for http verb in the route record
                        routes.verbMap[pieces.pathname][typeReturn.route.method] = routes.verbMap[pieces.pathname][typeReturn.route.method] || [];
                        
                        // Add info for the current route
                        if (!_.detect(routes.verbMap[pieces.pathname][typeReturn.route.method], record => {
                            return _.isEqual(record.query, pieces.query);
                        })) {
                            const routeRecord = {
                                script: cooked,
                                originalScript: script,
                                query: pieces.query,
                                routeInfo: typeReturn.route,
                                tables: tables,
                                info: marked(info.join('\r\n'))
                            };
                            routes.verbMap[pieces.pathname][typeReturn.route.method].push(routeRecord);
                            routes.simpleMap[typeReturn.route.method + ':' + typeReturn.route.path.value] = routeRecord;
                            
                            _.each(tables, table => {
                                const tableDef = tablesInfo[table];
                                if(tableDef) {
                                    tableDef.routes = tableDef.routes || [];
                                    tableDef.routes.push('/route?path=' +
                                        encodeURIComponent(typeReturn.route.path.value) + '&method='
                                        + typeReturn.route.method);
                                }
                            });
                        } else {
                            logEmitter.emitError("Route already defined: " + script);
                        }
                    } else {
                        logEmitter.emitError("Script doesn't contain route information: " + script);
                    }
                }
            } catch (fileError) {
                logEmitter.emitError(`Error processing route file ${filename}: ${fileError.message}`);
            }
        }
    }
    catch(e) {
        logEmitter.emitError(`Unable to load routes from ${normalizedPath}`);
        throw e;
    }
}