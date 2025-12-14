-- Demonstrate JOIN operations using local data and API data
posts = select * from jsonplaceholder.posts limit 3;
users = select * from jsonplaceholder.users limit 3;

-- Create local data for demonstration
localPosts = [
  {"id": 1, "title": "First Post", "userId": 1},
  {"id": 2, "title": "Second Post", "userId": 2}
];

localUsers = [
  {"id": 1, "name": "Alice", "email": "alice@example.com"},
  {"id": 2, "name": "Bob", "email": "bob@example.com"}
];

-- Perform JOIN on local data (this syntax is supported)
joinedLocal = select p.title, u.name, u.email 
              from localPosts as p, localUsers as u 
              where p.userId = u.id;

return {
  "api_posts": "{posts}",
  "api_users": "{users}",
  "local_joined_data": "{joinedLocal}",
  "message": "JOIN demonstration using local data arrays",
  "explanation": "Shows how to JOIN two datasets on a common field (userId = id)"
} via route '/demo-joins' using method get