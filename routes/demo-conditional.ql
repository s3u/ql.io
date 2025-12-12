-- Conditional Logic Demo
-- Try: GET /demo-conditional

-- Get GitHub user (change username to test different scenarios)
username = "octocat";
user = select * from github.user where username = {username};

if (user && user.length > 0) {
  -- User exists, get their repositories
  repos = select name, description, stargazers_count, language 
          from github.repos 
          where username = {username} 
          limit 10;
  
  -- Sort by stars (simulated)
  topRepos = select name, stargazers_count, language 
             from repos 
             where stargazers_count > 0;
  
  return {
    "status": "success",
    "user": {
      "login": "{user[0].login}",
      "name": "{user[0].name}",
      "bio": "{user[0].bio}",
      "public_repos": "{user[0].public_repos}",
      "followers": "{user[0].followers}"
    },
    "top_repositories": "{topRepos}",
    "repository_count": "{repos.length}"
  }
} else {
  return {
    "status": "error",
    "message": "User '{username}' not found",
    "suggestion": "Try 'octocat', 'torvalds', or 'gaearon'"
  }
}