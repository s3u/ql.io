create table github.repos
  on select get from "https://api.github.com/search/repositories?q={q}&sort={sort}&order={order}"
     using defaults sort = "updated", order = "desc"
     using patch 'github-repos.js'
     resultset 'items';