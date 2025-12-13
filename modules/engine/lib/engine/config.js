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

/**
 * Loads config
 */

'use strict';

const fs = require('fs').promises;
const fsSync = require('fs');

exports.load = function(opts) {
    opts = opts || {};
    const { logEmitter, config: file } = opts;
    
    if(!file) {
        return {};
    }
    
    let text;
    try {
        // Load the file
        logEmitter.emitEvent(`Loading config from ${file}`);
        text = fsSync.readFileSync(file, 'UTF-8');
    }
    catch (e) {
        logEmitter.emitError(`Unable to load config from ${file}`);
        return {};
    }

    try {
        return JSON.parse(text);
    }
    catch (e) {
        logEmitter.emitError(`Error loading config file: ${file}`);
        console.log(e.stack || e);
        return {};
    }
}

// Async version for future use
exports.loadAsync = async function(opts = {}) {
    const { logEmitter, config: file } = opts;
    
    if(!file) {
        return {};
    }
    
    try {
        // Load the file
        logEmitter.emitEvent(`Loading config from ${file}`);
        const text = await fs.readFile(file, 'UTF-8');
        
        try {
            return JSON.parse(text);
        }
        catch (parseError) {
            logEmitter.emitError(`Error parsing config file: ${file}`);
            console.log(parseError.stack || parseError);
            return {};
        }
    }
    catch (readError) {
        logEmitter.emitError(`Unable to load config from ${file}`);
        return {};
    }
}
