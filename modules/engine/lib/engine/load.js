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

const brew = require('./brew.js');
const fs = require('fs').promises;
const fsSync = require('fs');
const assert = require('assert');

// TODO: Watch for file changes
exports.load = function (opts) {
    const { tables: rootdir, logEmitter, config, connectors } = opts;

    if(!rootdir) {
        return [];
    }
    const tables = {};

    logEmitter.emitEvent(`Loading tables from ${rootdir}`);
    loadInternal(rootdir, '', logEmitter, config, tables, connectors);
    return tables;
};

// Async version for future use
exports.loadAsync = async function (opts) {
    const { tables: rootdir, logEmitter, config, connectors } = opts;

    if(!rootdir) {
        return {};
    }
    const tables = {};

    logEmitter.emitEvent(`Loading tables from ${rootdir}`);
    await loadInternalAsync(rootdir, '', logEmitter, config, tables, connectors);
    return tables;
};

function loadInternal(path, prefix, logEmitter, config, tables, connectors) {
    assert.ok(path, 'path should not be null');
    assert.ok(config, 'config should not be null');
    assert.ok(tables, 'tables should not be null');

    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    let paths;
    
    try {
        paths = fsSync.readdirSync(normalizedPath);
    }
    catch(e) {
        logEmitter.emitError(`Unable to load tables from ${normalizedPath}`);
        return;
    }

    paths.forEach(filename => {
        const stats = fsSync.statSync(normalizedPath + filename);
        if(stats.isDirectory()) {
            loadInternal(normalizedPath + filename,
                prefix.length > 0 ? `${prefix}.${filename}` : filename,
                logEmitter, config, tables, connectors);
        }
        else if(stats.isFile() && /\.ql$/.test(filename)) {
            // Load script files from the disk
            const script = fsSync.readFileSync(normalizedPath + filename, 'utf8');
            const name = filename.substring(0, filename.lastIndexOf('.'));

            // Get the semantic model
            brew.go({
                path: normalizedPath,
                name,
                config,
                script,
                logEmitter,
                connectors,
                cb: (err, table) => {
                    if(err) {
                        logEmitter.emitError(err);
                    }
                    else {
                        assert.ok(table, 'table should not be null');
                        tables[table.name] = table;
                    }
                }
            });
        }
    });
}

// Async version of loadInternal
async function loadInternalAsync(path, prefix, logEmitter, config, tables, connectors) {
    assert.ok(path, 'path should not be null');
    assert.ok(config, 'config should not be null');
    assert.ok(tables, 'tables should not be null');

    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    
    try {
        const paths = await fs.readdir(normalizedPath);
        
        // Process files sequentially to maintain order
        for (const filename of paths) {
            try {
                const stats = await fs.stat(normalizedPath + filename);
                
                if(stats.isDirectory()) {
                    await loadInternalAsync(normalizedPath + filename,
                        prefix.length > 0 ? `${prefix}.${filename}` : filename,
                        logEmitter, config, tables, connectors);
                }
                else if(stats.isFile() && /\.ql$/.test(filename)) {
                    // Load script files from the disk
                    const script = await fs.readFile(normalizedPath + filename, 'utf8');
                    const name = filename.substring(0, filename.lastIndexOf('.'));

                    // Convert brew.go to Promise-based
                    await new Promise((resolve, reject) => {
                        brew.go({
                            path: normalizedPath,
                            name,
                            config,
                            script,
                            logEmitter,
                            connectors,
                            cb: (err, table) => {
                                if(err) {
                                    logEmitter.emitError(err);
                                    reject(err);
                                }
                                else {
                                    assert.ok(table, 'table should not be null');
                                    tables[table.name] = table;
                                    resolve(table);
                                }
                            }
                        });
                    });
                }
            } catch (fileError) {
                logEmitter.emitError(`Error processing file ${filename}: ${fileError.message}`);
            }
        }
    }
    catch(e) {
        logEmitter.emitError(`Unable to load tables from ${normalizedPath}`);
        throw e;
    }
}
