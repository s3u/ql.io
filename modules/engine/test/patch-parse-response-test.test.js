const Engine = require('../lib/engine');
describe('patch parse response test Tests', () => {
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

    test('parse response', async () => {
        // Start a mock server that returns XML response
        const http = require('http');
        server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/xml'
            });
            res.end('<?xml version="1.0" encoding="UTF-8"?><root><item>test</item></root>');
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const script = 'create table test on select get from "http://localhost:3000/test.xml";\
                       return select * from test;';
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Parse response test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            // Should have parsed XML response into JSON
                            expect(result.body.root).toBeDefined();
                            expect(result.body.root.item).toBe('test');
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