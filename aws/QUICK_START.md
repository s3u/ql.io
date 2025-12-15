# ql.io AWS Serverless - Quick Start Guide

## 🚀 One-Click Deployment

### Prerequisites
- AWS CLI configured with credentials
- SAM CLI installed
- Node.js 18+ installed

### Deploy Everything
```bash
cd aws
./deploy.sh
```

That's it! The script will:
1. ✅ Check all prerequisites
2. ✅ Install dependencies
3. ✅ Build the SAM application
4. ✅ Deploy all AWS resources
5. ✅ Upload sample tables and console
6. ✅ Display access information

### Deploy to Different Environment
```bash
./deploy.sh --environment staging
./deploy.sh --environment prod
```

### Deploy to Different Region
```bash
./deploy.sh --region us-east-1
```

## 🧹 One-Click Cleanup

### Remove Everything
```bash
./cleanup.sh
```

### Force Cleanup (No Confirmation)
```bash
./cleanup.sh --force
```

### Cleanup Different Environment
```bash
./cleanup.sh --environment staging
```

## 📋 What Gets Deployed

### AWS Resources
- **Lambda Function**: Serverless ql.io engine
- **API Gateway**: REST API with authentication
- **DynamoDB**: Query result caching
- **S3 Buckets**: Configuration and web console
- **API Keys**: Secure access control

### Sample Content
- **GitHub API Table**: Query GitHub repositories
- **JSONPlaceholder Table**: Test API endpoints
- **Web Console**: Browser-based query interface

## 🔗 Access Your Deployment

After deployment, you'll get:

### API Access
```bash
# API URL
https://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/Prod

# API Key
your-generated-api-key

# Test command
curl -X GET https://your-api-url/tables \
  -H "X-API-Key: your-api-key"
```

### Web Console
```bash
# Console URL
http://qlio-console-account-env.s3-website-us-west-2.amazonaws.com

# Setup Steps:
1. Open console URL
2. Go to Settings tab
3. Enter API URL and Key
4. Test connection
5. Start querying!
```

## 🧪 Example Queries

### List Available Tables
```bash
curl -X GET https://your-api-url/tables \
  -H "X-API-Key: your-api-key"
```

### Query GitHub Repositories
```bash
curl -X POST https://your-api-url/query \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "select * from github.repos where q='\''ql.io'\''"}'
```

### Query JSONPlaceholder Posts
```bash
curl -X POST https://your-api-url/query \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "select * from jsonplaceholder.posts"}'
```

## 💰 Cost Estimates

### Monthly Costs (Light Usage)
- **Lambda**: $5-15 (execution time)
- **API Gateway**: $3-10 (requests)
- **DynamoDB**: $1-5 (pay-per-request)
- **S3**: $1-3 (storage + requests)
- **Total**: ~$10-35/month

### Cost Optimization
- ✅ Pay-per-use billing
- ✅ Automatic scaling
- ✅ Query result caching
- ✅ No idle costs

## 🔧 Management Commands

### View Logs
```bash
aws logs tail /aws/lambda/qlio-dev --follow
```

### Update Lambda Code
```bash
# Make changes to lambda/ directory
./deploy.sh  # Redeploy
```

### Update Console
```bash
# Make changes to console/ directory
aws s3 cp console/ s3://your-console-bucket/ --recursive
```

### Update Table Definitions
```bash
# Make changes to sample-tables/ directory
aws s3 cp sample-tables/ s3://your-config-bucket/tables/ --recursive
```

## 🛠️ Customization

### Add New Tables
1. Create `.ql` file in `sample-tables/`
2. Run `./deploy.sh` to upload

### Modify Lambda Function
1. Edit files in `lambda/` directory
2. Run `./deploy.sh` to redeploy

### Change Configuration
1. Edit `template-complete.yaml`
2. Run `./deploy.sh` to update

## 🆘 Troubleshooting

### Deployment Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check SAM CLI
sam --version

# Check logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/qlio
```

### API Returns 403
- Verify API key is correct
- Check X-API-Key header format
- Ensure usage plan is active

### Console Not Loading
- Check S3 bucket policy
- Verify website hosting is enabled
- Check browser console for errors

### Lambda Timeout
- Check CloudWatch logs
- Increase timeout in template
- Optimize query complexity

## 📚 Next Steps

### Production Readiness
1. **Custom Domain**: Add Route 53 + CloudFront
2. **SSL Certificate**: Use ACM for HTTPS
3. **Monitoring**: CloudWatch dashboards
4. **Backup**: Cross-region replication

### Feature Enhancements
1. **Authentication**: Cognito user pools
2. **Table Management**: CRUD operations
3. **Query History**: Persistent storage
4. **Performance**: Query optimization

### Integration
1. **CI/CD**: GitHub Actions pipeline
2. **Testing**: Automated test suite
3. **Documentation**: API documentation
4. **Monitoring**: Application insights

## 🎯 Success Criteria

✅ **One-Click Deploy**: Single command deployment
✅ **One-Click Cleanup**: Complete resource removal
✅ **Serverless**: No server management required
✅ **Scalable**: Automatic scaling with demand
✅ **Cost-Effective**: Pay only for usage
✅ **Secure**: API key authentication
✅ **Fast**: Query result caching
✅ **User-Friendly**: Web console interface

Ready to get started? Run `./deploy.sh` and you'll have a fully functional serverless ql.io deployment in minutes!