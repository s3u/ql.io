posts = select * from jsonplaceholder.posts limit 1;

return {
  "sample_posts": "{posts}",
  "message": "Basic API demonstration",
  "explanation": "Simple SELECT query with LIMIT clause"
} via route '/demo-basic' using method get