create table met.search
  on select get from 'https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages={hasImages}&q={query}'
  using defaults hasImages = 'true', query = 'sunflowers'
  resultset 'objectIDs'