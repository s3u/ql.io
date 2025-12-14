return {
  "welcome": "Welcome to ql.io Interactive Demos!",
  "available_demos": [
    {"name": "Basic API Calls", "url": "/demo-basic"},
    {"name": "JOIN Operations", "url": "/demo-joins"},
    {"name": "Variable Assignment", "url": "/demo-variables"},
    {"name": "Conditional Logic", "url": "/demo-conditional"},
    {"name": "Data Aggregation", "url": "/demo-aggregation"},
    {"name": "Error Handling", "url": "/demo-error-handling"}
  ],
  "available_apis": [
    {"name": "JSONPlaceholder", "tables": ["jsonplaceholder.posts", "jsonplaceholder.users", "jsonplaceholder.comments"]},
    {"name": "GitHub API", "tables": ["github.user", "github.repos", "github.repo"]},
    {"name": "Cat Facts", "tables": ["catfacts.random", "catfacts.facts"]}
  ]
} via route '/demos' using method get