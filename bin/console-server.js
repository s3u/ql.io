#!/usr/bin/env node

/**
 * ql.io server with integrated web console
 * Combines minimal API server with legacy console interface
 */

const Engine = require('../modules/engine/lib/engine.js');
const express = require('express');
const path = require('path');
const browserify = require('browserify');

console.log('🚀 Starting ql.io server with web console...');

// Create engine
const engine = new Engine({
    tables: path.join(__dirname, '..', 'tables'),
    routes: path.join(__dirname, '..', 'routes'),
    config: path.join(__dirname, '..', 'config', 'dev.json')
});

// Create Express app
const app = express();

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from console module
app.use('/css', express.static(path.join(__dirname, '..', 'modules/console/public/css')));
app.use('/scripts', express.static(path.join(__dirname, '..', 'modules/console/public/scripts')));
app.use('/images', express.static(path.join(__dirname, '..', 'modules/console/public/images')));

// Setup EJS for console templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'modules/console/public/views'));

// Browserify bundle for client-side modules
app.get('/scripts/compiler.js', function(req, res) {
    res.set('Content-Type', 'application/javascript');
    
    const b = browserify({
        require: [
            'ql.io-compiler',
            'headers', 
            'mustache',
            'events'
        ]
    });
    
    b.bundle(function(err, buf) {
        if (err) {
            console.error('Browserify bundle error:', err);
            res.status(500).send('// Browserify bundle error: ' + err.message);
        } else {
            res.send(buf);
        }
    });
});

// Console routes
app.get('/console', function(req, res) {
    res.render('console-simple', {
        title: 'ql.io Console',
        script: req.query.s || '-- Type ql script here - all keywords must be in lower case'
    });
});

app.get('/', (req, res) => {
    res.redirect('/console');
});

// API routes (same as minimal server)
app.get('/api', (req, res) => {
    res.json({
        message: 'ql.io server with web console',
        endpoints: {
            console: '/console',
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
    console.log('🖥️  Web Console: http://localhost:' + port + '/console');
    console.log('📋 Tables API: http://localhost:' + port + '/tables');
    console.log('🔧 Execute API: POST to http://localhost:' + port + '/q');
    console.log('');
    console.log('💡 Test the console in your browser!');
    console.log('');
    console.log('Press Ctrl+C to stop');
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});