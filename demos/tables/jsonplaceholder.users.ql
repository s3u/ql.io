-- JSONPlaceholder Users API
-- User information for joining with posts
create table jsonplaceholder.users
  on select get from 'https://jsonplaceholder.typicode.com/users'
  on select get from 'https://jsonplaceholder.typicode.com/users/{id}' using defaults id = 1