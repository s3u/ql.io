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

"use strict";

const compiler = require('../lib/compiler');

describe('Connector Tests', () => {
    test('simple', () => {
        const q = "create table twitter.public via mongodb on select get from 'http://twitter.com/statuses/public_timeline.{^format}'";
        const compiled = compiler.compile(q);
        expect(compiled.rhs.dependsOn[0].type).toBe('create');
        expect(compiled.rhs.dependsOn[0].name).toBe('twitter.public');
        expect(compiled.rhs.dependsOn[0].select).toEqual({ 
            method: 'get',
            uri: 'http://twitter.com/statuses/public_timeline.{^format}',
            defaults: {},
            aliases: {},
            headers: {},
            resultSet: '',
            cache: {},
            body: '' 
        });
    });

    test('multiple actions', () => {
        const q = 'create table bitly.shorten\
  on insert get from "http://api.bitly.com/v3/shorten?login={^login}&apiKey={^apikey}&longUrl={^longUrl}&format={format}"\
            using defaults apikey = "{config.tables.bitly.shorten.apikey}", login = "{config.tables.bitly.shorten.login}", format = "json"\
            using patch "shorten.js"\
            resultset "data.url"\
  on select get from "http://api.bitly.com/v3/expand?login={^login}&apiKey={^apikey}&shortUrl={^shortUrl}&format={format}"\
            using defaults apikey = "{config.tables.bitly.shorten.apikey}", login = "{config.tables.bitly.shorten.login}", format = "json"\
            using patch "shorten.js"\
            resultset "data.expand"';
        const compiled = compiler.compile(q);
        expect(compiled.rhs.dependsOn[0].name).toEqual('bitly.shorten');
        expect(compiled.rhs.dependsOn[0].insert).toEqual({ 
            method: 'get',
            uri: 'http://api.bitly.com/v3/shorten?login={^login}&apiKey={^apikey}&longUrl={^longUrl}&format={format}',
            defaults: { 
                apikey: '{config.tables.bitly.shorten.apikey}',
                login: '{config.tables.bitly.shorten.login}',
                format: 'json' 
            },
            aliases: {},
            headers: {},
            resultSet: 'data.url',
            cache: {},
            patch: 'shorten.js',
            body: '' 
        });
        expect(compiled.rhs.dependsOn[0].select).toEqual({ 
            method: 'get',
            uri: 'http://api.bitly.com/v3/expand?login={^login}&apiKey={^apikey}&shortUrl={^shortUrl}&format={format}',
            defaults: { 
                apikey: '{config.tables.bitly.shorten.apikey}',
                login: '{config.tables.bitly.shorten.login}',
                format: 'json' 
            },
            aliases: {},
            headers: {},
            resultSet: 'data.expand',
            cache: {},
            patch: 'shorten.js',
            body: '' 
        });
    });

    test('media type', () => {
        const script = '-- This is a mapping for eBay\'s [GetMyEbayBuying](http://developer.ebay.com/DevZone/xml/docs/Reference/ebay/GetMyeBayBuying.html) API. Here is an example: select * from ebay.trading.getmybuying\n\
create table ebay.trading.getmyebaybuying\
  on select post to "{config.tables.ebay.trading.myebaybuying.uri}"\
    using headers "Content-Type"= "application/xml; charset=UTF-8",\
                  "X-EBAY-API-DETAIL-LEVEL"= "0",\
                  "X-EBAY-API-RESPONSE-ENCODING"= "XML",\
                  "X-EBAY-API-CALL-NAME"= "GetMyeBayBuying",\
                  "X-EBAY-API-SITEID" = "0",\
                  "X-EBAY-API-COMPATIBILITY-LEVEL"= "723"\
    using defaults format = "{config.tables.ebay.trading.myebaybuying.defaults.format}",\
              globalid = "{config.tables.ebay.trading.myebaybuying.defaults.globalid}",\
              currency = "{config.tables.ebay.trading.myebaybuying.defaults.currency}",\
              itemSearchScope = "{config.tables.ebay.trading.myebaybuying.defaults.itemSearchScope}",\
              limit = "{config.tables.ebay.trading.myebaybuying.defaults.limit}",\
              offset = "{config.tables.ebay.trading.myebaybuying.defaults.offset}",\
              eBayAuthToken = "{config.tables.ebay.trading.myebaybuying.defaults.eBayAuthToken}"\
    using patch "getmyebaybuying.js"\
    using bodyTemplate "getmyebaybuying.xml.mu" type "application/xml"';
        const compiled = compiler.compile(script);
        expect(compiled.rhs.dependsOn[0].select.body.type).toBe('application/xml');
    });

    test('media type param', () => {
        const script = '-- This is a mapping for eBay\'s [GetMyEbayBuying](http://developer.ebay.com/DevZone/xml/docs/Reference/ebay/GetMyeBayBuying.html) API. Here is an example: select * from ebay.trading.getmybuying\n\
create table ebay.trading.getmyebaybuying\n\
  on select post to "{config.tables.ebay.trading.myebaybuying.uri}"\n\
    using headers "Content-Type"= "application/xml; charset=UTF-8",\n\
                  "X-EBAY-API-DETAIL-LEVEL"= "0",\n\
                  "X-EBAY-API-RESPONSE-ENCODING"= "XML",\n\
                  "X-EBAY-API-CALL-NAME"= "GetMyeBayBuying",\n\
                  "X-EBAY-API-SITEID" = "0",\n\
                  "X-EBAY-API-COMPATIBILITY-LEVEL"= "723"\n\
    using defaults format = "{config.tables.ebay.trading.myebaybuying.defaults.format}",\n\
              globalid = "{config.tables.ebay.trading.myebaybuying.defaults.globalid}",\n\
              currency = "{config.tables.ebay.trading.myebaybuying.defaults.currency}",\n\
              itemSearchScope = "{config.tables.ebay.trading.myebaybuying.defaults.itemSearchScope}",\n\
              limit = "{config.tables.ebay.trading.myebaybuying.defaults.limit}",\n\
              offset = "{config.tables.ebay.trading.myebaybuying.defaults.offset}",\n\
              eBayAuthToken = "{config.tables.ebay.trading.myebaybuying.defaults.eBayAuthToken}"\n\
    using patch "getmyebaybuying.js"\n\
    using bodyTemplate "getmyebaybuying.xml.mu" type "application/xml;foo=bar"';

        const compiled = compiler.compile(script);
        expect(compiled.rhs.dependsOn[0].select.body.type).toBe('application/xml;foo=bar');
    });

    test('media type form', () => {
        const script = '-- This is a mapping for eBay\'s [GetMyEbayBuying](http://developer.ebay.com/DevZone/xml/docs/Reference/ebay/GetMyeBayBuying.html) API. Here is an example: select * from ebay.trading.getmybuying\n\
create table ebay.trading.getmyebaybuying\n\
  on select post to "{config.tables.ebay.trading.myebaybuying.uri}"\n\
    using headers "Content-Type"= "application/xml; charset=UTF-8",\n\
                  "X-EBAY-API-DETAIL-LEVEL"= "0",\n\
                  "X-EBAY-API-RESPONSE-ENCODING"= "XML",\n\
                  "X-EBAY-API-CALL-NAME"= "GetMyeBayBuying",\n\
                  "X-EBAY-API-SITEID" = "0",\n\
                  "X-EBAY-API-COMPATIBILITY-LEVEL"= "723"\n\
    using defaults format = "{config.tables.ebay.trading.myebaybuying.defaults.format}",\n\
              globalid = "{config.tables.ebay.trading.myebaybuying.defaults.globalid}",\n\
              currency = "{config.tables.ebay.trading.myebaybuying.defaults.currency}",\n\
              itemSearchScope = "{config.tables.ebay.trading.myebaybuying.defaults.itemSearchScope}",\n\
              limit = "{config.tables.ebay.trading.myebaybuying.defaults.limit}",\n\
              offset = "{config.tables.ebay.trading.myebaybuying.defaults.offset}",\n\
              eBayAuthToken = "{config.tables.ebay.trading.myebaybuying.defaults.eBayAuthToken}"\n\
    using patch "getmyebaybuying.js"\n\
    using bodyTemplate "getmyebaybuying.xml.mu" type "application/x-www-form-urlencoded"';

        const compiled = compiler.compile(script);
        expect(compiled.rhs.dependsOn[0].select.body.type).toBe('application/x-www-form-urlencoded');
    });

    test('auth', () => {
        const script = 'create table ebay.finding.items on select get from "{config.tables.ebay.finding.items.url}" authenticate using "authmod"';
        const compiled = compiler.compile(script);
        expect(compiled.rhs.dependsOn[0].select.auth).toBe('authmod');
    });

    test('create-many', () => {
        const script = 'create table one on select get from "url1"\n\
                      create table two on select post to "url2"';
        const compiled = compiler.compile(script);

        expect(compiled.rhs.dependsOn[0].select).toEqual({ 
            method: 'get',
            uri: 'url1',
            defaults: {},
            aliases: {},
            headers: {},
            resultSet: '',
            cache: {},
            body: '' 
        });

        expect(compiled.rhs.dependsOn[1].select).toEqual({ 
            method: 'post',
            uri: 'url2',
            defaults: {},
            aliases: {},
            headers: {},
            resultSet: '',
            cache: {},
            body: '' 
        });
    });

    test('create-deps', () => {
        const script = "create table mytable\
                        on select get from 'someuri';\n\
                      resp = select * from mytable;\n\
                      return '{resp.$..item}'";
        const plan = compiler.compile(script);
        expect(plan.rhs.dependsOn.length).toBe(1);
        expect(plan.rhs.dependsOn[0].type).toBe('select');
        expect(plan.rhs.dependsOn[0].dependsOn.length).toBe(1);
        expect(plan.rhs.dependsOn[0].dependsOn[0].type).toBe('create');
    });
});