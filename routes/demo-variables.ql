-- Variable Assignment Demo
-- Try: GET /demo-variables

-- Assign variables for reuse
targetCountry = "Germany";
maxResults = 10;

-- Use variables in queries
countries = select name.common as country, capital, population, region 
           from restcountries.country 
           where name = {targetCountry};

universities = select name, web_pages 
              from universities.search 
              where country = {targetCountry} 
              limit {maxResults};

-- Calculate derived values
countryData = countries[0];
universityCount = universities.length;

return {
  "search_parameters": {
    "country": "{targetCountry}",
    "max_results": "{maxResults}"
  },
  "country_info": {
    "name": "{countryData.country}",
    "capital": "{countryData.capital[0]}",
    "population": "{countryData.population}",
    "region": "{countryData.region}"
  },
  "universities": "{universities}",
  "university_count": "{universityCount}"
}