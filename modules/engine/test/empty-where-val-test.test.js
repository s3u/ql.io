const Engine = require('../lib/engine');

describe('empty where val test Tests', () => {
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

    test('empty where value handling', async () => {
        const script = `
            data = [
                {"id": 1, "name": "John", "email": "john@example.com"},
                {"id": 2, "name": "Jane", "email": ""},
                {"id": 3, "name": "Bob", "email": null},
                {"id": 4, "name": "Alice", "email": "alice@example.com"}
            ];
            -- Test filtering with empty string
            emptyEmail = select * from data where email = "";
            return emptyEmail;
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Empty where val test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(1);
                        expect(result.body[0].name).toBe("Jane");
                        expect(result.body[0].email).toBe("");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Empty where val error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);

    test('undefined where value handling', async () => {
        const script = `
            data = [
                {"id": 1, "name": "John", "status": "active"},
                {"id": 2, "name": "Jane"},
                {"id": 3, "name": "Bob", "status": "inactive"},
                {"id": 4, "name": "Alice", "status": "active"}
            ];
            -- Test filtering for active status
            activeStatus = select * from data where status = "active";
            return activeStatus;
        `;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 15 seconds'));
            }, 15000);
            
            engine.execute(script, function(emitter) {
                expect(emitter).toBeDefined();
                
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    try {
                        if (err) {
                            expect(err).toBeDefined();
                            reject(new Error('Undefined where val test failed: ' + (err.message || JSON.stringify(err))));
                            return;
                        }
                        
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(Array.isArray(result.body)).toBe(true);
                        expect(result.body.length).toBe(2);
                        expect(result.body[0].name).toBe("John");
                        expect(result.body[1].name).toBe("Alice");
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    expect(err).toBeDefined();
                    reject(new Error('Undefined where val error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    }, 15000);
});