-- Welcome Route
-- Try: GET /

return {
  "message": "Welcome to ql.io!",
  "description": "A declarative data retrieval and aggregation gateway",
  "version": "0.8.11",
  "
": {
    "modern_console": "http://localhost:3001",
    "legacy_console": "http://localhost:3000/console",
    "api_endpoint": "http://localhost:3000/q",
    "demos": "http://localhost:3000/demos"
  },
  "quick_start": [
    "Visit the modern console at http://localhost:3001",
    "Try 'show tables' to see available data sources", 
    "Run 'select fact from catfacts.random' for a quick test",
    "Explore demos at http://localhost:3000/demos"
  ],
  "sample_queries": [
    "show tables",
    "select fact from catfacts.random",
    "select name, stargazers_count from github.repos where username = 'octocat' limit 5",
    "select name.common as country from restcountries.region where region = 'Europe' limit 10"
  ]
}