# 🎨 ql.io Museum API Demo

This demonstrates ql.io's power for querying museum collection APIs using SQL-like syntax.

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   node bin/minimal-server.js
   ```

2. **Run the demo:**
   ```bash
   ./bin/demo-queries.sh
   ```

## 🏛️ Available Museum Tables

### Metropolitan Museum of Art (Met)
- **`met.departments`** - Museum departments
- **`met.artwork`** - Individual artwork details  
- **`met.search`** - Search the collection

### Rijksmuseum (Amsterdam)
- **`rijks.collection`** - Search artworks with images
- **`rijks.artwork`** - Individual artwork details

## 💡 Example Queries

### List Museum Departments
```sql
select * from met.departments
```

### Search for Van Gogh Paintings
```sql
select title, principalOrFirstMaker, webImage.url 
from rijks.collection 
where query="Van Gogh" 
limit 5
```

### Find Vermeer Masterpieces
```sql
select title, longTitle, webImage.url
from rijks.collection 
where query="Vermeer"
```

### Get Specific Artwork Details
```sql
select * from rijks.artwork where objectNumber="SK-A-2344"
```

## 🌐 HTTP API Usage

### Using curl:
```bash
# List all tables
curl http://localhost:3000/tables

# Execute a query
curl -X POST -H "Content-Type: application/json" \
     -d '{"q":"select * from met.departments"}' \
     http://localhost:3000/q

# Search for Monet paintings
curl -X POST -H "Content-Type: application/json" \
     -d '{"q":"select title, principalOrFirstMaker from rijks.collection where query=\"Monet\""}' \
     http://localhost:3000/q
```

### Using JavaScript fetch:
```javascript
// Search for artwork
const response = await fetch('http://localhost:3000/q', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    q: 'select title, webImage.url from rijks.collection where query="Picasso" limit 3'
  })
});
const artworks = await response.json();
console.log(artworks);
```

## 🎯 What This Demonstrates

1. **SQL-like queries** on REST APIs
2. **Data aggregation** from multiple museum sources
3. **Parameter binding** for dynamic queries
4. **JSON result sets** for easy consumption
5. **Real-time API integration** without custom code

## 🔧 Table Definitions

The museum tables are defined in simple `.ql` files:

**`tables/rijks.collection.ql`:**
```sql
create table rijks.collection
  on select get from 'https://www.rijksmuseum.nl/api/nl/collection?key=0fiuZFh4&format=json&q={query}&imgonly={imgonly}&p={page}&ps={pagesize}'
  using defaults query = 'Rembrandt', imgonly = 'true', page = '1', pagesize = '10'
  resultset 'artObjects'
```

**`tables/met.departments.ql`:**
```sql
create table met.departments
  on select get from 'https://collectionapi.metmuseum.org/public/collection/v1/departments'
  resultset 'departments'
```

## 🌟 Key Features Showcased

- ✅ **Zero-code API integration** - Just define the table, start querying
- ✅ **SQL familiarity** - Use SELECT, WHERE, LIMIT on any REST API  
- ✅ **Parameter binding** - Dynamic queries with `{parameter}` syntax
- ✅ **JSON responses** - Perfect for web applications
- ✅ **Real museum data** - Live data from Met Museum and Rijksmuseum
- ✅ **High-resolution images** - Direct links to artwork images

This showcases ql.io's power to turn any REST API into a queryable data source using familiar SQL syntax!