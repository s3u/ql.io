posts = select * from jsonplaceholder.posts limit 2;
users = select * from jsonplaceholder.users limit 2;

return {
  "posts": "{posts}",
  "users": "{users}",
  "posts_count": "{posts.length}",
  "users_count": "{users.length}",
  "message": "Data aggregated from multiple API endpoints"
} via route '/demo-aggregation' using method get