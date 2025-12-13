const Engine = require('../lib/engine');
describe('response patch test Tests', () => {
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

    test('response-patch-test', async () => {
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
        
        const script = fs.readFileSync(__dirname + '/mock/response-patch.ql', 'UTF-8');
        
        return new Promise((resolve, reject) => {
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    if(err) {
                        reject(new Error('Response patch test failed: ' + (err.stack || err)));
                    }
                    else {
                        try {
                            expect(result).toBeDefined();
                            expect(result.body).toBeDefined();
                            // The response patch should have modified the response structure
                            // Verify that we got an array of items (JSONPath extraction result)
                            expect(Array.isArray(result.body)).toBe(true);
                            if (result.body.length > 0 && Array.isArray(result.body[0])) {
                                // Should have extracted items from the response
                                expect(result.body[0].length).toBeGreaterThan(0);
                            }
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