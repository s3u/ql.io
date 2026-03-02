'use strict';

var jsonPath = require('../lib/engine/jsonpath-compat');

describe('jsonpath-compat wrapper', function () {

    it('should query a simple property', function () {
        var result = jsonPath.query({ name: 'Alice' }, 'name');
        expect(result).toEqual(['Alice']);
    });

    it('should query a nested path', function () {
        var result = jsonPath.query({ a: { b: { c: 42 } } }, 'a.b.c');
        expect(result).toEqual([42]);
    });

    it('should handle $-prefixed paths', function () {
        var result = jsonPath.query({ x: 1 }, '$.x');
        expect(result).toEqual([1]);
    });

    it('should return [] when no match', function () {
        var result = jsonPath.query({ a: 1 }, 'b');
        expect(result).toEqual([]);
    });

    it('should handle array filter expressions', function () {
        var data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] };
        var result = jsonPath.query(data, '$.items[?(@.id===2)]');
        expect(result).toEqual([{ id: 2 }]);
    });

    it('should handle deep scan with ..', function () {
        var data = { a: { val: 1 }, b: { val: 2 } };
        var result = jsonPath.query(data, '$..val');
        expect(result).toEqual([1, 2]);
    });

    it('should return [] for null object', function () {
        expect(jsonPath.query(null, 'a')).toEqual([]);
    });

    it('should return [] for null path', function () {
        expect(jsonPath.query({ a: 1 }, null)).toEqual([]);
    });

    it('should return [] for undefined object', function () {
        expect(jsonPath.query(undefined, 'a')).toEqual([]);
    });
});
