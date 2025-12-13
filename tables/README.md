# ql.io Table Definitions

This directory contains table definitions that map external APIs to ql.io tables. These tables can be used in queries to fetch and combine data from various sources.

## Available APIs (Fast & Reliable)

### 👥 Social & Development  
- **GitHub API** (`github.*`) - Public repositories and user data
- **JSONPlaceholder** (`jsonplaceholder.*`) - Fake REST API for testing

### 🔧 Utilities & Fun
- **Cat Facts** (`catfacts.*`) - Random cat facts (for fun examples)

## Quick Examples

### Basic Queries
```sql
-- Show all available tables
show tables

-- Get a random cat fact
select fact from catfacts.random

-- Get GitHub user info
select login, name, public_repos from github.user where username = "octocat"

-- Get blog posts
select id, title, body from jsonplaceholder.posts limit 5
```

### Advanced Queries with Variables
```sql
-- Search GitHub repositories
username = "octocat";
repos = select name, description, stargazers_count 
        from github.repos 
        where username = {username} 
        limit 10;
return repos
```

### JOIN Operations
```sql
-- Combine posts with user information
posts = select id, title, userId from jsonplaceholder.posts limit 5;
users = select id, name, email from jsonplaceholder.users;
return select p.title, u.name, u.email 
       from posts as p, users as u 
       where p.userId = u.id
```

### Conditional Logic
```sql
-- Get user info with fallback
username = "octocat";
user = select login, name, public_repos from github.user where username = {username};
if (user && user.length > 0) {
  return {"user": user[0], "status": "found"}
} else {
  return {"error": "User not found", "status": "not_found"}
}
```

## API Endpoints

All APIs used are free, fast (< 500ms), and don't require authentication:

- **JSONPlaceholder**: `https://jsonplaceholder.typicode.com/`
- **GitHub API**: `https://api.github.com/` (public data only)
- **Cat Facts**: `https://catfact.ninja/`

## Interactive Demos

Visit these routes to see ql.io in action:

- `/demos` - Complete demo index
- `/demo-basic` - Simple API calls
- `/demo-joins` - JOIN operations
- `/demo-variables` - Variable usage
- `/demo-conditional` - IF-ELSE logic
- `/demo-aggregation` - Multi-source data aggregation
- `/demo-error-handling` - Error handling patterns

## Console Access

- **Modern Console**: http://localhost:3001 (React-based UI)
- **Legacy Console**: http://localhost:3000/console (Traditional UI)
- **API Endpoint**: http://localhost:3000/q (POST queries here)

## Tips

1. Use `show tables` to see all available tables
2. Start with simple `select * from table_name` queries
3. Use `limit N` to restrict result size
4. Combine multiple APIs using variables and JOINs
5. Handle errors gracefully with try-catch blocks
6. Use the modern console for the best development experience

Happy querying! 🚀