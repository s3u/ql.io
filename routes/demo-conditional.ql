-- Demonstrate conditional logic using WHERE clauses
username = "octocat";
nonExistentUser = "nonexistentuser12345";

-- Conditional data fetching - will return data if user exists
validUser = select * from github.user where username = "{username}";
invalidUser = select * from github.user where username = "{nonExistentUser}";

return {
  "username_tested": "{username}",
  "valid_user_data": "{validUser[0]}",
  "invalid_username_tested": "{nonExistentUser}",
  "invalid_user_data": "{invalidUser[0]}",
  "message": "Conditional logic: comparing valid vs invalid usernames",
  "explanation": "WHERE clauses act as conditional filters - valid user returns data, invalid returns null"
} via route '/demo-conditional' using method get