'use strict';

var { JSONPath } = require('jsonpath-plus');

/**
 * Compatibility wrapper around jsonpath-plus that preserves the
 * jsonpath `query(obj, path)` API used throughout the engine.
 *
 * Key differences handled:
 * - jsonpath-plus requires paths to start with `$`; existing callers
 *   pass bare property names like `name` or `a.b`.
 * - Returns `[]` on errors (matches existing null-check patterns).
 */
exports.query = function query(obj, path) {
    if (obj == null || path == null) {
        return [];
    }

    // Normalize: prepend `$.` when the path doesn't already start with `$`
    var normalized = path;
    if (typeof path === 'string' && path.charAt(0) !== '$') {
        normalized = '$.' + path;
    }

    try {
        return JSONPath({ path: normalized, json: obj, wrap: true });
    } catch (e) {
        return [];
    }
};
