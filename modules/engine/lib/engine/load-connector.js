/*
 * Copyright 2013 eBay Software Foundation
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
const fs = require('fs');
const assert = require('assert');

exports.load = function (opts) {
    const { path: rootdir, logEmitter } = opts;

    if(!rootdir) {
        return [];
    }
    const connectors = {};

    logEmitter.emitEvent(`Loading connectors from ${rootdir}`);
    loadInternal(rootdir, '', logEmitter, connectors);
    return connectors;
};

const loadInternal = (path, prefix, logEmitter, connectors) => {
    assert.ok(path, 'path should not be null');
    assert.ok(connectors, 'connectors should not be null');

    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    let paths;
    
    try {
        paths = fs.readdirSync(normalizedPath);
    }
    catch(e) {
        logEmitter.emitError(`Unable to load connectors from ${normalizedPath}`);
        return;
    }

    paths.forEach(filename => {
        const stats = fs.statSync(normalizedPath + filename);
        /*if(stats.isDirectory()) {
            loadInternal(normalizedPath + filename,
                prefix.length > 0 ? prefix + '.' + filename : filename,
                logEmitter, connectors);
        }
        else */if(stats.isFile() && /\.js$/.test(filename)) {
           loadOne(normalizedPath + filename, connectors);
        }
    });
}

const loadOne = (filepath, connectors) => {
    try {
        const candidate = require(filepath);
        const { connectorName } = candidate;
        if(connectorName) {
            connectors[connectorName] = filepath;
        }
    } catch(e) {
        // Silently ignore errors when loading individual connectors
    }
}
