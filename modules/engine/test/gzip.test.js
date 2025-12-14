const Engine = require('../lib/engine');
const fs = require('fs');
describe('gzip test Tests', () => {
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

    test('should handle gzip compressed responses', async () => {
        const http = require('http');
        const zlib = require('zlib');
        
        // Create mock server that serves gzipped content
        server = http.createServer(function(req, res) {
            const file = __dirname + '/mock' + req.url;
            
            try {
                const readStream = fs.createReadStream(file);
                res.writeHead(200, {
                    'Content-Type': 'application/xml',
                    'Content-Encoding': 'gzip'
                });
                readStream.pipe(res);
            } catch (e) {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table gziptest 
                on select get from 'http://localhost:3000/max-server-response.xml.gz'
            
            select * from gziptest
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should successfully handle gzipped content
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Gzip test failed: ' + err.message));
                            return;
                        }
                        
                        // Verify result
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should have decompressed the gzipped content
                        expect(typeof result.body).toBe('object');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Gzip error: ' + err.message));
                });
            });
        });
    });
    test('should handle deflate compressed responses', async () => {
        const http = require('http');
        const zlib = require('zlib');
        
        // Create mock server that serves deflate compressed content
        server = http.createServer(function(req, res) {
            const testData = {
                message: 'This is deflate compressed test data',
                timestamp: new Date().toISOString(),
                items: ['item1', 'item2', 'item3']
            };
            
            const jsonData = JSON.stringify(testData);
            
            zlib.deflate(jsonData, (err, compressed) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Compression error');
                    return;
                }
                
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Content-Encoding': 'deflate',
                    'Content-Length': compressed.length
                });
                res.end(compressed);
            });
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table deflatetest 
                on select get from 'http://localhost:3000/deflate-data'
            
            select * from deflatetest
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should successfully handle deflate content
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Deflate test failed: ' + err.message));
                            return;
                        }
                        
                        // Verify result
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should have decompressed the deflate content
                        expect(typeof result.body).toBe('object');
                        expect(result.body.message).toBeDefined();
                        expect(result.body.message).toBe('This is deflate compressed test data');
                        expect(result.body.items).toBeDefined();
                        expect(Array.isArray(result.body.items)).toBe(true);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Deflate error: ' + err.message));
                });
            });
        });
    });
    test('should handle unsupported encoding gracefully', async () => {
        const http = require('http');
        
        // Create mock server that serves content with unsupported encoding
        server = http.createServer(function(req, res) {
            const testData = {
                message: 'This data has unsupported encoding',
                status: 'test'
            };
            
            const jsonData = JSON.stringify(testData);
            
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Encoding': 'snappy', // Unsupported encoding
                'Content-Length': Buffer.byteLength(jsonData)
            });
            res.end(jsonData);
        });
        
        await new Promise((resolve) => {
            server.listen(3000, resolve);
        });
        
        const testEngine = new Engine({
            tables: __dirname + '/tables'
        });
        
        const script = `
            create table unsupportedtest 
                on select get from 'http://localhost:3000/unsupported-encoding'
            
            select * from unsupportedtest
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            testEngine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        // Should handle unsupported encoding gracefully
                        // Either succeed by treating as uncompressed, or fail gracefully
                        if (err) {
                            expect(err).toBeDefined();
                            // Error is acceptable for unsupported encoding
                            resolve();
                            return;
                        }
                        
                        // If it succeeds, verify result
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should treat as uncompressed data
                        expect(typeof result.body).toBe('object');
                        expect(result.body.message).toBeDefined();
                        expect(result.body.message).toBe('This data has unsupported encoding');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    // Error is expected for unsupported encoding
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });
});