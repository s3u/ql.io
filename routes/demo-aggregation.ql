posts = select * from jsonplaceholder.posts limit 5;
users = select * from jsonplaceholder.users limit 3;
githubUser = select * from github.user where username = "octocat";
catFact = select * from catfacts.random;

return {
  "posts": "{posts}",
  "users": "{users}",
  "github_user": "{githubUser[0]}",
  "cat_fact": "{catFact[0]}",
  "message": "Data aggregated from multiple APIs"
} via route '/demo-aggregation' using method get