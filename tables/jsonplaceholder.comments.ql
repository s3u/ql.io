-- JSONPlaceholder Comments API
-- Comments for posts - great for nested queries
create table jsonplaceholder.comments
  on select get from 'https://jsonplaceholder.typicode.com/comments'
  on select get from 'https://jsonplaceholder.typicode.com/posts/{postId}/comments' using defaults postId = 1