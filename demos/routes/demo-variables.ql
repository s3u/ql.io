targetUser = "octocat";
maxResults = 3;
posts = select * from jsonplaceholder.posts limit 3;

return {
  "target_user": "{targetUser}",
  "max_results": "{maxResults}",
  "sample_posts": "{posts}",
  "message": "Variable assignment demonstration",
  "explanation": "Shows how to assign values to variables and use them in queries"
} via route '/demo-variables' using method get