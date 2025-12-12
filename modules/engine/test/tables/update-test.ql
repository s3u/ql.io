-- Test table for UPDATE operations
create table updatetest
  on select get from "http://localhost:3000/updatetest"
  on update post to "http://localhost:3000/updatetest"
  using defaults format = 'json'
  resultset 'data'