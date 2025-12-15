# ql.io AWS Serverless Design Document

## Architecture Overview

### Serverless Architecture Pattern

```
User Request → API Gateway → Lambda Function → DynamoDB (cache)
                                ↓
Static Files ← S3 ← CloudFront
```

### Core Components

#### AWS Lambda Function
- **Runtime**: Node.js 18.x
- **Memory**: 512MB (configurable)
- **Timeout**: 30 seconds
- **Purpose**: Execute ql.io queries and handle API requests
- **Triggers**: API Gateway HTTP events

#### API Gateway
- **Type**: REST API with API key authentication
- **Endpoints**: `/query` (POST), `/tables` (GET), `/{proxy+}` (ANY)
- **Features**: Rate limiting, request validation, CORS support
- **Authentication**: API key required for all endpoints

#### DynamoDB Table
- **Purpose**: Query result caching
- **Key**: `queryHash` (String)
- **TTL**: Automatic cleanup of expired cache entries
- **Billing**: On-demand for cost efficiency

#### S3 Buckets
- **Config Bucket**: Table definitions and route configurations
- **Console Bucket**: Static web assets for admin console
- **Features**: Versioning enabled, lifecycle policies

#### CloudFront Distribution
- **Purpose**: Global CDN for console UI
- **Origin**: S3 console bucket
- **Features**: HTTPS redirect, caching, global edge locations

## AWS SAM Template Design

### Template Structure
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  Environment: [dev, staging, prod]

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 512

Resources:
  - QLIOFunction (AWS::Serverless::Function)
  - CacheTable (AWS::Serverless::SimpleTable)
  - ConfigBucket (AWS::S3::Bucket)
  - ConsoleBucket (AWS::S3::Bucket)
  - ConsoleDistribution (AWS::CloudFront::Distribution)
  - ApiKey (AWS::ApiGateway::ApiKey)
  - UsagePlan (AWS::ApiGateway::UsagePlan)
```

### Lambda Function Design

#### Handler Structure
```javascript
exports.handler = async (event, context) => {
  // Initialize ql.io engine (cached between invocations)
  const engine = await getOrCreateEngine();
  
  // Route request based on path
  switch (event.path) {
    case '/query':
      return await handleQuery(event, engine);
    case '/tables':
      return await handleTables(engine);
    default:
      return await handleDynamicRoute(event, engine);
  }
};
```

#### Cold Start Optimization
- Engine initialization cached between invocations
- Configuration loaded from S3 and cached in memory
- Connection pooling for external APIs
- Minimal dependencies in deployment package

#### Caching Strategy
```javascript
const cacheQuery = async (queryHash, result) => {
  await dynamodb.put({
    TableName: process.env.CACHE_TABLE,
    Item: {
      queryHash,
      result: JSON.stringify(result),
      ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    }
  }).promise();
};
```

### Security Design

#### IAM Roles and Policies
```yaml
LambdaExecutionRole:
  Policies:
    - S3ReadOnlyAccess (config bucket)
    - DynamoDBFullAccess (cache table only)
    - CloudWatchLogsFullAccess
    - VPCAccessExecutionRole (if VPC needed)
```

#### API Security
- API key authentication for all endpoints
- Rate limiting: 1000 requests/minute per key
- CORS configuration for web console
- Request size limits and validation

#### Data Security
- Encryption at rest for S3 and DynamoDB
- HTTPS-only communication
- No sensitive data in Lambda environment variables
- Secure credential management via AWS Secrets Manager

### Configuration Management

#### S3 Configuration Structure
```
qlio-config-{account}-{env}/
├── tables/
│   ├── github.ql
│   ├── jsonplaceholder.ql
│   └── custom-api.ql
├── routes/
│   ├── demo-route.ql
│   └── admin-route.ql
└── config.json
```

#### Environment-Specific Configuration
- Development: Relaxed rate limits, verbose logging
- Staging: Production-like settings, extended logging
- Production: Strict limits, minimal logging, monitoring

### Monitoring and Observability

#### CloudWatch Integration
- Automatic Lambda function logging
- Custom metrics for query performance
- API Gateway access logs
- DynamoDB performance metrics

#### Key Metrics
- Query execution time
- Cache hit/miss ratios
- API request rates and errors
- Lambda cold start frequency
- Cost per query execution

### Performance Optimization

#### Lambda Optimization
- Provisioned concurrency for consistent performance
- Memory allocation based on profiling
- Connection reuse for external APIs
- Efficient JSON parsing and serialization

#### Caching Strategy
- Query result caching in DynamoDB
- Configuration caching in Lambda memory
- CloudFront caching for static assets
- API Gateway response caching

#### Cost Optimization
- On-demand DynamoDB billing
- S3 Intelligent Tiering
- Lambda memory right-sizing
- CloudFront cost-effective caching policies

## Deployment Architecture

### SAM Deployment Process
1. **Build**: Package Lambda function and dependencies
2. **Deploy**: Create/update CloudFormation stack
3. **Configure**: Set up API keys and usage plans
4. **Upload**: Deploy console UI to S3
5. **Invalidate**: Clear CloudFront cache

### Environment Management
- Separate stacks per environment
- Parameter-driven configuration
- Blue/green deployment support
- Rollback capabilities

### Local Development
- SAM local API simulation
- DynamoDB local for testing
- S3 local simulation
- Hot reload for development

This design provides a scalable, cost-effective, and maintainable serverless architecture for ql.io while preserving all existing functionality and improving operational characteristics.