-- Cat Facts API
-- Fun API for random cat facts
create table catfacts.random
  on select get from 'https://catfact.ninja/fact'

create table catfacts.facts
  on select get from 'https://catfact.ninja/facts'
  resultset 'data'