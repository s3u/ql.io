create table example.geocoder
  on select get from 'http://maps.googleapis.com/maps/api/geocode/json?address={address}&sensor=true'
  resultset 'results.geometry.location'
