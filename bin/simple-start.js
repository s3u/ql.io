#!/usr/bin/env node

/**
 * Simple ql.io server startup script
 * This bypasses some of the app module complexity and starts the console directly
 */

const Console = require('../modules/console/app.js');
const path = require('path');

console.log('🚀 Starting ql.io server (simple mode)...');

const options = {
    tables: path.join(__dirname, '..', 'tables'),
    routes: path.join(__dirname, '..', 'routes'), 
    config: path.join(__dirname, '..', 'config', 'dev.json'),
    'enable console': true,
    'enable q': true,
    connection: 'close'
};

console.log('📁 Tables:', options.tables);
console.log('🛣️  Routes:', options.routes);
console.log('⚙️  Config:', options.config);

const console_app = new Console(options, function(app, monApp, engine) {
    const port = 3000;
    const monPort = 3001;
    
    console.log('');
    console.log('🌐 Starting server...');
    
    app.listen(port, function() {
        console.log('✅ Main server listening on http://localhost:' + port);
        console.log('🖥️  Web console: http://localhost:' + port + '/console');
        console.log('📋 Tables: http://localhost:' + port + '/tables');
        console.log('');
        console.log('💡 Try this query in the console:');
        console.log('   select * from example.geocoder where address="San Francisco"');
        console.log('');
        console.log('Press Ctrl+C to stop the server');
    });
    
    monApp.listen(monPort, function() {
        console.log('📊 Monitoring server listening on http://localhost:' + monPort);
    });
});

// Handle graceful shutdown
process.on('SIGINT', function() {
    console.log('\n👋 Shutting down ql.io server...');
    process.exit(0);
});

process.on('SIGTERM', function() {
    console.log('\n👋 Shutting down ql.io server...');
    process.exit(0);
});