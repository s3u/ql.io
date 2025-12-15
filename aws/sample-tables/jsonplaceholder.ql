create table jsonplaceholder.posts
  on select get from "https://jsonplaceholder.typicode.com/posts"
     resultset 'root';

create table jsonplaceholder.users  
  on select get from "https://jsonplaceholder.typicode.com/users"
     resultset 'root';