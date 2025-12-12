-- HTTPBin - HTTP Request & Response Service
-- Great for testing HTTP methods and headers
create table httpbin.get
  on select get from 'https://httpbin.org/get'

create table httpbin.ip
  on select get from 'https://httpbin.org/ip'

create table httpbin.user_agent
  on select get from 'https://httpbin.org/user-agent'

create table httpbin.headers
  on select get from 'https://httpbin.org/headers'