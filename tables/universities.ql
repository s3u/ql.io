-- Universities API
-- Search universities by country
create table universities.search
  on select get from 'http://universities.hipolabs.com/search'
  on select get from 'http://universities.hipolabs.com/search?country={country}' using defaults country = 'United States'
  on select get from 'http://universities.hipolabs.com/search?name={name}' using defaults name = 'Stanford'