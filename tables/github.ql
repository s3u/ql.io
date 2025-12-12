-- GitHub Public API
-- Repository and user information (no auth required for public data)
create table github.user
  on select get from 'https://api.github.com/users/{username}' using defaults username = 'octocat'

create table github.repos
  on select get from 'https://api.github.com/users/{username}/repos' using defaults username = 'octocat'

create table github.repo
  on select get from 'https://api.github.com/repos/{owner}/{repo}' using defaults owner = 'octocat', repo = 'Hello-World'