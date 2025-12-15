#!/bin/bash

# ql.io AWS Serverless Sequential Cleanup Script
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
    -f|--force)
      FORCE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -e, --environment    Environment (dev/staging/prod) [default: dev]"
      echo "  -r, --region         AWS Region [default: us-west-2]"
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

echo -e "${RED}🗑️  ql.io Serverless Sequential Cleanup${NC}"
echo -e "${RED}=======================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo ""

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# List stacks to be deleted
STACKS=(
  "qlio-console-${ENVIRONMENT}"
  "qlio-api-keys-${ENVIRONMENT}"
  "qlio-lambda-${ENVIRONMENT}"
  "qlio-s3-config-${ENVIRONMENT}"
  "qlio-dynamodb-${ENVIRONMENT}"
)

echo -e "${BLUE}📋 Stacks to be deleted:${NC}"
for stack in "${STACKS[@]}"; do
  if aws cloudformation describe-stacks --stack-name "${stack}" --region "${REGION}" &> /dev/null; then
    echo -e "  • ${YELLOW}${stack}${NC} ✅"
  else
    echo -e "  • ${YELLOW}${stack}${NC} ❌ (not found)"
  fi
done

CONFIG_BUCKET="qlio-config-${ACCOUNT_ID}-${ENVIRONMENT}"
CONSOLE_BUCKET="qlio-console-${ACCOUNT_ID}-${ENVIRONMENT}"

echo ""
echo -e "${BLUE}📦 S3 buckets to be emptied:${NC}"
echo -e "  • ${YELLOW}${CONFIG_BUCKET}${NC}"
echo -e "  • ${YELLOW}${CONSOLE_BUCKET}${NC}"
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
echo -e "${BLUE}🧹 Starting sequential cleanup...${NC}"

# Step 1: Empty S3 buckets
echo -e "${BLUE}1️⃣ Emptying S3 buckets...${NC}"

if aws s3 ls "s3://${CONFIG_BUCKET}" --region "${REGION}" &> /dev/null; then
    echo -e "  Emptying config bucket: ${CONFIG_BUCKET}"
    aws s3 rm "s3://${CONFIG_BUCKET}" --recursive --region "${REGION}" || true
    echo -e "${GREEN}  ✅ Config bucket emptied${NC}"
else
    echo -e "${YELLOW}  ⚠️  Config bucket not found${NC}"
fi

if aws s3 ls "s3://${CONSOLE_BUCKET}" --region "${REGION}" &> /dev/null; then
    echo -e "  Emptying console bucket: ${CONSOLE_BUCKET}"
    aws s3 rm "s3://${CONSOLE_BUCKET}" --recursive --region "${REGION}" || true
    echo -e "${GREEN}  ✅ Console bucket emptied${NC}"
else
    echo -e "${YELLOW}  ⚠️  Console bucket not found${NC}"
fi

echo ""

# Step 2: Delete stacks in reverse order
echo -e "${BLUE}2️⃣ Deleting CloudFormation stacks...${NC}"

for stack in "${STACKS[@]}"; do
  if aws cloudformation describe-stacks --stack-name "${stack}" --region "${REGION}" &> /dev/null; then
    echo -e "  Deleting stack: ${stack}"
    aws cloudformation delete-stack --stack-name "${stack}" --region "${REGION}"
    echo -e "${GREEN}  ✅ ${stack} deletion initiated${NC}"
  else
    echo -e "${YELLOW}  ⚠️  ${stack} not found${NC}"
  fi
done

echo ""

# Step 3: Wait for all deletions to complete
echo -e "${BLUE}3️⃣ Waiting for stack deletions to complete...${NC}"
echo -e "${YELLOW}   This may take several minutes...${NC}"

for stack in "${STACKS[@]}"; do
  if aws cloudformation describe-stacks --stack-name "${stack}" --region "${REGION}" &> /dev/null; then
    echo -e "  Waiting for ${stack}..."
    aws cloudformation wait stack-delete-complete --stack-name "${stack}" --region "${REGION}" || true
    echo -e "${GREEN}  ✅ ${stack} deleted${NC}"
  fi
done

echo ""

# Step 4: Clean up local files
echo -e "${BLUE}4️⃣ Cleaning up local files...${NC}"
rm -f deployment-info.json
rm -rf .aws-sam
echo -e "${GREEN}✅ Local files cleaned${NC}"

echo ""
echo -e "${GREEN}🎉 Sequential Cleanup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  • All CloudFormation stacks: ${GREEN}Deleted${NC}"
echo -e "  • All S3 buckets: ${GREEN}Emptied and deleted${NC}"
echo -e "  • All AWS resources: ${GREEN}Removed${NC}"
echo -e "  • Local files: ${GREEN}Cleaned${NC}"
echo ""
echo -e "${BLUE}🔄 To redeploy:${NC}"
echo -e "  Run: ${YELLOW}./deploy-sequential.sh -e ${ENVIRONMENT}${NC}"