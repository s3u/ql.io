catFact = select * from catfacts.random;
githubUser = select * from github.user where username = "octocat";
posts = select * from jsonplaceholder.posts limit 3;

return {
  "cat_fact": "{catFact[0]}",
  "github_user": "{githubUser[0]}",
  "sample_posts": "{posts}"
} via route '/demo-basic' using method get