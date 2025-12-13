const Engine = require('../lib/engine');
const path = require('path');

describe('Show Routes Execution Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({
            tables: path.join(__dirname, 'tables'),
            routes: path.join(__dirname, '..', '..', '..', 'routes'),
            config: path.join(__dirname, 'config/dev.json')
        });
    });
    
    test('should execute show routes command', async () => {
        const script = 'show routes';
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('Show routes execution failed: ' + err.message));
                        return;
                    }
                    
                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Routes should be returned as an array or object
                        const routes = result.body;
                        expect(routes).toBeDefined();
                        
                        // If routes exist, they should have proper structure
                        if (Array.isArray(routes) && routes.length > 0) {
                            routes.forEach(route => {
                                expect(route).toHaveProperty('path');
                                expect(route).toHaveProperty('method');
                                expect(typeof route.path).toBe('string');
                                expect(typeof route.method).toBe('string');
                            });
                        }
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Show routes error: ' + err.message));
                });
            });
        });
    });
    
    test('should handle show routes with assignment', async () => {
        const script = 'routes = show routes; return routes';
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('Show routes with assignment failed: ' + err.message));
                        return;
                    }
                    
                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Result should contain the routes data
                        const routes = result.body;
                        expect(routes).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Show routes assignment error: ' + err.message));
                });
            });
        });
    });
    
    test('should handle empty routes gracefully', async () => {
        // Create engine with no routes directory
        const emptyEngine = new Engine({
            tables: path.join(__dirname, 'tables'),
            config: path.join(__dirname, 'config/dev.json')
        });
        
        const script = 'show routes';
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            emptyEngine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('Empty routes test failed: ' + err.message));
                        return;
                    }
                    
                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should handle empty routes without error
                        const routes = result.body;
                        expect(routes).toBeDefined();
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Empty routes error: ' + err.message));
                });
            });
        });
    });
});