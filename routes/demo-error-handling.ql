-- Error Handling Demo
-- Try: GET /demo-error-handling

results = {};

-- Try to get valid data
try {
  validUser = select login, name, public_repos from github.user where username = "octocat";
  results.valid_user = validUser[0];
  results.valid_user_status = "success";
} catch (e) {
  results.valid_user_status = "error";
  results.valid_user_error = e.message;
}

-- Try to get invalid data
try {
  invalidUser = select * from github.user where username = "this-user-definitely-does-not-exist-12345";
  results.invalid_user = invalidUser[0];
  results.invalid_user_status = "success";
} catch (e) {
  results.invalid_user_status = "error";
  results.invalid_user_error = "User not found (expected)";
}

-- Try multiple operations with fallbacks
try {
  catFact = select fact from catfacts.random;
  results.cat_fact = catFact[0].fact;
  results.cat_fact_status = "success";
} catch (e) {
  results.cat_fact = "Failed to get cat fact";
  results.cat_fact_status = "error";
  results.cat_fact_error = e.message;
}

-- Always include a timestamp
results.timestamp = new Date().toISOString();
results.demo_info = "This demo shows how ql.io handles API errors gracefully";

return results