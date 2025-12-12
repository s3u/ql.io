create table rijks.artwork
  on select get from 'https://www.rijksmuseum.nl/api/nl/collection/{objectNumber}?key=0fiuZFh4&format=json'
  using defaults objectNumber = 'SK-C-5'
  resultset 'artObject'