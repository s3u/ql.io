#!/bin/bash

# ql.io AWS Serverless One-Click Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
STACK_NAME="qlio-serverless"
REGION="us-west-2"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -s|--stack-name)
      STACK_NAME="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -e, --environment    Environment (dev/staging/prod) [default: dev]"
      echo "  -r, --region         AWS Region [default: us-west-2]"
      echo "  -s, --stack-name     CloudFormation stack name [default: qlio-serverless]"
      echo "  -h, --help           Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

FULL_STACK_NAME="${STACK_NAME}-${ENVIRONMENT}"

echo -e "${BLUE}🚀 ql.io Serverless Deployment${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "Stack Name: ${YELLOW}${FULL_STACK_NAME}${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
    exit 1
fi

# Check SAM CLI
if ! command -v sam &> /dev/null; then
    echo -e "${RED}❌ SAM CLI not found. Please install SAM CLI.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'.${NC}"
    exit 1
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account: ${ACCOUNT_ID}${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js: ${NODE_VERSION}${NC}"

echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
cd lambda && npm install && cd ..
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Build SAM application
echo -e "${BLUE}🔨 Building SAM application...${NC}"
sam build --template template-simple-complete.yaml
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Deploy SAM application
echo -e "${BLUE}🚀 Deploying to AWS...${NC}"
sam deploy \
  --template .aws-sam/build/template.yaml \
  --stack-name "${FULL_STACK_NAME}" \
  --resolve-s3 \
  --no-confirm-changeset \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment="${ENVIRONMENT}" \
  --region "${REGION}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment completed successfully${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""

# Upload sample table definitions
echo -e "${BLUE}📄 Uploading sample table definitions...${NC}"
CONFIG_BUCKET="qlio-config-${ACCOUNT_ID}-${ENVIRONMENT}"
aws s3 cp sample-tables/ s3://${CONFIG_BUCKET}/tables/ --recursive --region "${REGION}"
echo -e "${GREEN}✅ Sample tables uploaded${NC}"
echo ""

# Create console bucket separately (to avoid S3 policy issues)
echo -e "${BLUE}🌐 Creating console bucket...${NC}"
CONSOLE_BUCKET="qlio-console-${ACCOUNT_ID}-${ENVIRONMENT}"
aws s3 mb s3://${CONSOLE_BUCKET} --region "${REGION}" 2>/dev/null || echo "Bucket already exists"
aws s3 website s3://${CONSOLE_BUCKET} --index-document index.html --error-document error.html --region "${REGION}"

# Upload console files
aws s3 cp console/ s3://${CONSOLE_BUCKET}/ --recursive --region "${REGION}"
aws s3api put-bucket-policy --bucket ${CONSOLE_BUCKET} --policy "{
  \"Statement\": [{
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::${CONSOLE_BUCKET}/*\"
  }]
}" --region "${REGION}"
echo -e "${GREEN}✅ Console bucket created and files uploaded${NC}"
echo ""

# Get deployment outputs
echo -e "${BLUE}📊 Getting deployment information...${NC}"
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "${FULL_STACK_NAME}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

CONSOLE_URL="http://${CONSOLE_BUCKET}.s3-website-${REGION}.amazonaws.com"

API_KEY_ID=$(aws cloudformation describe-stacks \
  --stack-name "${FULL_STACK_NAME}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiKeyId`].OutputValue' \
  --output text)

API_KEY_VALUE=$(aws apigateway get-api-key \
  --api-key "${API_KEY_ID}" \
  --include-value \
  --region "${REGION}" \
  --query 'value' \
  --output text)

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}======================${NC}"
echo ""
echo -e "${BLUE}📡 API Information:${NC}"
echo -e "  URL: ${YELLOW}${API_URL}${NC}"
echo -e "  Key: ${YELLOW}${API_KEY_VALUE}${NC}"
echo ""
echo -e "${BLUE}🌐 Console Information:${NC}"
echo -e "  URL: ${YELLOW}${CONSOLE_URL}${NC}"
echo ""
echo -e "${BLUE}🧪 Test Commands:${NC}"
echo -e "${YELLOW}# Test tables endpoint${NC}"
echo -e "curl -X GET ${API_URL}/tables \\"
echo -e "  -H \"X-API-Key: ${API_KEY_VALUE}\""
echo ""
echo -e "${YELLOW}# Test query endpoint${NC}"
echo -e "curl -X POST ${API_URL}/query \\"
echo -e "  -H \"X-API-Key: ${API_KEY_VALUE}\" \\"
echo -e "  -H \"Content-Type: application/json\" \\"
echo -e "  -d '{\"query\": \"select * from github.repos where q='\\''test'\\''\")}'"
echo ""
echo -e "${BLUE}📋 Console Setup:${NC}"
echo -e "1. Open: ${YELLOW}${CONSOLE_URL}${NC}"
echo -e "2. Go to Settings tab"
echo -e "3. Configure API URL: ${YELLOW}${API_URL}${NC}"
echo -e "4. Configure API Key: ${YELLOW}${API_KEY_VALUE}${NC}"
echo -e "5. Test connection and start querying!"
echo ""

# Save deployment info to file
cat > deployment-info.json << EOF
{
  "environment": "${ENVIRONMENT}",
  "region": "${REGION}",
  "stackName": "${FULL_STACK_NAME}",
  "accountId": "${ACCOUNT_ID}",
  "apiUrl": "${API_URL}",
  "consoleUrl": "${CONSOLE_URL}",
  "apiKey": "${API_KEY_VALUE}",
  "configBucket": "${CONFIG_BUCKET}",
  "consoleBucket": "${CONSOLE_BUCKET}",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo -e "${GREEN}✅ Deployment info saved to deployment-info.json${NC}"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo -e "  Deploy: ${YELLOW}./deploy.sh -e ${ENVIRONMENT}${NC}"
echo -e "  Cleanup: ${YELLOW}./cleanup.sh -e ${ENVIRONMENT}${NC}"
echo -e "  Logs: ${YELLOW}aws logs tail /aws/lambda/qlio-${ENVIRONMENT} --follow --region ${REGION}${NC}"