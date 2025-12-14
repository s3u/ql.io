
# ql.io

[![CI](https://github.com/s3u/ql.io/workflows/CI/badge.svg)](https://github.com/s3u/ql.io/actions/workflows/ci.yml)
[![Core Tests](https://github.com/s3u/ql.io/workflows/Core%20Tests/badge.svg)](https://github.com/s3u/ql.io/actions/workflows/test-core.yml)
[![Status](https://github.com/s3u/ql.io/workflows/Status/badge.svg)](https://github.com/s3u/ql.io/actions/workflows/status.yml)

A declarative data retrieval and aggregation gateway for HTTP APIs. Write SQL-like queries to fetch and combine data from multiple REST endpoints.

## What it does

ql.io lets you:
- Query REST APIs using SQL-like syntax
- Join data from multiple APIs in a single query
- Create reusable table definitions for APIs
- Aggregate and transform API responses
- Build data mashups with declarative queries

## Requirements

- Node.js 18.0.0+
- npm 8.0.0+

## Quick Start

```bash
git clone https://github.com/s3u/ql.io.git
cd ql.io
make install
npm start
```

**Access:**
- Console: http://localhost:3001
- API: http://localhost:3000
- Demos: http://localhost:3000/demos

## Example Queries

```sql
-- Show available data sources
show tables

-- Get blog posts
select id, title from jsonplaceholder.posts limit 5

-- Join posts with user data
posts = select id, title, userId from jsonplaceholder.posts limit 3;
users = select id, name, email from jsonplaceholder.users;
return select p.title, u.name, u.email 
       from posts as p, users as u 
       where p.userId = u.id

-- Use variables
userId = 1;
user = select * from jsonplaceholder.users where id = {userId};
return user
```

## Testing

```bash
# Run all tests (some integration tests may fail due to external API dependencies)
npm test

# Test specific modules
npm run test:engine
npm run test:compiler
npm run test:console
npm run test:app

# Test demos and integration
npm run test:demo
```

## Project Structure

Built with npm workspaces:

- **engine** - Query execution engine
- **compiler** - QL script compiler
- **console** - Web interface
- **app** - HTTP server framework
- **demos** - Example tables, routes, and tests

## Using as a Library

```bash
npm install ql.io-engine
```

```javascript
const Engine = require('ql.io-engine');

const engine = new Engine();
const script = `
  create table posts
    on select get from 'https://jsonplaceholder.typicode.com/posts'
  
  select id, title from posts limit 5
`;

engine.execute(script, function(emitter) {
  emitter.on('end', function(err, result) {
    if (err) {
      console.error(err);
    } else {
      console.log(result.body);
    }
  });
});
```

## Language Features

- **Tables**: Map REST endpoints to queryable tables
- **SELECT**: Query data with WHERE, LIMIT, ORDER BY
- **JOIN**: Combine data from multiple sources
- **Variables**: Parameterize queries with variable substitution
- **Routes**: Create HTTP endpoints that execute QL scripts
- **Error handling**: Graceful failure and timeout management

## Troubleshooting

**Port conflicts:**
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Permission errors:**
```bash
chmod +x bin/start.sh
```

**Dependency issues:**
```bash
make clean
make install
```

**Test failures:**
Some integration tests may fail due to external API rate limits or network issues. The core functionality and demo integration tests should pass:
```bash
npm run test:demo  # Should pass - tests core functionality
```

## License

Apache 2.0 
