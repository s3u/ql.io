create table met.departments
  on select get from 'https://collectionapi.metmuseum.org/public/collection/v1/departments'
  resultset 'departments'