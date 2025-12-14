/**
 * Memory Optimization Tests
 * 
 * Tests for object pooling, memory optimization, and efficient
 * data structure usage in the compiler.
 */

const { ObjectPool, CompilerObjectPools } = require('../lib/object-pool.js');
const { MemoryOptimizer, NodeFactory } = require('../lib/memory-optimizer.js');
const compiler = require('../lib/compiler.js');

describe('Memory Optimization Tests', () => {
    beforeEach(() => {
        compiler.clearCache();
        compiler.resetMemoryMetrics();
        compiler.clearMemoryPools();
    });

    describe('Object Pool', () => {
        let pool;

        beforeEach(() => {
            pool = new ObjectPool({
                maxSize: 3,
                createFn: () => ({ created: true }),
                resetFn: (obj) => {
                    delete obj.used;
                    return obj;
                }
            });
        });

        test('should create new objects when pool is empty', () => {
            const obj = pool.acquire();
            expect(obj.created).toBe(true);
            
            const metrics = pool.getMetrics();
            expect(metrics.created).toBe(1);
            expect(metrics.reused).toBe(0);
        });

        test('should reuse objects from pool', () => {
            const obj1 = pool.acquire();
            obj1.used = true;
            pool.release(obj1);
            
            const obj2 = pool.acquire();
            expect(obj2).toBe(obj1); // Same object reference
            expect(obj2.used).toBeUndefined(); // Should be reset
            
            const metrics = pool.getMetrics();
            expect(metrics.created).toBe(1);
            expect(metrics.reused).toBe(1);
        });

        test('should respect max size limit', () => {
            const objects = [];
            
            // Create and return more objects than max size
            for (let i = 0; i < 5; i++) {
                const obj = pool.acquire();
                obj.id = i;
                objects.push(obj);
            }
            
            // Return all objects
            objects.forEach(obj => pool.release(obj));
            
            const metrics = pool.getMetrics();
            expect(metrics.currentSize).toBeLessThanOrEqual(3); // Max size limit
        });

        test('should track metrics correctly', () => {
            const obj1 = pool.acquire();
            const obj2 = pool.acquire();
            
            pool.release(obj1);
            pool.release(obj2);
            
            const obj3 = pool.acquire(); // Should reuse
            
            const metrics = pool.getMetrics();
            expect(metrics.created).toBe(2);
            expect(metrics.reused).toBe(1);
            expect(metrics.returned).toBe(2);
            expect(metrics.reuseRatio).toBeCloseTo(1/3);
        });

        test('should clear pool', () => {
            pool.acquire();
            pool.acquire();
            
            pool.clear();
            
            const metrics = pool.getMetrics();
            expect(metrics.currentSize).toBe(0);
        });
    });

    describe('Compiler Object Pools', () => {
        let pools;

        beforeEach(() => {
            pools = new CompilerObjectPools();
        });

        test('should provide different types of pooled objects', () => {
            const node = pools.acquireNode();
            const array = pools.acquireArray();
            const listeners = pools.acquireListenerArray();
            
            expect(typeof node).toBe('object');
            expect(Array.isArray(array)).toBe(true);
            expect(Array.isArray(listeners)).toBe(true);
            
            pools.releaseNode(node);
            pools.releaseArray(array);
            pools.releaseListenerArray(listeners);
        });

        test('should reset objects properly', () => {
            const node = pools.acquireNode();
            node.type = 'select';
            node.id = 123;
            
            pools.releaseNode(node);
            
            const reusedNode = pools.acquireNode();
            expect(reusedNode.type).toBeUndefined();
            expect(reusedNode.id).toBeUndefined();
        });

        test('should reset arrays properly', () => {
            const array = pools.acquireArray();
            array.push(1, 2, 3);
            
            pools.releaseArray(array);
            
            const reusedArray = pools.acquireArray();
            expect(reusedArray.length).toBe(0);
        });

        test('should provide combined metrics', () => {
            pools.acquireNode();
            pools.acquireArray();
            pools.acquireListenerArray();
            
            const metrics = pools.getMetrics();
            expect(metrics.nodes).toBeDefined();
            expect(metrics.arrays).toBeDefined();
            expect(metrics.listeners).toBeDefined();
        });
    });

    describe('Memory Optimizer', () => {
        let optimizer;

        beforeEach(() => {
            optimizer = new MemoryOptimizer();
        });

        test('should enable and disable optimization', () => {
            expect(optimizer.isEnabled).toBe(false);
            
            optimizer.enable();
            expect(optimizer.isEnabled).toBe(true);
            
            optimizer.disable();
            expect(optimizer.isEnabled).toBe(false);
        });

        test('should create optimized nodes when enabled', () => {
            optimizer.enable();
            
            const node = optimizer.createOptimizedNode('select', {
                id: 1,
                line: 1
            });
            
            expect(node.type).toBe('select');
            expect(node.id).toBe(1);
            expect(node.line).toBe(1);
            
            const metrics = optimizer.getMetrics();
            expect(metrics.optimizedNodes).toBe(1);
        });

        test('should create regular objects when disabled', () => {
            optimizer.disable();
            
            const node = optimizer.createOptimizedNode('select', {
                id: 1,
                line: 1
            });
            
            expect(node.type).toBe('select');
            expect(node.id).toBe(1);
            
            const metrics = optimizer.getMetrics();
            expect(metrics.optimizedNodes).toBe(0); // Not counted when disabled
        });

        test('should optimize nested structures', () => {
            optimizer.enable();
            
            const complexNode = {
                type: 'return',
                rhs: {
                    type: 'select',
                    dependsOn: [],
                    listeners: []
                }
            };
            
            const optimized = optimizer.optimize(complexNode);
            
            expect(optimized.type).toBe('return');
            expect(optimized.rhs.type).toBe('select');
            expect(Array.isArray(optimized.rhs.dependsOn)).toBe(true);
        });

        test('should track optimization metrics', () => {
            optimizer.enable();
            
            optimizer.createOptimizedNode('select');
            optimizer.createOptimizedArray([1, 2, 3]);
            
            const metrics = optimizer.getMetrics();
            expect(metrics.optimizedNodes).toBe(1);
            expect(metrics.poolHits).toBe(1);
        });
    });

    describe('Node Factory', () => {
        test('should create select nodes with required properties', () => {
            const node = NodeFactory.createSelectNode({
                id: 1,
                fromClause: [{ name: 'users' }]
            });
            
            expect(node.type).toBe('select');
            expect(node.id).toBe(1);
            expect(node.fromClause).toEqual([{ name: 'users' }]);
            expect(Array.isArray(node.dependsOn)).toBe(true);
            expect(Array.isArray(node.listeners)).toBe(true);
        });

        test('should create return nodes', () => {
            const rhs = { type: 'define', object: 'test' };
            const node = NodeFactory.createReturnNode({
                id: 2,
                rhs: rhs
            });
            
            expect(node.type).toBe('return');
            expect(node.id).toBe(2);
            expect(node.rhs).toBe(rhs);
        });

        test('should create define nodes', () => {
            const node = NodeFactory.createDefineNode({
                id: 3,
                object: 'hello world'
            });
            
            expect(node.type).toBe('define');
            expect(node.id).toBe(3);
            expect(node.object).toBe('hello world');
        });

        test('should create minimal nodes with only required properties', () => {
            const node = NodeFactory.createMinimalNode('test', {
                required: 'value',
                optional: undefined,
                nullValue: null
            });
            
            expect(node.type).toBe('test');
            expect(node.required).toBe('value');
            expect(node.hasOwnProperty('optional')).toBe(false);
            expect(node.hasOwnProperty('nullValue')).toBe(false);
        });
    });

    describe('Compiler Integration', () => {
        test('should enable memory optimization in compiler', () => {
            compiler.enableMemoryOptimization();
            
            const query = 'select * from users';
            compiler.compile(query, {});
            
            const metrics = compiler.getMemoryMetrics();
            expect(metrics).toBeDefined();
        });

        test('should track memory optimization metrics', () => {
            compiler.enableMemoryOptimization();
            
            // Compile several queries (use non-fast-path queries)
            compiler.compile('select id, name from users', {});
            compiler.compile('select * from users where id = 1', {});
            compiler.compile('mydata = select id from data where active = true; return "{mydata}"', {});
            
            const metrics = compiler.getMemoryMetrics();
            expect(metrics.optimizedNodes).toBeGreaterThan(0);
        });

        test('should work with caching and memory optimization', () => {
            compiler.enableMemoryOptimization();
            
            const query = 'select id, name from users where status = "active"';
            
            // First compilation
            const result1 = compiler.compile(query, {});
            const cacheMetrics1 = compiler.getCacheMetrics();
            const memoryMetrics1 = compiler.getMemoryMetrics();
            
            // Second compilation (should hit cache)
            const result2 = compiler.compile(query, {});
            const cacheMetrics2 = compiler.getCacheMetrics();
            
            expect(result1).toEqual(result2);
            expect(cacheMetrics1.misses).toBe(1);
            expect(cacheMetrics2.hits).toBe(1);
            expect(memoryMetrics1.optimizedNodes).toBeGreaterThan(0);
        });

        test('should reset memory metrics', () => {
            compiler.enableMemoryOptimization();
            
            compiler.compile('select id, name from users', {});
            
            let metrics = compiler.getMemoryMetrics();
            expect(metrics.optimizedNodes).toBeGreaterThan(0);
            
            compiler.resetMemoryMetrics();
            
            metrics = compiler.getMemoryMetrics();
            expect(metrics.optimizedNodes).toBe(0);
        });

        test('should clear memory pools', () => {
            compiler.enableMemoryOptimization();
            
            compiler.compile('select * from users', {});
            compiler.clearMemoryPools();
            
            // Should not throw and should continue working
            const result = compiler.compile('return "test"', {});
            expect(result).toBeDefined();
        });
    });

    describe('Performance Impact', () => {
        test('should maintain performance with memory optimization', () => {
            const query = 'select * from users';
            const iterations = 50;
            
            // Test without optimization
            compiler.disableMemoryOptimization();
            const start1 = process.hrtime.bigint();
            for (let i = 0; i < iterations; i++) {
                compiler.compile(query + ` -- ${i}`, {});
            }
            const duration1 = Number(process.hrtime.bigint() - start1) / 1000000;
            
            // Clear and test with optimization
            compiler.clearCache();
            compiler.enableMemoryOptimization();
            const start2 = process.hrtime.bigint();
            for (let i = 0; i < iterations; i++) {
                compiler.compile(query + ` -- opt${i}`, {});
            }
            const duration2 = Number(process.hrtime.bigint() - start2) / 1000000;
            
            // Memory optimization should not significantly slow down compilation
            // Allow up to 3x slower due to system variability and optimization overhead
            expect(duration2).toBeLessThan(duration1 * 3);
        });

        test('should show memory efficiency gains', () => {
            compiler.enableMemoryOptimization();
            compiler.configureCaching({ maxSize: 0 }); // Disable cache to force recompilation
            
            // Compile many queries to test memory optimization
            for (let i = 0; i < 10; i++) {
                compiler.compile(`select id, name from table${i} where active = true`, {});
            }
            
            const metrics = compiler.getMemoryMetrics();
            
            // Should show optimization activity
            expect(metrics.optimizedNodes).toBeGreaterThan(0);
            expect(metrics.pools.nodes.created).toBeGreaterThan(0);
            
            // Re-enable cache
            compiler.configureCaching({ maxSize: 1000 });
        });
    });
});