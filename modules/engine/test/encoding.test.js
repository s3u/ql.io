const _ = require('underscore');
const Engine = require('../lib/engine');
const http = require('http');
const path = require('path');

describe('Character Encoding Tests', () => {
    let engine;
    let server;
    const port = 3520;

    beforeEach(() => {
        engine = new Engine({
            tables: path.join(__dirname, 'tables'),
            config: path.join(__dirname, 'config/dev.json')
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

    test('should handle UTF-8 encoding in responses', async () => {
        // Create mock server with UTF-8 content
        server = http.createServer((req, res) => {
            res.writeHead(200, { 
                'Content-Type': 'application/json; charset=utf-8'
            });
            
            const utf8Data = {
                message: 'Hello World - UTF-8: ñáéíóú çñ 中文 العربية',
                emoji: '🚀 🌟 💻',
                accents: 'café résumé naïve'
            };
            
            res.end(JSON.stringify(utf8Data));
        });

        await new Promise((resolve) => {
            server.listen(port, resolve);
        });

        const script = `
            create table utf8test 
                on select get from 'http://localhost:${port}/utf8'
            
            select * from utf8test
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);

                    if (err) {
                        reject(new Error('UTF-8 encoding test failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Handle both array and object responses
                        let data;
                        if (Array.isArray(result.body)) {
                            data = result.body[0];
                        } else {
                            data = result.body;
                        }
                        
                        expect(data.message).toContain('ñáéíóú');
                        expect(data.message).toContain('中文');
                        expect(data.message).toContain('العربية');
                        expect(data.emoji).toContain('🚀');
                        expect(data.accents).toContain('café');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('UTF-8 encoding error: ' + err.message));
                });
            });
        });
    });

    test('should handle different content-type charsets', async () => {
        // Create mock server with ISO-8859-1 content
        server = http.createServer((req, res) => {
            if (req.url.includes('iso')) {
                res.writeHead(200, { 
                    'Content-Type': 'application/json; charset=iso-8859-1'
                });
                
                const isoData = {
                    message: 'ISO-8859-1 text: café résumé',
                    encoding: 'iso-8859-1'
                };
                
                res.end(JSON.stringify(isoData));
            } else {
                res.writeHead(200, { 
                    'Content-Type': 'application/json; charset=utf-8'
                });
                
                const utf8Data = {
                    message: 'UTF-8 text: café résumé',
                    encoding: 'utf-8'
                };
                
                res.end(JSON.stringify(utf8Data));
            }
        });

        await new Promise((resolve) => {
            server.listen(port, resolve);
        });

        const script = `
            create table charsettest 
                on select get from 'http://localhost:${port}/{encoding}'
            
            utf8_result = select * from charsettest where encoding = "utf8";
            iso_result = select * from charsettest where encoding = "iso";
            
            return {
                "utf8": "{utf8_result}",
                "iso": "{iso_result}"
            }
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);

                    if (err) {
                        reject(new Error('Charset test failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(typeof result.body).toBe('object');
                        
                        // Both encodings should be handled
                        expect(result.body.utf8).toBeDefined();
                        expect(result.body.iso).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Charset error: ' + err.message));
                });
            });
        });
    });

    test('should handle encoding in local data operations', async () => {
        const script = `
            -- Test various encoded strings in local data
            data = [
                {"text": "English: Hello World", "lang": "en"},
                {"text": "Spanish: Hola Mundo - ñáéíóú", "lang": "es"},
                {"text": "French: Bonjour le Monde - café résumé", "lang": "fr"},
                {"text": "Chinese: 你好世界", "lang": "zh"},
                {"text": "Arabic: مرحبا بالعالم", "lang": "ar"},
                {"text": "Emoji: 🌍 🚀 💻 🎉", "lang": "emoji"}
            ];
            
            select text from data where lang in ("es", "fr", "zh", "ar", "emoji")
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);

                    if (err) {
                        reject(new Error('Local encoding test failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(5);
                        
                        // Check that various encodings are preserved
                        // The result is an array of strings (selected text values)
                        const texts = result.body;
                        expect(texts.some(text => text.includes('ñáéíóú'))).toBe(true);
                        expect(texts.some(text => text.includes('café'))).toBe(true);
                        expect(texts.some(text => text.includes('你好世界'))).toBe(true);
                        expect(texts.some(text => text.includes('مرحبا'))).toBe(true);
                        expect(texts.some(text => text.includes('🌍'))).toBe(true);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Local encoding error: ' + err.message));
                });
            });
        });
    });
});