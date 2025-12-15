# ql.io AWS Serverless Deployment Spec

## Overview

Transform ql.io from a server application to AWS serverless with one-click deployment, enabling automatic scaling, pay-per-use pricing, and zero operational overhead.

## Current State Analysis

### Existing Server Architecture
- Express.js server running on fixed infrastructure
- Manual scaling and server management required
- Fixed costs regardless of usage
- Operational overhead for maintenance and updates

### Limitations
- Server provisioning and management complexity
- Fixed resource allocation and costs
- Manual scaling processes
- Single point of failure risks

## Requirements

### Requirement 1: One-Click Serverless Deployment

**User Story:** As a developer, I want to deploy ql.io to AWS serverless with one click, so I can get a production-ready system without infrastructure management.

#### Acceptance Criteria

1. WHEN I provide AWS credentials and account ID THEN the system SHALL deploy automatically via GitHub Actions
2. WHEN deployment completes THEN the system SHALL provide working API and console URLs
3. WHEN I select an environment (dev/staging/prod) THEN the system SHALL deploy to that environment with appropriate configuration
4. WHEN deployment fails THEN the system SHALL provide clear error messages and cleanup failed resources
5. WHEN I want to test locally THEN the system SHALL support local development with SAM CLI

### Requirement 2: Serverless Query Execution

**User Story:** As an API consumer, I want to execute ql.io queries through serverless functions, so I can benefit from automatic scaling and pay-per-use pricing.

#### Acceptance Criteria

1. WHEN I submit a query via HTTP POST THEN the system SHALL execute it in AWS Lambda and return results
2. WHEN query load increases THEN the system SHALL automatically scale Lambda functions to handle demand
3. WHEN queries are cacheable THEN the system SHALL store results in DynamoDB for faster subsequent access
4. WHEN I request table definitions THEN the system SHALL return them from S3-based configuration
5. WHEN no queries are being processed THEN the system SHALL incur zero compute costs

### Requirement 3: Web Console Management

**User Story:** As an administrator, I want a web console to manage ql.io tables and test queries, so I can configure and monitor the system through a user-friendly interface.

#### Acceptance Criteria

1. WHEN I access the console URL THEN the system SHALL serve the UI from CloudFront CDN
2. WHEN I authenticate with API key THEN the system SHALL allow access to admin functions
3. WHEN I create or modify table definitions THEN the system SHALL store them in S3 and update the runtime
4. WHEN I test queries in the console THEN the system SHALL execute them and display results
5. WHEN I view system metrics THEN the system SHALL show query performance and usage statistics

## Success Criteria

### Deployment Success
- GitHub Actions workflow completes without errors
- All AWS resources created successfully (Lambda, API Gateway, S3, DynamoDB, CloudFront)
- API endpoints respond correctly with API key authentication
- Console UI loads and functions properly
- Local testing works with SAM CLI

### Performance Success
- Query response time < 2 seconds for uncached queries
- Cached query response time < 500ms
- Console UI loads in < 3 seconds globally via CloudFront
- System handles 100+ concurrent requests automatically

### Cost Success
- Monthly AWS costs < $50 for typical usage (vs $50+ for traditional servers)
- Zero costs during idle periods
- Costs scale proportionally with actual usage
- Clear cost breakdown and monitoring

## External References

#[[file:modules/engine/lib/engine.js]]
#[[file:bin/minimal-server.js]]
#[[file:package.json]]

This specification provides the foundation for transforming ql.io into a modern, serverless application that leverages AWS managed services for automatic scaling, cost efficiency, and operational simplicity.