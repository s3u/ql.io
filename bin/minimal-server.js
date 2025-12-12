#!/usr/bin/env node

/**
 * Minimal ql.io server for testing
 * This creates a simple HTTP server with the ql.io engine
 */

const Engine = require('../modules/engine/lib/engine.js');
const express = require('express');
const path = require('path');

console.log('🚀 Starting minimal ql.io server...');

// Create engine
const engine = new Engine({
    tables: path.join(__dirname, '..', 'tables'),
    routes: path.join(__dirname, '..', 'routes'),
    config: path.join(__dirname, '..', 'config', 'dev.json')
});

// Create Express app
const app = express();

// Add JSON middleware
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
    res.json({
        message: 'ql.io minimal server',
        endpoints: {
            tables: '/tables',
            execute: '/q (POST with ql script in body)'
        }
    });
});

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