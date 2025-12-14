# ql.io Demos

This directory contains all demo-related files for ql.io, including table definitions, route examples, and integration tests.

## Directory Structure

```
demos/
├── README.md                    # This file
├── tables/                      # Table definitions for demo APIs
│   ├── catfacts.ql             # Cat Facts API table
│   ├── examples.ql             # Example queries and patterns
│   ├── github.ql               # GitHub API tables
│   ├── jsonplaceholder.*.ql    # JSONPlaceholder API tables
│   └── README.md               # Table documentation
├── routes/                      # Demo route definitions
│   ├── welcome.ql              # Welcome page route
│   ├── demos.ql                # Demo index route
│   ├── demo-basic.ql           # Basic API calls demo
│   ├── demo-joins.ql           # JOIN operations demo
│   ├── demo-variables.ql       # Variable assignment demo
│   ├── demo-conditional.ql     # Conditional logic demo
│   ├── demo-aggregation.ql     # Data aggregation demo
│   └── demo-error-handling.ql  # Error handling demo
└── test/                        # Integration tests
    ├── demo-integration.test.js # Main integration test suite
    └── integration-setup.js     # Test setup configuration
```

## Available APIs

### JSONPlaceholder (Primary Demo API)
- **Posts**: `jsonplaceholder.posts` - Blog posts with id, title, body, userId
- **Users**: `jsonplaceholder.users` - User information with id, name, email, etc.
- **Comments**: `jsonplaceholder.comments` - Comments with id, name, email, body, postId

### GitHub API (Limited Use)
- **User**: `github.user` - User profile information
- **Repositories**: `github.repos` - User repositories
- **Repository**: `github.repo` - Individual repository details

### Cat Facts API (Fun Examples)
- **Random**: `catfacts.random` - Random cat facts
- **Facts**: `catfacts.facts` - Collection of cat facts

## Demo Routes

### Core Routes
- `/` - Welcome page with quick start information
- `/demos` - Index of all available demos

### Feature Demonstrations
- `/demo-basic` - Simple SELECT queries and API calls
- `/demo-joins` - JOIN operations using local data arrays
- `/demo-variables` - Variable assignment and parameter substitution
- `/demo-conditional` - WHERE clause filtering and conditional logic
- `/demo-aggregation` - Multi-source data aggregation
- `/demo-error-handling` - Graceful error handling patterns

## Running Demos

### Start Demo Server
```bash
# From project root
npm start
```

This will start:
- Backend API server on http://localhost:3000
- Modern React console on http://localhost:3001

### Access Demos
- **Console UI**: http://localhost:3001
- **API Endpoint**: http://localhost:3000
- **Demo Routes**: http://localhost:3000/demos

### Example Queries
```sql
-- Show available tables
show tables

-- Basic SELECT with LIMIT
select id, title from jsonplaceholder.posts limit 5

-- Variable assignment and substitution
postId = 1;
post = select * from jsonplaceholder.posts where id = {postId};
return post

-- JOIN operations
posts = select id, title, userId from jsonplaceholder.posts limit 3;
users = select id, name, email from jsonplaceholder.users;
return select p.title, u.name, u.email 
       from posts as p, users as u 
       where p.userId = u.id
```

## Testing

### Run Integration Tests
```bash
# Run all demo integration tests
npm run test:demo

# Or use the detailed test runner
./bin/test-demo.sh
```

### Test Coverage
- ✅ Core API functionality (tables, queries)
- ✅ All demo routes (8 routes)
- ✅ ql.io language syntax validation
- ✅ Error handling
- ✅ Performance and concurrency

## Development

### Adding New Demos
1. Create table definitions in `demos/tables/`
2. Create route definitions in `demos/routes/`
3. Add tests in `demos/test/demo-integration.test.js`
4. Update this README

### Table Definition Format
```sql
-- Table definition example
create table api.endpoint
  on select get from "https://api.example.com/endpoint"
     using defaults format="json";
```

### Route Definition Format
```sql
-- Route definition example
data = select * from api.endpoint limit 5;
return {
  "data": "{data}",
  "message": "Demo description"
} via route '/demo-name' using method get
```

## Notes

- All demos use reliable, free APIs that don't require authentication
- External API calls are kept minimal to ensure test reliability
- Focus on demonstrating ql.io language features rather than complex API integrations
- Error handling is built into all demos for graceful degradation