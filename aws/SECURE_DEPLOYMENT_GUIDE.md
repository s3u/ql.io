# Secure Deployment Guide

## 🔒 Security-First Deployment

This guide ensures your ql.io serverless deployment follows security best practices with no credentials exposed in source control or logs.

## Prerequisites

### 1. AWS CLI Configuration
```bash
# Configure AWS CLI with your credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

### 2. GitHub Repository Secrets (for CI/CD)
If using GitHub Actions, configure these repository secrets:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key  
- `AWS_REGION`: Target region (e.g., us-west-2)

## Deployment Methods

### Method 1: Local Deployment (Recommended for Development)

```bash
# Clone and navigate to AWS directory
cd aws

# Install dependencies
npm install
cd lambda && npm install && cd ..

# Deploy using secure script
./deploy.sh -e dev

# The script will output API URL and Key ID, but NOT the key value
# Retrieve API key securely:
API_KEY_ID="your-key-id-from-output"
aws apigateway get-api-key --api-key $API_KEY_ID --include-value --query 'value' --output text
```

### Method 2: GitHub Actions CI/CD (Recommended for Production)

1. **Configure Repository Secrets**
   ```bash
   # Using GitHub CLI
   gh secret set AWS_ACCESS_KEY_ID --body "your-access-key"
   gh secret set AWS_SECRET_ACCESS_KEY --body "your-secret-key"
   gh secret set AWS_REGION --body "us-west-2"
   ```

2. **Trigger Deployment**
   - Go to Actions tab in your GitHub repository
   - Run "AWS Serverless Deployment" workflow
   - Select environment (dev/staging/prod)
   - For production, type "CONFIRM" in the confirmation field

3. **Retrieve Deployment Information**
   - Download deployment summary artifact from the workflow
   - Use AWS CLI to get API key value when needed

## Security Features

### ✅ What's Secure

- **No API keys in source control**: Keys never committed to git
- **No keys in deployment logs**: Sensitive values not displayed in CI/CD logs
- **Memory-only storage**: Console UI doesn't persist API keys in localStorage
- **Encrypted at rest**: All AWS services use encryption by default
- **IAM least privilege**: Lambda functions have minimal required permissions
- **API rate limiting**: Built-in protection against abuse

### ⚠️ Security Considerations

- **API key retrieval**: Only users with AWS CLI access can retrieve keys
- **Console access**: Anyone with the console URL can access the UI (add authentication for production)
- **CORS configuration**: Currently allows all origins (restrict for production)

## Production Hardening

### 1. Custom Domain and SSL
```bash
# Add custom domain to API Gateway
aws apigateway create-domain-name \
  --domain-name api.yourdomain.com \
  --certificate-arn arn:aws:acm:region:account:certificate/cert-id
```

### 2. VPC Configuration
Update `template.yaml` to add VPC settings:
```yaml
VpcConfig:
  SecurityGroupIds:
    - sg-12345678
  SubnetIds:
    - subnet-12345678
    - subnet-87654321
```

### 3. WAF Protection
```bash
# Create WAF web ACL for API Gateway
aws wafv2 create-web-acl \
  --name qlio-api-protection \
  --scope REGIONAL \
  --default-action Allow={}
```

### 4. CloudTrail Logging
```bash
# Enable CloudTrail for API calls
aws cloudtrail create-trail \
  --name qlio-api-audit \
  --s3-bucket-name your-audit-bucket
```

## Monitoring and Alerting

### 1. CloudWatch Dashboards
```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name qlio-serverless \
  --dashboard-body file://dashboard.json
```

### 2. Security Alerts
```bash
# Create alarm for failed API calls
aws cloudwatch put-metric-alarm \
  --alarm-name qlio-api-errors \
  --alarm-description "High error rate on ql.io API" \
  --metric-name 4XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Credential Management

### Development Environment
```bash
# Use AWS CLI profiles for different environments
aws configure --profile qlio-dev
aws configure --profile qlio-prod

# Deploy with specific profile
AWS_PROFILE=qlio-dev ./deploy.sh -e dev
```

### Production Environment
```bash
# Use IAM roles for EC2/Lambda
# Use AWS Systems Manager Parameter Store for secrets
aws ssm put-parameter \
  --name "/qlio/prod/api-config" \
  --value '{"key": "value"}' \
  --type "SecureString"
```

## Troubleshooting Security Issues

### API Key Not Working
```bash
# Check API key status
aws apigateway get-api-key --api-key YOUR_KEY_ID

# Check usage plan association
aws apigateway get-usage-plans
```

### Access Denied Errors
```bash
# Check IAM permissions
aws iam get-role --role-name qlio-lambda-role

# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name qlio-serverless-dev
```

### Console Not Loading
```bash
# Check S3 bucket policy
aws s3api get-bucket-policy --bucket qlio-console-account-env

# Check CloudFront distribution
aws cloudfront list-distributions
```

## Compliance Checklist

- [ ] No hardcoded credentials in source code
- [ ] API keys retrieved securely via AWS CLI
- [ ] Console UI doesn't persist sensitive data
- [ ] All data encrypted at rest and in transit
- [ ] IAM roles follow least privilege principle
- [ ] CloudTrail logging enabled for audit
- [ ] Regular security reviews scheduled
- [ ] Incident response plan documented

## Emergency Procedures

### Rotate Compromised API Key
```bash
# Create new API key
NEW_KEY=$(aws apigateway create-api-key --name qlio-api-key-new --enabled)

# Associate with usage plan
aws apigateway create-usage-plan-key \
  --usage-plan-id YOUR_USAGE_PLAN_ID \
  --key-id $NEW_KEY_ID \
  --key-type API_KEY

# Delete old key
aws apigateway delete-api-key --api-key OLD_KEY_ID
```

### Revoke All Access
```bash
# Disable API Gateway
aws apigateway update-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name Prod \
  --patch-ops op=replace,path=/throttle/rateLimit,value=0
```

This guide ensures your ql.io serverless deployment maintains the highest security standards while remaining functional and maintainable.