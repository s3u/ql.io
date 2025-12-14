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
                        
                        // Routes list should be returned
                        const routesList = result.body;
                        expect(routesList).toBeDefined();
                        
                        // Should be an array or object containing route information
                        if (Array.isArray(routesList) && routesList.length > 0) {
                            routesList.forEach(route => {
                                expect(route).toHaveProperty('path');
                                expect(typeof route.path).toBe('string');
                                
                                // Should have method information
                                expect(route).toHaveProperty('method');
                                expect(typeof route.method).toBe('string');
                            });
                        } else if (typeof routesList === 'object' && routesList !== null) {
                            // Could be an object with route information
                            expect(Object.keys(routesList).length).toBeGreaterThan(0);
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
    
    test('should describe specific route using correct syntax', async () => {
        const script = 'describe route "/" using method get';
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('Describe specific route failed: ' + err.message));
                        return;
                    }
                    
                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should return specific route information
                        const routeInfo = result.body;
                        expect(routeInfo).toBeDefined();
                        expect(typeof routeInfo).toBe('object');
                        
                        // Should have route details
                        expect(routeInfo).toHaveProperty('method');
                        expect(routeInfo).toHaveProperty('path');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Describe specific route error: ' + err.message));
                });
            });
        });
    });
    
    test('should handle show routes with assignment', async () => {
        const script = 'routeDetails = show routes; return routeDetails';
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);
            
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    
                    if (err) {
                        reject(new Error('Show routes assignment failed: ' + err.message));
                        return;
                    }
                    
                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        
                        // Should return the assigned route details
                        const routeDetails = result.body;
                        expect(routeDetails).toBeDefined();
                        
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
});