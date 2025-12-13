targetUser = "octocat";
maxResults = 5;

githubUser = select * from github.user where username = "{targetUser}";
githubRepos = select * from github.repos where username = "{targetUser}" limit 5;
posts = select * from jsonplaceholder.posts limit 5;

return {
  "target_user": "{targetUser}",
  "max_results": "{maxResults}",
  "github_user": "{githubUser[0]}",
  "repositories": "{githubRepos}",
  "sample_posts": "{posts}"
} via route '/demo-variables' using method get