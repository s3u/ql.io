# AWS Serverless Security Plan

## 🔒 Security Issues and Solutions

### Current Security Concerns

1. **API Keys Exposed in Deployment Output**
   - Deployment scripts print API keys to console
   - API keys stored in deployment summary files
   - Risk: Credentials visible in CI/CD logs and local files

2. **Client-Side Credential Storage**
   - Console UI stores API keys in browser localStorage
   - Risk: Credentials accessible via browser developer tools

3. **No Secure CI/CD Pipeline**
   - Missing GitHub Actions for AWS deployment
   - No secure credential management for automated deployments

4. **Configuration Management**
   - No centralized secret management
   - Environment-specific configurations not properly secured

## 🛡️ Security Improvements

### 1. Remove API Keys from Source Control and Logs

#### 1.1 Update Deployment Scripts
- Remove API key output from deployment scripts
- Store deployment info without sensitive data
- Use AWS CLI profiles for credential management

#### 1.2 Secure Console Configuration
- Remove API key storage from localStorage
- Implement secure credential input (session-only)
- Add warning about credential security

#### 1.3 Environment Variable Management
- Use AWS Systems Manager Parameter Store for secrets
- Implement environment-specific parameter management
- Remove hardcoded configurations

### 2. Implement Secure GitHub Actions CI/CD

#### 2.1 GitHub Secrets Configuration
Required GitHub repository secrets:
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment
- `AWS_REGION`: Target AWS region (default: us-west-2)

#### 2.2 Deployment Workflow
- Secure AWS credential handling
- Environment-specific deployments
- No credential exposure in logs
- Automated testing and validation

#### 2.3 Security Best Practices
- Least privilege IAM policies
- Temporary credentials where possible
- Audit logging for all deployments

### 3. Enhanced API Security

#### 3.1 API Gateway Security
- Rate limiting per API key
- Request validation and sanitization
- CORS configuration for specific origins
- CloudWatch monitoring and alerting

#### 3.2 Lambda Security
- VPC configuration for sensitive operations
- Environment variable encryption
- IAM roles with minimal permissions
- CloudTrail logging for API calls

### 4. Credential Management Strategy

#### 4.1 Development Environment
- Use AWS CLI profiles
- Local environment variables
- No credentials in source control

#### 4.2 Production Environment
- AWS Systems Manager Parameter Store
- IAM roles for service-to-service communication
- Encrypted environment variables
- Regular credential rotation

## 🚀 Implementation Plan

### Phase 1: Remove Existing Security Issues (Week 1)

1. **Update Deployment Scripts**
   - Remove API key output from all scripts
   - Update documentation to use AWS CLI for key retrieval
   - Add security warnings and best practices

2. **Secure Console UI**
   - Remove localStorage API key storage
   - Add session-only credential management
   - Implement secure configuration warnings

3. **Clean Up Documentation**
   - Remove hardcoded API keys from examples
   - Add security best practices section
   - Update troubleshooting guides

### Phase 2: Implement Secure CI/CD (Week 2)

1. **GitHub Actions Workflow**
   - Create secure deployment workflow
   - Implement environment-specific deployments
   - Add automated testing and validation

2. **AWS Parameter Store Integration**
   - Migrate configuration to Parameter Store
   - Implement secure parameter retrieval
   - Add environment-specific parameter management

3. **Enhanced Monitoring**
   - CloudWatch dashboards for security metrics
   - CloudTrail logging for API access
   - Automated alerting for security events

### Phase 3: Production Hardening (Week 3)

1. **VPC and Network Security**
   - Configure Lambda VPC settings
   - Implement security groups and NACLs
   - Add WAF protection for API Gateway

2. **Compliance and Auditing**
   - Implement comprehensive audit logging
   - Add compliance reporting
   - Regular security assessments

## 📋 Security Checklist

### Before Deployment
- [ ] No hardcoded credentials in source code
- [ ] GitHub secrets properly configured
- [ ] IAM policies follow least privilege principle
- [ ] All sensitive data encrypted at rest and in transit

### After Deployment
- [ ] API keys not visible in deployment logs
- [ ] Console UI doesn't store credentials persistently
- [ ] CloudWatch monitoring active
- [ ] Security alerts configured

### Ongoing Security
- [ ] Regular credential rotation
- [ ] Security audit reviews
- [ ] Dependency vulnerability scanning
- [ ] Access pattern monitoring

## 🔧 Implementation Commands

### Setup GitHub Secrets
```bash
# Use GitHub CLI to set secrets (run locally, not in CI)
gh secret set AWS_ACCESS_KEY_ID --body "your-access-key"
gh secret set AWS_SECRET_ACCESS_KEY --body "your-secret-key"
gh secret set AWS_REGION --body "us-west-2"
```

### Retrieve API Key Securely (Post-Deployment)
```bash
# Get API key ID from CloudFormation
API_KEY_ID=$(aws cloudformation describe-stacks \
  --stack-name qlio-serverless-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiKeyId`].OutputValue' \
  --output text)

# Get API key value (store securely, don't log)
aws apigateway get-api-key \
  --api-key $API_KEY_ID \
  --include-value \
  --query 'value' \
  --output text
```

### Parameter Store Configuration
```bash
# Store configuration in Parameter Store
aws ssm put-parameter \
  --name "/qlio/dev/config" \
  --value '{"tables": {...}}' \
  --type "SecureString"
```

This security plan ensures that no sensitive credentials are exposed in source control, logs, or client-side storage while maintaining the functionality and usability of the ql.io serverless deployment.