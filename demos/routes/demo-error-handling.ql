post = select * from jsonplaceholder.posts where id = 1;

return {
  "valid_post": "{post}",
  "message": "Error handling demonstration - this post exists",
  "explanation": "If the post didn't exist, it would return null instead of an error"
} via route '/demo-error-handling' using method get