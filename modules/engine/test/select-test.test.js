const Engine = require('../lib/engine');
const http = require('http');
const _ = require('underscore');

describe('select test Tests', () => {
    let engine;
    let server;

    beforeEach(() => {
        engine = new Engine({
            tables: __dirname + '/tables'
        });
    });

    afterEach(async () => {
        if (server && server.listening) {
            await new Promise((resolve) => {
                server.close(() => {
                    server = null;
                    setTimeout(resolve, 100);
                });
            });
        }
    });

    test('selectstar', async () => {
        // Mock HTTP server setup
        const mockPayload = '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse xmlns="http://www.ebay.com/marketplace/search/v1/services">' +
                        '<searchResult count="10">'+
                        '<item><itemId>140697152294</itemId>'+
                        '<title>New Sealed Apple iPad 2 16GB, Wi-Fi + 3G (Unlocked), 9.7in - White (MC982LL/A) </title></item>'+
                        '<item><itemId>320839939720</itemId>'+
                        '<title>Apple iPad 32GB, Wi-Fi + 3G (AT&amp;T), 9.7in - Black</title></item>'+
                        '</searchResult> </findItemsByKeywordsResponse>';

        return new Promise((resolve, reject) => {
            server = http.createServer((req, res) => {
                res.writeHead(200, {'Content-Type': 'application/xml'});
                res.end(mockPayload);
            });

            server.listen(3000, () => {
                const script = 'create table finditems on select get from "http://localhost:3000" '+
                        'resultset "findItemsByKeywordsResponse.searchResult.item"; '+
                        'web = select * from finditems where keywords = "ipad";'+
                        'return "{web}"';

                engine.execute(script, function (emitter) {
                    emitter.on('end', function (err, result) {
                        if(err) {
                            reject(err);
                        }
                        else {
                            expect(result.headers['content-type']).toBe('application/json');
                            expect(_.isArray(result.body)).toBe(true);
                            expect(result.body.length).toBeGreaterThan(0);
                            expect(_.isArray(result.body[0])).toBe(false);
                            resolve();
                        }
                    });
                });
            });
        });
    }, 15000);

    test('selectsome', async () => {
        const mockPayload = '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse>' +
                        '<item><itemId>220944750971</itemId>'+
                        '<title>Mini : Clubman S 2011 MINI COOPER S CLUBMAN*CONVENIENCE PKG,PREMIUM PKG,XENON LIGHTS=SWEET RIDE</title>'+
                        '<primaryCategory><categoryName>Clubman</categoryName> </primaryCategory>'+
                        '<sellingStatus> <currentPrice currencyId="USD">16000.0</currentPrice></sellingStatus></item>'+
                        '</findItemsByKeywordsResponse>';

        return new Promise((resolve, reject) => {
            server = http.createServer((req, res) => {
                res.writeHead(200, {'Content-Type': 'application/xml'});
                res.end(mockPayload);
            });

            server.listen(3000, () => {
                const script = 'create table finditems1 on select get from "http://localhost:3000"' +
                        'resultset "findItemsByKeywordsResponse.item"; ' +
                        'web= select title, itemId, primaryCategory.categoryName,sellingStatus.currentPrice from finditems1 where keywords="cooper" and FreeShippingOnly = "true" and MinPrice = "100" ;'+
                        'return "{web}"';

                engine.execute(script, function (emitter) {
                    emitter.on('end', function (err, result) {
                        if(err) {
                            reject(err);
                        }
                        else {
                            expect(result.headers['content-type']).toBe('application/json');
                            expect(_.isArray(result.body)).toBe(true);
                            expect(result.body.length).toBeGreaterThan(0);
                            expect(_.isArray(result.body[0])).toBe(true);
                            expect(result.body[0].length).toBe(4);
                            resolve();
                        }
                    });
                });
            });
        });
    }, 15000);

    test('selectsomealiases', async () => {
        const mockPayload = '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse>' +
                        '<item><itemId>220944750971</itemId>'+
                        '<title>Mini : Clubman S 2011 MINI COOPER S CLUBMAN*CONVENIENCE PKG,PREMIUM PKG,XENON LIGHTS=SWEET RIDE</title>'+
                        '<primaryCategory><categoryName>Clubman</categoryName> </primaryCategory>'+
                        '<sellingStatus> <currentPrice currencyId="USD">16000.0</currentPrice></sellingStatus></item>'+
                        '</findItemsByKeywordsResponse>';

        return new Promise((resolve, reject) => {
            server = http.createServer((req, res) => {
                res.writeHead(200, {'Content-Type': 'application/xml'});
                res.end(mockPayload);
            });

            server.listen(3000, () => {
                const script = 'create table finditems1 on select get from "http://localhost:3000"' +
                        'resultset "findItemsByKeywordsResponse.item"; ' +
                        'web = select title as title, itemId as id, primaryCategory.categoryName as cat, sellingStatus.currentPrice as price from finditems1 where keywords="cooper" and FreeShippingOnly = "true" and MinPrice = "100" limit 10 offset 20;'+
                        'return "{web}"';

                engine.execute(script, function (emitter) {
                    emitter.on('end', function (err, result) {
                        if(err) {
                            reject(err);
                        }
                        else {
                            expect(result.headers['content-type']).toBe('application/json');
                            expect(_.isArray(result.body)).toBe(true);
                            expect(result.body.length).toBeGreaterThan(0);
                            expect(_.isObject(result.body[0])).toBe(true);
                            expect(result.body[0].title).toBeDefined();
                            expect(result.body[0].id).toBeDefined();
                            expect(result.body[0].cat).toBeDefined();
                            expect(result.body[0].price).toBeDefined();
                            resolve();
                        }
                    });
                });
            });
        });
    }, 15000);

    test('selectdigits', async () => {
        const mockPayload = '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse>' +
                        '<item><itemId>280817533910</itemId>'+
                        '<title>Dap DRYDEX WALL REPAIR KIT 12345</title></item>'+
                        '<item><itemId>180812214303</itemId>'+
                        '<title>ROCKY 12345 VHS BOX SET VERY GOOD CONDITION</title></item>'+
                        '</findItemsByKeywordsResponse>';

        return new Promise((resolve, reject) => {
            server = http.createServer((req, res) => {
                res.writeHead(200, {'Content-Type': 'application/xml'});
                res.end(mockPayload);
            });

            server.listen(3000, () => {
                const script = 'create table finditems on select get from "http://localhost:3000"'+
                        'resultset "findItemsByKeywordsResponse.item";'+
                        'select * from finditems where keywords = 12345';

                engine.execute(script, function (emitter) {
                    emitter.on('end', function (err, result) {
                        if(err) {
                            reject(err);
                        }
                        else {
                            expect(result.headers['content-type']).toBe('application/json');
                            expect(_.isArray(result.body)).toBe(true);
                            expect(result.body.length).toBeGreaterThan(0);
                            expect(_.isArray(result.body[0])).toBe(false);
                            resolve();
                        }
                    });
                });
            });
        });
    }, 15000);
});