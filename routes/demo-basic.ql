-- Basic Demo: Simple API Calls
-- Try: GET /demo-basic

-- Get random cat fact
catFact = select fact from catfacts.random;

-- Get your IP address
ipInfo = select origin from httpbin.ip;

-- Get latest SpaceX launch
launch = select name, date_utc, success from spacex.latest_launch;

return {
  "cat_fact": "{catFact[0].fact}",
  "your_ip": "{ipInfo[0].origin}",
  "latest_spacex_launch": "{launch[0]}"
}