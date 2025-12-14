#!/usr/bin/env node

/**
 * Minimal ql.io server for testing
 * This creates a simple HTTP server with the ql.io engine
 */

const Engine = require('../modules/engine/lib/engine.js');
const express = require('express');
const path = require('path');

console.log('🚀 Starting minimal ql.io server...');

// Get demo directory from command line argument or use default
const demoDir = process.argv[2] || 'demos';
const basePath = path.join(__dirname, '..');

// Check if routes directory exists
const routesPath = path.join(basePath, demoDir, 'routes');
const tablesPath = path.join(basePath, demoDir, 'tables');

console.log('Demo directory:', demoDir);
console.log('Tables directory:', tablesPath);
console.log('Routes directory:', routesPath);
console.log('Routes directory exists:', require('fs').existsSync(routesPath));

if (require('fs').existsSync(routesPath)) {
    const files = require('fs').readdirSync(routesPath);
    console.log('Route files found:', files.filter(f => f.endsWith('.ql')));
}

// Create engine
const engine = new Engine({
    tables: tablesPath,
    routes: routesPath,
    config: path.join(basePath, 'config', 'dev.json')
});

console.log(`✅ Engine created with ${Object.keys(engine.routes.verbMap || {}).length} routes loaded`);

// Create Express app
const app = express();

// Add JSON middleware
app.use(express.json());

// Basic routes - will be overridden by dynamic routes if they exist

app.get('/tables', (req, res) => {
    engine.execute('show tables', function(emitter) {
        emitter.on('end', function(err, result) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(result.body);
            }
        });
    });
});

app.post('/q', (req, res) => {
    const script = req.body.q || req.body.script || '';
    if (!script) {
        return res.status(400).json({ error: 'No ql script provided' });
    }
    
    engine.execute(script, function(emitter) {
        emitter.on('end', function(err, result) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(result.body);
            }
        });
    });
});

// Add route handlers from engine
console.log('🛣️  Setting up route handlers...');
const routes = engine.routes ? engine.routes.verbMap : {};
let routeCount = 0;

Object.keys(routes).forEach(uri => {
    const verbRoutes = routes[uri];
    Object.keys(verbRoutes).forEach(verb => {
        const verbRouteVariants = verbRoutes[verb];
        
        // Map 'del' to 'delete' for Express compatibility
        const expressVerb = verb === 'del' ? 'delete' : verb;
        
        console.log(`   Adding route: ${expressVerb.toUpperCase()} ${uri}`);
        routeCount++;
        
        app[expressVerb](uri, (req, res) => {
            // Find matching route variant
            const route = verbRouteVariants.find(variant => {
                return true; // Simple matching - take the first variant
            });
            
            if (!route) {
                return res.status(400).json({ error: 'No matching route variant' });
            }
            
            // Execute the route script using the same pattern as /q endpoint
            const script = route.originalScript || route.script;
            
            engine.execute(script, function(emitter) {
                emitter.on('end', function(err, result) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    } else {
                        res.json(result.body);
                    }
                });
            });
        });
    });
});

console.log(`✅ Added ${routeCount} route handlers`);

const port = 3000;
app.listen(port, () => {
    console.log('✅ Server running on http://localhost:' + port);
    console.log('📋 Tables: http://localhost:' + port + '/tables');
    console.log('🔧 Execute: POST to http://localhost:' + port + '/q');
    console.log('');
    console.log('💡 Test with curl:');
    console.log('   curl http://localhost:' + port + '/tables');
    console.log('   curl -X POST -H "Content-Type: application/json" \\');
    console.log('        -d \'{"q":"show tables"}\' http://localhost:' + port + '/q');
    console.log('');
    console.log('Press Ctrl+C to stop');
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});