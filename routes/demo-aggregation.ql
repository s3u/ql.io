-- Data Aggregation Demo
-- Try: GET /demo-aggregation

-- Aggregate data from multiple sources
europeanCountries = select name.common as country, population, capital 
                   from restcountries.region 
                   where region = "Europe" 
                   limit 15;

spacexInfo = select name, founder, founded, employees, valuation 
            from spacex.company;

recentLaunches = select name, date_utc, success 
                from spacex.launches 
                limit 10;

-- Calculate statistics
totalPopulation = 0;
successfulLaunches = 0;

-- Count successful launches
launches = recentLaunches;
for (launch in launches) {
  if (launch.success) {
    successfulLaunches = successfulLaunches + 1;
  }
}

return {
  "data_sources": {
    "countries_api": "REST Countries",
    "space_api": "SpaceX API",
    "timestamp": "{new Date().toISOString()}"
  },
  "european_countries": {
    "countries": "{europeanCountries}",
    "count": "{europeanCountries.length}"
  },
  "spacex_info": {
    "company": "{spacexInfo[0]}",
    "recent_launches": "{recentLaunches}",
    "success_rate": "{(successfulLaunches / recentLaunches.length * 100).toFixed(1)}%"
  },
  "summary": {
    "total_data_points": "{europeanCountries.length + recentLaunches.length + 1}",
    "apis_called": 3
  }
}