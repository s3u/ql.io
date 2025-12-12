create table rijks.collection
  on select get from 'https://www.rijksmuseum.nl/api/nl/collection?key=0fiuZFh4&format=json&q={query}&imgonly={imgonly}&p={page}&ps={pagesize}'
  using defaults query = 'Rembrandt', imgonly = 'true', page = '1', pagesize = '10'
  resultset 'artObjects'