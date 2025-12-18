# ql.io AWS Serverless Deployment

This directory contains the AWS serverless deployment configuration for ql.io using AWS SAM (Serverless Application Model).

## Directory Structure

```
aws/
├── template.yaml          # SAM template defining AWS resources
├── samconfig.toml         # SAM configuration for different environments
├── package.json           # Build and deployment scripts
├── lambda/                # Lambda function code
│   ├── index.js          # Main Lambda handler
│   └── package.json      # Lambda dependencies
└── console/               # Web console UI
    ├── index.html        # Main console interface
    └── error.html        # Error page
```

## Prerequisites

1. **AWS CLI** - Install and configure with your AWS credentials
2. **SAM CLI** - Install AWS SAM CLI for local development and deployment
3. **Node.js 18+** - Required for Lambda runtime
4. **AWS Account** - With appropriate IAM permissions

### Required IAM Permissions

Your AWS user/role needs the following permissions:
- CloudFormation full access
- Lambda full access
- API Gateway full access
- DynamoDB full access
- S3 full access
- CloudFront full access
- IAM role creation and management

## Quick Start

### 1. Install Dependencies

```bash
cd aws
npm install
cd lambda
npm install
```

### 2. Validate Template

```bash
npm run validate
```

### 3. Deploy to Development

```bash
npm run deploy:dev
```

### 4. Get Deployment Information

After deployment, note the outputs:
- **ApiUrl**: Your API Gateway endpoint
- **ConsoleUrl**: CloudFront URL for the web console
- **ApiKeyId**: API key for authentication

### 5. Retrieve API Key

```bash
# Get API Key ID from deployment output, then retrieve the key value
aws apigateway get-api-key --api-key <ApiKeyId> --include-value --query 'value' --output text
```

**Security Note**: API keys are not displayed in deployment logs for security reasons. Always retrieve them using the AWS CLI with appropriate permissions.

## Local Development

### Start Local API

```bash
npm run local:start
```

This starts a local API Gateway simulation on `http://localhost:3000`

### Test Local Function

```bash
npm run local:invoke
```

### Watch for Changes

```bash
npm run sync:dev
```

## Deployment Environments

### Development
```bash
npm run deploy:dev
```
- Stack: `qlio-serverless-dev`
- Relaxed rate limits
- Verbose logging

### Staging
```bash
npm run deploy:staging
```
- Stack: `qlio-serverless-staging`
- Production-like settings
- Extended logging

### Production
```bash
npm run deploy:prod
```
- Stack: `qlio-serverless-prod`
- Strict limits
- Minimal logging
- Requires confirmation

## Configuration

### Environment Variables

The Lambda function uses these environment variables:
- `CACHE_TABLE`: DynamoDB table name for caching
- `CONFIG_BUCKET`: S3 bucket for configuration files
- `ENVIRONMENT`: Deployment environment (dev/staging/prod)

### API Endpoints

- `POST /query` - Execute ql.io queries
- `GET /tables` - List available tables
- `ANY /{proxy+}` - Dynamic route handling

All endpoints require API key authentication via `X-API-Key` header.

## Console UI

The web console provides:
- Query execution interface
- Table management
- Configuration settings
- Connection testing

Access via the CloudFront URL from deployment outputs.

## Monitoring

### View Logs
```bash
npm run logs
```

### CloudWatch Metrics
- Lambda execution duration
- API Gateway request count
- DynamoDB read/write units
- Error rates

## Cost Optimization

The serverless deployment is designed for cost efficiency:
- **Lambda**: Pay per execution
- **DynamoDB**: On-demand billing
- **S3**: Standard storage with lifecycle policies
- **CloudFront**: Pay per request
- **API Gateway**: Pay per API call

Typical monthly costs for moderate usage: < $50

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check IAM permissions
   - Verify AWS CLI configuration
   - Check CloudFormation events

2. **API Returns 403**
   - Verify API key is included in request
   - Check usage plan configuration

3. **Lambda Timeout**
   - Increase timeout in template.yaml
   - Optimize query execution

4. **Console Not Loading**
   - Check CloudFront distribution status
   - Verify S3 bucket policy

### Debug Commands

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name qlio-serverless-dev

# View Lambda logs
aws logs tail /aws/lambda/qlio-dev --follow

# Test API endpoint
curl -X POST https://your-api-url/Prod/query \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "select * from github.repos where q='\''test'\''"}'
```

## Cleanup

To remove all AWS resources:

```bash
sam delete --stack-name qlio-serverless-dev
```

## Next Steps

1. Configure table definitions in S3
2. Set up CI/CD pipeline
3. Add monitoring and alerting
4. Implement authentication enhancements
5. Add custom domain and SSL certificate