validPost = select * from jsonplaceholder.posts where id = 1;

return {
  "valid_post_id": "1",
  "valid_post_data": "{validPost}",
  "message": "Conditional logic demonstration",
  "explanation": "WHERE clauses act as conditional filters to find specific records"
} via route '/demo-conditional' using method get