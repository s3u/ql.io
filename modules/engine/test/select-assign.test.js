const Engine = require('../lib/engine');
describe('select assign test Tests', () => {
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

    test('select-assign-from-local-data', async () => {
        const script = `items = [
                            {"title": "iPad Pro", "price": 799, "category": "tablet"},
                            {"title": "iPad Air", "price": 599, "category": "tablet"},
                            {"title": "iPad Mini", "price": 399, "category": "tablet"}
                        ];
                        ipads = select * from items where category = "tablet";
                        return {"result": "{ipads}"};`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            const context = {};
            engine.execute(script, {context: context}, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Select assign test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.headers).toBeDefined();
                        expect(result.headers['content-type']).toBe('application/json');
                        expect(result.body).toBeDefined();
                        expect(result.body.result).toBeDefined();
                        expect(Array.isArray(result.body.result)).toBe(true);
                        expect(result.body.result.length).toBeGreaterThan(0);
                        
                        // Check context - the assigned variable should be available
                        expect(context.ipads).toBeDefined();
                        expect(Array.isArray(context.ipads)).toBe(true);
                        expect(context.ipads.length).toBeGreaterThan(0);
                        expect(typeof context.ipads[0]).toBe('object');
                        expect(Array.isArray(context.ipads[0])).toBe(false);
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Select assign error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});