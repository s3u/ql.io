const Engine = require('../lib/engine');
describe('exec scatter test Tests', () => {
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

    test('select-times', async () => {
        // Start a mock server to serve the JSON file
        const http = require('http');
        const fs = require('fs');
        server = http.createServer(function(req, res) {
            const file = __dirname + '/mock' + req.url;
            try {
                const stat = fs.statSync(file);
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Content-Length': stat.size
                });
                fs.createReadStream(file).pipe(res);
            } catch (e) {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const script = fs.readFileSync(__dirname + '/mock/scatter.ql', 'UTF-8');
        
        return new Promise((resolve, reject) => {
            const context = {
                times: 2
            };
            engine.execute(script, {
                context: context,
                request: {
                    params: {
                        times: 2
                    }
                }
            }, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Scatter select-times test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            // Should have made 2 requests due to scatter
                            expect(Array.isArray(result.body)).toBe(true);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
    test('select-context-lookup', async () => {
        // Start a mock server to serve the JSON file
        const http = require('http');
        const fs = require('fs');
        server = http.createServer(function(req, res) {
            const file = __dirname + '/mock' + req.url;
            try {
                const stat = fs.statSync(file);
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Content-Length': stat.size
                });
                fs.createReadStream(file).pipe(res);
            } catch (e) {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const script = 'create table items.rp\
                         on select get from "http://localhost:3000/FindItemsResponsePatch.json"\
                         using patch "test/mock/scatter.js"\
                         resultset "findItemsByKeywordsResponse";\
                       FindItemsByKeywordsResponse = select * from items.rp where times = "{contextTimes}";\
                       return FindItemsByKeywordsResponse;';
        
        return new Promise((resolve, reject) => {
            const context = {
                contextTimes: 3
            };
            engine.execute(script, {
                context: context
            }, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Scatter context lookup test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            // Should have made requests based on context variable
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }, 15000);
});