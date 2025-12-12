# ql.io Table Definitions

This directory contains table definitions that map external APIs to ql.io tables. These tables can be used in queries to fetch and combine data from various sources.

## Available APIs

### 🎨 Museum & Culture
- **Metropolitan Museum** (`met.*`) - Art collection and museum data
- **Rijksmuseum** (`rijks.*`) - Dutch art and cultural heritage

### 👥 Social & Development  
- **GitHub API** (`github.*`) - Public repositories and user data
- **JSONPlaceholder** (`jsonplaceholder.*`) - Fake REST API for testing

### 🌍 Geographic & Reference
- **REST Countries** (`restcountries.*`) - Comprehensive country information
- **Universities** (`universities.*`) - Global university database

### 🚀 Science & Technology
- **SpaceX API** (`spacex.*`) - Space exploration and launch data

### 🔧 Utilities & Testing
- **HTTPBin** (`httpbin.*`) - HTTP request testing service
- **Cat Facts** (`catfacts.*`) - Random cat facts (for fun examples)

## Quick Examples

### Basic Queries
```sql
-- Show all available tables
show tables

-- Get a random cat fact
select fact from catfacts.random

-- Get your IP address
select origin from httpbin.ip

-- Get SpaceX company information
select name, founder, founded from spacex.company
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
-- Get country info with fallback
country = "Germany";
info = select name.common, capital, population from restcountries.country where name = {country};
if (info && info.length > 0) {
  return {"country": info[0], "status": "found"}
} else {
  return {"error": "Country not found", "status": "not_found"}
}
```

## API Endpoints

All APIs used are free and don't require authentication:

- **JSONPlaceholder**: `https://jsonplaceholder.typicode.com/`
- **GitHub API**: `https://api.github.com/` (public data only)
- **REST Countries**: `https://restcountries.com/v3.1/`
- **SpaceX API**: `https://api.spacexdata.com/v4/`
- **Universities**: `http://universities.hipolabs.com/`
- **Cat Facts**: `https://catfact.ninja/`
- **HTTPBin**: `https://httpbin.org/`
- **Metropolitan Museum**: `https://collectionapi.metmuseum.org/`
- **Rijksmuseum**: `https://www.rijksmuseum.nl/api/`

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