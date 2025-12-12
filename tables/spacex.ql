-- SpaceX API
-- Space exploration data
create table spacex.launches
  on select get from 'https://api.spacexdata.com/v4/launches'

create table spacex.latest_launch
  on select get from 'https://api.spacexdata.com/v4/launches/latest'

create table spacex.rockets
  on select get from 'https://api.spacexdata.com/v4/rockets'

create table spacex.company
  on select get from 'https://api.spacexdata.com/v4/company'