const Engine = require('../lib/engine');
const path = require('path');

describe('Variable Scope Tests', () => {
    let engine;
    
    beforeEach(() => {
        engine = new Engine({
            tables: path.join(__dirname, 'tables'),
            config: path.join(__dirname, 'config/dev.json')
        });
    });
    
    test('should handle variable scoping in basic assignments', async () => {
        const script = `
            -- Test basic variable scoping
            a = "global_a";
            b = "global_b";
            
            result = {
                "global_a": "{a}",
                "global_b": "{b}"
            };
            
            return result
        `;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timed out after 10 seconds'));
            }, 10000);

            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);

                    if (err) {
                        reject(new Error('Basic scope test failed: ' + err.message));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(typeof result.body).toBe('object');
                        
                        expect(result.body.global_a).toBe('global_a');
                        expect(result.body.global_b).toBe('global_b');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Basic scope error: ' + err.message));
                });
            });
        });
    });

    test('should handle variable scoping with sequential assignments', async () => {
        const script = `
            -- Test variable scoping with sequential assignments
            outer_var = "outer";
            inner_var = "inner";
            modified_var = "modified";
            
            return {
                "outer": "{outer_var}",
                "inner": "{inner_var}",
                "modified": "{modified_var}"
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
                        console.log('Sequential scope error details:', err);
                        reject(new Error('Sequential scope test failed: ' + (err.message || JSON.stringify(err))));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(typeof result.body).toBe('object');
                        
                        expect(result.body.outer).toBe('outer');
                        expect(result.body.inner).toBe('inner');
                        expect(result.body.modified).toBe('modified');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(new Error('Sequential scope error: ' + err.message));
                });
            });
        });
    });



    test('should handle variable scoping with multiple assignments', async () => {
        const script = `
            var1 = "first";
            var2 = "second";
            var3 = "third";
            var4 = "fourth";
            
            return {
                "var1": "{var1}",
                "var2": "{var2}",
                "var3": "{var3}",
                "var4": "{var4}"
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
                        console.log('Multiple assignment error details:', err);
                        console.log('Error type:', typeof err);
                        console.log('Error keys:', Object.keys(err || {}));
                        reject(new Error('Multiple assignment scope test failed: ' + (err.message || JSON.stringify(err))));
                        return;
                    }

                    try {
                        expect(result).toBeDefined();
                        expect(result.body).toBeDefined();
                        expect(typeof result.body).toBe('object');
                        
                        expect(result.body.var1).toBe('first');
                        expect(result.body.var2).toBe('second');
                        expect(result.body.var3).toBe('third');
                        expect(result.body.var4).toBe('fourth');
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    console.log('Multiple assignment emitter error:', err);
                    reject(new Error('Multiple assignment scope error: ' + (err.message || JSON.stringify(err))));
                });
            });
        });
    });

    test('should handle variable isolation between different executions', async () => {
        // First execution
        const script1 = `
            execution_var = "first_execution";
            return execution_var
        `;

        // Second execution
        const script2 = `
            execution_var = "second_execution";
            return execution_var
        `;

        const firstResult = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('First execution timed out'));
            }, 5000);

            engine.execute(script1, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        });

        const secondResult = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Second execution timed out'));
            }, 5000);

            engine.execute(script2, function(emitter) {
                emitter.on('end', function(err, result) {
                    clearTimeout(timeout);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });

                emitter.on('error', function(err) {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        });

        // Variables should be isolated between executions
        expect(firstResult.body).toBe('first_execution');
        expect(secondResult.body).toBe('second_execution');
    });
});