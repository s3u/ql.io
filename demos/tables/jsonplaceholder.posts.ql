-- JSONPlaceholder Posts API
-- Free fake REST API for testing and prototyping
create table jsonplaceholder.posts
  on select get from 'https://jsonplaceholder.typicode.com/posts'
  on select get from 'https://jsonplaceholder.typicode.com/posts/{id}' using defaults id = 1