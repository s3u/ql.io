#!/bin/bash

# ql.io AWS Serverless Sequential Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
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
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -e, --environment    Environment (dev/staging/prod) [default: dev]"
      echo "  -r, --region         AWS Region [default: us-west-2]"
      echo "  -h, --help           Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}🚀 ql.io Serverless Sequential Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo ""

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account: ${ACCOUNT_ID}${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
cd lambda && npm install && cd ..
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 1: Deploy DynamoDB
echo -e "${BLUE}1️⃣ Deploying DynamoDB cache table...${NC}"
aws cloudformation deploy \
  --template-file template-dynamodb-only.yaml \
  --stack-name "qlio-dynamodb-${ENVIRONMENT}" \
  --parameter-overrides Environment="${ENVIRONMENT}" \
  --region "${REGION}"
echo -e "${GREEN}✅ DynamoDB deployed${NC}"
echo ""

# Step 2: Deploy S3 Config Bucket
echo -e "${BLUE}2️⃣ Deploying S3 config bucket...${NC}"
aws cloudformation deploy \
  --template-file template-s3-config.yaml \
  --stack-name "qlio-s3-config-${ENVIRONMENT}" \
  --parameter-overrides Environment="${ENVIRONMENT}" \
  --region "${REGION}"
echo -e "${GREEN}✅ S3 config bucket deployed${NC}"
echo ""

# Step 3: Upload sample tables
echo -e "${BLUE}3️⃣ Uploading sample table definitions...${NC}"
CONFIG_BUCKET="qlio-config-${ACCOUNT_ID}-${ENVIRONMENT}"
aws s3 cp sample-tables/ s3://${CONFIG_BUCKET}/tables/ --recursive --region "${REGION}"
echo -e "${GREEN}✅ Sample tables uploaded${NC}"
echo ""

# Step 4: Deploy Lambda with API Gateway
echo -e "${BLUE}4️⃣ Deploying Lambda function and API Gateway...${NC}"
sam build --template template-minimal.yaml
sam deploy \
  --template .aws-sam/build/template.yaml \
  --stack-name "qlio-lambda-${ENVIRONMENT}" \
  --resolve-s3 \
  --no-confirm-changeset \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment="${ENVIRONMENT}" \
  --region "${REGION}"
echo -e "${GREEN}✅ Lambda and API Gateway deployed${NC}"
echo ""

# Step 5: Get API Gateway ID and deploy API keys
echo -e "${BLUE}5️⃣ Deploying API keys and usage plan...${NC}"
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "qlio-lambda-${ENVIRONMENT}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

API_GATEWAY_ID=$(echo $API_URL | cut -d'/' -f3 | cut -d'.' -f1)

aws cloudformation deploy \
  --template-file template-api-keys.yaml \
  --stack-name "qlio-api-keys-${ENVIRONMENT}" \
  --parameter-overrides Environment="${ENVIRONMENT}" ApiGatewayId="${API_GATEWAY_ID}" \
  --region "${REGION}"
echo -e "${GREEN}✅ API keys deployed${NC}"
echo ""

# Step 6: Deploy console bucket
echo -e "${BLUE}6️⃣ Deploying console bucket...${NC}"
aws cloudformation deploy \
  --template-file template-console.yaml \
  --stack-name "qlio-console-${ENVIRONMENT}" \
  --parameter-overrides Environment="${ENVIRONMENT}" \
  --region "${REGION}"
echo -e "${GREEN}✅ Console bucket deployed${NC}"
echo ""

# Step 7: Upload console files
echo -e "${BLUE}7️⃣ Uploading console files...${NC}"
CONSOLE_BUCKET="qlio-console-${ACCOUNT_ID}-${ENVIRONMENT}"
aws s3 cp console/ s3://${CONSOLE_BUCKET}/ --recursive --region "${REGION}"
echo -e "${GREEN}✅ Console files uploaded${NC}"
echo ""

# Get deployment outputs
echo -e "${BLUE}📊 Getting deployment information...${NC}"

API_KEY_ID=$(aws cloudformation describe-stacks \
  --stack-name "qlio-api-keys-${ENVIRONMENT}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiKeyId`].OutputValue' \
  --output text)

API_KEY_VALUE=$(aws apigateway get-api-key \
  --api-key "${API_KEY_ID}" \
  --include-value \
  --region "${REGION}" \
  --query 'value' \
  --output text)

CONSOLE_URL=$(aws cloudformation describe-stacks \
  --stack-name "qlio-console-${ENVIRONMENT}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[?OutputKey==`ConsoleWebsiteUrl`].OutputValue' \
  --output text)

echo ""
echo -e "${GREEN}🎉 Sequential Deployment Complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${BLUE}📡 API Information:${NC}"
echo -e "  URL: ${YELLOW}${API_URL}${NC}"
echo -e "  Key: ${YELLOW}${API_KEY_VALUE}${NC}"
echo ""
echo -e "${BLUE}🌐 Console Information:${NC}"
echo -e "  URL: ${YELLOW}${CONSOLE_URL}${NC}"
echo ""
echo -e "${BLUE}📋 Deployed Stacks:${NC}"
echo -e "  • qlio-dynamodb-${ENVIRONMENT}"
echo -e "  • qlio-s3-config-${ENVIRONMENT}"
echo -e "  • qlio-lambda-${ENVIRONMENT}"
echo -e "  • qlio-api-keys-${ENVIRONMENT}"
echo -e "  • qlio-console-${ENVIRONMENT}"
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

# Save deployment info
cat > deployment-info.json << EOF
{
  "environment": "${ENVIRONMENT}",
  "region": "${REGION}",
  "accountId": "${ACCOUNT_ID}",
  "apiUrl": "${API_URL}",
  "consoleUrl": "${CONSOLE_URL}",
  "apiKey": "${API_KEY_VALUE}",
  "configBucket": "${CONFIG_BUCKET}",
  "consoleBucket": "${CONSOLE_BUCKET}",
  "stacks": [
    "qlio-dynamodb-${ENVIRONMENT}",
    "qlio-s3-config-${ENVIRONMENT}",
    "qlio-lambda-${ENVIRONMENT}",
    "qlio-api-keys-${ENVIRONMENT}",
    "qlio-console-${ENVIRONMENT}"
  ],
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo -e "${GREEN}✅ Deployment info saved to deployment-info.json${NC}"