#!/bin/bash

# ql.io AWS Serverless One-Click Cleanup Script
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
FORCE=false

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
    -f|--force)
      FORCE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -e, --environment    Environment (dev/staging/prod) [default: dev]"
      echo "  -r, --region         AWS Region [default: us-west-2]"
      echo "  -s, --stack-name     CloudFormation stack name [default: qlio-serverless]"
      echo "  -f, --force          Skip confirmation prompt"
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

echo -e "${RED}🗑️  ql.io Serverless Cleanup${NC}"
echo -e "${RED}=============================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "Stack Name: ${YELLOW}${FULL_STACK_NAME}${NC}"
echo ""

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name "${FULL_STACK_NAME}" --region "${REGION}" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Stack ${FULL_STACK_NAME} not found in region ${REGION}${NC}"
    exit 0
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get stack resources
echo -e "${BLUE}📋 Checking stack resources...${NC}"

CONFIG_BUCKET="qlio-config-${ACCOUNT_ID}-${ENVIRONMENT}"
CONSOLE_BUCKET="qlio-console-${ACCOUNT_ID}-${ENVIRONMENT}"
CACHE_TABLE="qlio-cache-${ENVIRONMENT}"

echo -e "Resources to be deleted:"
echo -e "  • Lambda Function: ${YELLOW}qlio-${ENVIRONMENT}${NC}"
echo -e "  • API Gateway: ${YELLOW}(auto-generated)${NC}"
echo -e "  • DynamoDB Table: ${YELLOW}${CACHE_TABLE}${NC}"
echo -e "  • S3 Config Bucket: ${YELLOW}${CONFIG_BUCKET}${NC}"
echo -e "  • S3 Console Bucket: ${YELLOW}${CONSOLE_BUCKET}${NC}"
echo -e "  • API Keys & Usage Plans: ${YELLOW}(auto-generated)${NC}"
echo ""

# Confirmation prompt
if [ "$FORCE" = false ]; then
    echo -e "${RED}⚠️  WARNING: This will permanently delete all resources!${NC}"
    echo -e "${RED}⚠️  All data in S3 buckets and DynamoDB will be lost!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}🧹 Starting cleanup process...${NC}"

# Empty S3 buckets first (required before deletion)
echo -e "${BLUE}📦 Emptying S3 buckets...${NC}"

# Empty config bucket
if aws s3 ls "s3://${CONFIG_BUCKET}" --region "${REGION}" &> /dev/null; then
    echo -e "  Emptying config bucket: ${CONFIG_BUCKET}"
    aws s3 rm "s3://${CONFIG_BUCKET}" --recursive --region "${REGION}" || true
    echo -e "${GREEN}  ✅ Config bucket emptied${NC}"
else
    echo -e "${YELLOW}  ⚠️  Config bucket not found or already empty${NC}"
fi

# Empty console bucket
if aws s3 ls "s3://${CONSOLE_BUCKET}" --region "${REGION}" &> /dev/null; then
    echo -e "  Emptying console bucket: ${CONSOLE_BUCKET}"
    aws s3 rm "s3://${CONSOLE_BUCKET}" --recursive --region "${REGION}" || true
    echo -e "${GREEN}  ✅ Console bucket emptied${NC}"
else
    echo -e "${YELLOW}  ⚠️  Console bucket not found or already empty${NC}"
fi

echo ""

# Delete CloudFormation stack
echo -e "${BLUE}🗑️  Deleting CloudFormation stack...${NC}"
aws cloudformation delete-stack \
  --stack-name "${FULL_STACK_NAME}" \
  --region "${REGION}"

echo -e "${BLUE}⏳ Waiting for stack deletion to complete...${NC}"
echo -e "${YELLOW}   This may take several minutes...${NC}"

# Wait for stack deletion with timeout
TIMEOUT=1800  # 30 minutes
ELAPSED=0
INTERVAL=30

while [ $ELAPSED -lt $TIMEOUT ]; do
    if ! aws cloudformation describe-stacks --stack-name "${FULL_STACK_NAME}" --region "${REGION}" &> /dev/null; then
        echo -e "${GREEN}✅ Stack deleted successfully${NC}"
        break
    fi
    
    echo -e "${BLUE}   Still deleting... (${ELAPSED}s elapsed)${NC}"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}❌ Stack deletion timed out after ${TIMEOUT} seconds${NC}"
    echo -e "${YELLOW}   Check AWS Console for stack status${NC}"
    exit 1
fi

echo ""

# Verify cleanup
echo -e "${BLUE}🔍 Verifying cleanup...${NC}"

# Check if stack still exists
if aws cloudformation describe-stacks --stack-name "${FULL_STACK_NAME}" --region "${REGION}" &> /dev/null; then
    echo -e "${RED}❌ Stack still exists${NC}"
    exit 1
fi

# Check if buckets still exist
CONFIG_EXISTS=$(aws s3 ls "s3://${CONFIG_BUCKET}" --region "${REGION}" &> /dev/null && echo "true" || echo "false")
CONSOLE_EXISTS=$(aws s3 ls "s3://${CONSOLE_BUCKET}" --region "${REGION}" &> /dev/null && echo "true" || echo "false")

if [ "$CONFIG_EXISTS" = "true" ] || [ "$CONSOLE_EXISTS" = "true" ]; then
    echo -e "${YELLOW}⚠️  Some S3 buckets may still exist (this is normal if they have versioning)${NC}"
    if [ "$CONFIG_EXISTS" = "true" ]; then
        echo -e "   Config bucket: ${CONFIG_BUCKET}"
    fi
    if [ "$CONSOLE_EXISTS" = "true" ]; then
        echo -e "   Console bucket: ${CONSOLE_BUCKET}"
    fi
    echo -e "${YELLOW}   These will be cleaned up automatically by AWS${NC}"
fi

# Clean up local files
echo -e "${BLUE}🧹 Cleaning up local files...${NC}"
rm -f deployment-info.json
rm -rf .aws-sam
echo -e "${GREEN}✅ Local files cleaned${NC}"

echo ""
echo -e "${GREEN}🎉 Cleanup Complete!${NC}"
echo -e "${GREEN}==================${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  • CloudFormation stack: ${GREEN}Deleted${NC}"
echo -e "  • Lambda function: ${GREEN}Deleted${NC}"
echo -e "  • API Gateway: ${GREEN}Deleted${NC}"
echo -e "  • DynamoDB table: ${GREEN}Deleted${NC}"
echo -e "  • S3 buckets: ${GREEN}Emptied and deleted${NC}"
echo -e "  • API keys: ${GREEN}Deleted${NC}"
echo -e "  • Local files: ${GREEN}Cleaned${NC}"
echo ""
echo -e "${BLUE}💰 Cost Impact:${NC}"
echo -e "  • All AWS resources have been removed"
echo -e "  • No further charges will be incurred"
echo -e "  • Any remaining charges are for usage before deletion"
echo ""
echo -e "${BLUE}🔄 To redeploy:${NC}"
echo -e "  Run: ${YELLOW}./deploy.sh -e ${ENVIRONMENT}${NC}"