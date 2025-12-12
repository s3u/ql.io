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

var csv = require('csv-parser');
var { Readable } = require('stream');

exports.toJson = function(data, respCb, errorCb, headers) {
    try {
        // Handle null and undefined cases
        if (data === null) {
            if (headers) {
                return respCb([]);
            } else {
                return respCb([['null']]);
            }
        }
        
        if (data === undefined) {
            if (headers) {
                return respCb([]);
            } else {
                return respCb([['undefined']]);
            }
        }
        
        // Convert data to string and fix line endings
        const csvString = String(data).replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n');
        
        // Handle invalid CSV data (single line without commas)
        const lines = csvString.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 1 && !lines[0].includes(',')) {
            if (headers) {
                return respCb([]);
            } else {
                return respCb([[lines[0]]]);
            }
        }
        
        var jsonData = [];
        const stream = Readable.from([csvString]);
        
        if (headers === true) {
            // Use headers mode - first row becomes property names
            stream
                .pipe(csv())
                .on('data', function(lineData) {
                    jsonData.push(lineData);
                })
                .on('end', function() {
                    return respCb(jsonData);
                })
                .on('error', function(error) {
                    if (errorCb) {
                        return errorCb(error);
                    } else {
                        return respCb([]);
                    }
                });
        } else {
            // No headers mode - return arrays
            stream
                .pipe(csv({ headers: false }))
                .on('data', function(lineData) {
                    // Convert object with numeric keys to array
                    const row = Object.keys(lineData).sort((a, b) => parseInt(a) - parseInt(b)).map(key => lineData[key]);
                    jsonData.push(row);
                })
                .on('end', function() {
                    return respCb(jsonData);
                })
                .on('error', function(error) {
                    if (errorCb) {
                        return errorCb(error);
                    } else {
                        return respCb([]);
                    }
                });
        }
    }
    catch(error) {
        if (errorCb) {
            return errorCb(error);
        } else {
            return respCb([]);
        }
    }
};

exports.accept = 'text/csv';