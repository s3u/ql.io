-- Advanced Demo: JOIN Operations
-- Try: GET /demo-joins

-- Get posts with user information (JOIN simulation)
posts = select id, title, body, userId from jsonplaceholder.posts limit 5;
users = select id, name, email, website from jsonplaceholder.users;

-- Simulate JOIN by combining data
postsWithUsers = select 
  p.id as postId,
  p.title,
  p.body,
  u.name as authorName,
  u.email as authorEmail,
  u.website as authorWebsite
from posts as p, users as u 
where p.userId = u.id;

return {
  "posts_with_authors": "{postsWithUsers}",
  "total_posts": "{postsWithUsers.length}"
}