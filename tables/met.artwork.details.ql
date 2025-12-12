create table met.artwork.details
  on select get from 'https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectID}'
  using defaults objectID = '436524'
  resultset 'data'