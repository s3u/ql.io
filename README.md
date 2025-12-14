
ql.io is a declarative, data-retrieval and aggregation gateway for quickly consuming HTTP APIs. 

A note:

This reposiory is a fork of the official repository `https://github.com/ql-io/ql.io`. I, along with a small group of colleagues, wrote ql.io during 2011 and 2012. While it because mildly popular, the project failed to gain adoption, and so, we decided to abandon it in 2012. Since then the code rotted due to broken dependencies, outdated patterns, vulnerabilities, etc.

During December 2025, I decided to modernize it with the help [Kiro](http://kiro.dev), and this fork is the result of that modernization. The project is now functional, and most functionality works. I am still reviewing the code changes, and modernizing it further.

## Requirements

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

## Quick Start

### 1. Clone and Build

```bash
git clone https://github.com/s3u/ql.io.git
cd ql.io
make install
```

### 2. Run the Server

```bash
# Start ql.io server (defaults to modern console)
bin/start.sh

# Or use npm directly
npm start

# Specific console options:
bin/start.sh --modern   # Modern React console (default)
bin/start.sh --legacy   # Traditional console
```

**Modern Console (Default):**
- **Modern UI**: http://localhost:3001 (React + TypeScript)
- **Backend API**: http://localhost:3000

**Legacy Console:**
- **Web Console**: http://localhost:3000/console (Traditional HTML)
- **API Server**: http://localhost:3000
- **Monitoring**: http://localhost:3001

**API Endpoints (both modes):**
- **Query Endpoint**: http://localhost:3000/q?s=show%20tables
- **Tables API**: http://localhost:3000/tables
- **Routes API**: http://localhost:3000/api

### 3. Test Your Installation

```bash
# Run all tests (298 tests across 7 modules)
make test

# Or use npm
npm test

# Test the running server
curl "http://localhost:3000/q?s=show%20tables"
curl "http://localhost:3000/tables"
```

## Development

### Project Structure

This project uses **npm workspaces** to manage 7 modules:

- **engine** - Core ql.io execution engine
- **compiler** - QL script compiler  
- **console** - Web console and HTTP interface
- **app** - Application framework
- **mutable-uri** - URI manipulation utilities
- **str-template** - String templating
- **uri-template** - URI templating

### Testing Individual Modules

```bash
# Test specific modules
make test-engine      # Core engine tests
make test-console     # Web console tests  
make test-compiler    # Compiler tests
make test-app         # Application tests

# Or using npm
npm run test:engine
npm run test:console
npm run test:compiler
npm run test:app
```

### Build Commands

```bash
make clean           # Clean all dependencies
make install         # Install all workspace dependencies
make test           # Run complete test suite
```

## Project Structure

ql.io is organized into several modules using npm workspaces:

- **engine** - Core ql.io execution engine
- **compiler** - QL script compiler  
- **console** - Web console and HTTP interface
- **app** - Application framework
- **mutable-uri** - URI manipulation utilities
- **str-template** - String templating
- **uri-template** - URI templating

## Modernization Status

This project has been **fully modernized** for Node.js 18+ with:

- ✅ **Modern React Console** (TypeScript + Vite, now default)
- ✅ **Modern npm workspaces** architecture (7 modules)
- ✅ **Jest testing framework** (298 tests, 100% pass rate)
- ✅ **Zero security vulnerabilities** (down from 11 critical)
- ✅ **Node.js 18+ compatibility** with modern JavaScript
- ✅ **Improved test coverage** (Engine: 66%+, Compiler: 67%+)
- ✅ **Clean build system** with proper dependency management
- ✅ **Dual console support** (modern + legacy for compatibility)

### Console Options

**Modern Console (Default):**
- React + TypeScript interface with syntax highlighting
- Real-time query execution with Ctrl+Enter
- Enhanced results visualization and formatting
- Modern development server with hot reload
- Responsive design for mobile and desktop

**Legacy Console:**
- Traditional server-side rendered interface
- Integrated with main ql.io server
- Backward compatible with existing workflows
- Single-server deployment

### Test Coverage Highlights
- **UPDATE operations**: 100% coverage
- **DELETE operations**: 84.61% coverage  
- **INSERT operations**: 66.66% coverage
- **Visualization**: 95.4% coverage
- **Try-Catch**: 100% coverage
- **Show Routes**: 100% coverage

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill processes on ports 3000/3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Permission errors:**
```bash
# Fix permissions on startup script
chmod +x bin/start.sh
```

**Module not found:**
```bash
# Reinstall dependencies
make clean
make install
```

**Tests failing:**
```bash
# Run tests with verbose output
npm test -- --verbose

# Test specific module
npm run test:engine -- --verbose
```

## Using ql.io as a Stand-Alone Server

### Option 1: Run from Source (Recommended)

```bash
git clone https://github.com/ql-io/ql.io.git
cd ql.io
make install
bin/start.sh
```

### Option 2: Create New App

```bash
mkdir myapp
cd myapp
curl https://raw.github.com/ql-io/ql.io/master/modules/template/init.sh | bash
bin/start.sh
```

**Access Points:**
- **API Server**: http://localhost:3000
- **Query Endpoint**: http://localhost:3000/q?s=show%20tables
- **Web Console**: http://localhost:3000/console
- **Health Monitor**: http://localhost:3001

Use modern browsers (Chrome, Firefox, Safari, Edge) for the best console experience.

## Using ql.io in a Node.js App

### Installation

```bash
npm install ql.io-engine
```

### Basic Usage

```javascript
const Engine = require('ql.io-engine');

const engine = new Engine({
    connection: 'close'
});

const script = `
    create table geocoder 
      on select get from 'http://maps.googleapis.com/maps/api/geocode/json?address={address}&sensor=true' 
         resultset 'results.geometry.location'
    
    select lat as latitude, lng as longitude 
    from geocoder 
    where address='Mt. Everest'
`;

engine.execute(script, function(emitter) {
    emitter.on('end', function(err, res) {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('Result:', res.body[0]);
        }
    });
});
```

### Modern Promise-Based Usage

```javascript
const Engine = require('ql.io-engine');
const { promisify } = require('util');

async function executeQuery() {
    const engine = new Engine();
    const execute = promisify(engine.execute.bind(engine));
    
    try {
        const result = await execute(script);
        console.log('Coordinates:', result.body[0]);
    } catch (error) {
        console.error('Query failed:', error);
    }
}
```

## Making Contributions

Fixes and features via pull requests are welcome as long as the contributor agrees to the
[Contributor License Agreement](https://github.com/downloads/ql-io/ql.io/ql.io-CLA.pdf). Print,
sign, and email a scanned copy to subbu/AT/ebaysf/DOT/com before submitting the first pull request.

To help move pull requests quickly, consider socializing your idea in the
[email group](http://groups.google.com/group/qlio).

## Discussions

Subscribe to the [google group](http://groups.google.com/group/qlio). 
