-- Test table for UPDATE operations
create table users
  on select get from "http://localhost:3000/users"
  on update post to "http://localhost:3000/users"
  using defaults format = 'json'
  resultset 'users'