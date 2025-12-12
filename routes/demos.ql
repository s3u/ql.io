-- ql.io Demo Index
-- Try: GET /demos

return {
  "welcome": "Welcome to ql.io Interactive Demos!",
  "description": "These demos showcase ql.io's powerful data aggregation capabilities using real APIs",
  
  "available_demos": [
    {
      "name": "Basic API Calls",
      "url": "/demo-basic",
      "description": "Simple API calls to get cat facts, IP info, and SpaceX data"
    },
    {
      "name": "JOIN Operations", 
      "url": "/demo-joins",
      "description": "Combine data from multiple tables using JOIN-like operations"
    },
    {
      "name": "Variable Assignment",
      "url": "/demo-variables", 
      "description": "Use variables to parameterize queries and reuse values"
    },
    {
      "name": "Conditional Logic",
      "url": "/demo-conditional",
      "description": "IF-ELSE statements for dynamic query execution"
    },
    {
      "name": "Data Aggregation",
      "url": "/demo-aggregation",
      "description": "Aggregate and analyze data from multiple API sources"
    },
    {
      "name": "Error Handling",
      "url": "/demo-error-handling", 
      "description": "Graceful error handling with TRY-CATCH blocks"
    }
  ],
  
  "available_apis": [
    {
      "name": "JSONPlaceholder",
      "tables": ["jsonplaceholder.posts", "jsonplaceholder.users", "jsonplaceholder.comments"],
      "description": "Fake REST API for testing - posts, users, and comments"
    },
    {
      "name": "GitHub API",
      "tables": ["github.user", "github.repos", "github.repo"],
      "description": "Public GitHub data - users and repositories"
    },
    {
      "name": "REST Countries",
      "tables": ["restcountries.all", "restcountries.country", "restcountries.region"],
      "description": "Comprehensive country information and statistics"
    },
    {
      "name": "SpaceX API", 
      "tables": ["spacex.launches", "spacex.rockets", "spacex.company"],
      "description": "Space exploration data and company information"
    },
    {
      "name": "Universities API",
      "tables": ["universities.search"],
      "description": "Search universities worldwide by country or name"
    },
    {
      "name": "Cat Facts",
      "tables": ["catfacts.random", "catfacts.facts"],
      "description": "Random cat facts for fun examples"
    },
    {
      "name": "HTTPBin",
      "tables": ["httpbin.get", "httpbin.ip", "httpbin.headers"],
      "description": "HTTP testing service for debugging requests"
    },
    {
      "name": "Metropolitan Museum",
      "tables": ["met.departments", "met.search", "met.artwork"],
      "description": "Art collection and museum data"
    },
    {
      "name": "Rijksmuseum",
      "tables": ["rijks.collection", "rijks.artwork"],
      "description": "Dutch art and cultural heritage"
    }
  ],
  
  "quick_examples": [
    {
      "description": "Get random cat fact",
      "query": "select fact from catfacts.random"
    },
    {
      "description": "List GitHub user repos",
      "query": "select name, stargazers_count from github.repos where username = 'octocat' limit 5"
    },
    {
      "description": "Find European countries",
      "query": "select name.common as country, capital, population from restcountries.region where region = 'Europe' limit 10"
    },
    {
      "description": "Get SpaceX company info",
      "query": "select name, founder, founded, employees from spacex.company"
    },
    {
      "description": "Search US universities",
      "query": "select name, web_pages from universities.search where country = 'United States' limit 10"
    }
  ],
  
  "getting_started": {
    "console_url": "http://localhost:3001",
    "api_endpoint": "http://localhost:3000/q",
    "tables_list": "http://localhost:3000/tables",
    "tip": "Use 'show tables' to see all available data sources"
  }
}