-- ql.io Example Queries
-- Comprehensive examples showcasing various ql.io features

-- Example 1: Basic SELECT
-- Get all posts from JSONPlaceholder
-- Usage: select * from jsonplaceholder.posts

-- Example 2: SELECT with WHERE clause
-- Get posts by specific user
-- Usage: select title, body from jsonplaceholder.posts where userId = 1

-- Example 3: Variable Assignment and Reuse
-- Assign user ID to variable and use in multiple queries
-- Usage: 
-- userId = 1;
-- user = select * from jsonplaceholder.users where id = {userId};
-- posts = select * from jsonplaceholder.posts where userId = {userId};
-- return {
--   "user": "{user}",
--   "posts": "{posts}"
-- }

-- Example 4: JOIN Operations
-- Join posts with user information
-- Usage:
-- posts = select id, title, body, userId from jsonplaceholder.posts limit 5;
-- users = select id, name, email from jsonplaceholder.users;
-- return select p.title, p.body, u.name, u.email 
--        from posts as p, users as u 
--        where p.userId = u.id

-- Example 5: Nested Queries with Comments
-- Get post with its comments
-- Usage:
-- postId = 1;
-- post = select * from jsonplaceholder.posts where id = {postId};
-- comments = select name, email, body from jsonplaceholder.comments where postId = {postId};
-- return {
--   "post": "{post}",
--   "comments": "{comments}"
-- }

-- Example 6: Multiple API Aggregation
-- Combine data from different sources
-- Usage:
-- countries = select name.common as country, population, region from restcountries.region where region = "europe" limit 5;
-- catFact = select fact from catfacts.random;
-- return {
--   "european_countries": "{countries}",
--   "random_cat_fact": "{catFact}",
--   "timestamp": "{new Date().toISOString()}"
-- }

-- Example 7: Conditional Logic with IF-ELSE
-- Usage:
-- username = "octocat";
-- user = select * from github.user where username = {username};
-- if (user) {
--   repos = select name, description, stargazers_count from github.repos where username = {username} limit 10;
--   return {
--     "user": "{user}",
--     "repositories": "{repos}"
--   }
-- } else {
--   return {"error": "User not found"}
-- }

-- Example 8: Data Transformation and Filtering
-- Transform and filter SpaceX launch data
-- Usage:
-- launches = select name, date_utc, success, details from spacex.launches where success = true limit 10;
-- company = select name, founder, founded, employees from spacex.company;
-- return {
--   "company_info": "{company}",
--   "successful_launches": "{launches}",
--   "total_successful": "{launches.length}"
-- }

-- Example 9: University Search with Country Filter
-- Usage:
-- country = "United States";
-- universities = select name, web_pages, domains from universities.search where country = {country} limit 20;
-- return {
--   "country": "{country}",
--   "universities": "{universities}",
--   "count": "{universities.length}"
-- }

-- Example 10: Error Handling with TRY-CATCH
-- Usage:
-- try {
--   user = select * from github.user where username = "nonexistentuser12345";
--   return {"user": "{user}"}
-- } catch (e) {
--   return {"error": "Failed to fetch user", "message": "{e.message}"}
-- }