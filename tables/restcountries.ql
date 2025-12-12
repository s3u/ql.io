-- REST Countries API
-- Comprehensive country information
create table restcountries.all
  on select get from 'https://restcountries.com/v3.1/all'

create table restcountries.country
  on select get from 'https://restcountries.com/v3.1/name/{name}' using defaults name = 'united states'

create table restcountries.region
  on select get from 'https://restcountries.com/v3.1/region/{region}' using defaults region = 'europe'

create table restcountries.currency
  on select get from 'https://restcountries.com/v3.1/currency/{currency}' using defaults currency = 'usd'